import { valueToCypher } from "../Entity.js";
import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { Builder } from "../Query/Builder.js";
import GenerateDefaultValues from "./GenerateDefaultValues.js";

export const MAX_CREATE_DEPTH = 99;
export const ORIGINAL_ALIAS = "this";

/**
 * Split properties into
 *
 * @param  {String}  mode        'create' or 'merge'
 * @param  {Model}   model        Model to merge on
 * @param  {Object}  properties   Map of properties
 * @param  {Array}   merge_on     Array of properties explicitly stated to merge on
 * @return {Object}               { inline, set, on_create, on_match }
 */
function splitProperties<P extends Record<string, unknown>>(
	mode: "create" | "merge",
	model: Model<P>,
	properties: P,
	merge_on: (keyof P)[] = [],
) {
	const inline: Record<string, unknown> = {};
	const set: Record<string, unknown> = {};
	const on_create: Record<string, unknown> = {};
	const on_match: Record<string, unknown> = {};

	// Calculate Set Properties
	for (const property of model.properties()) {
		const name = property.name();

		// Skip if not set
		if (!Object.hasOwn(properties, name)) {
			return;
		}

		const value = valueToCypher(property, properties[name]);

		// If mode is create, go ahead and set everything
		if (mode === "create") {
			inline[name] = value;
		} else if (merge_on.indexOf(name) > -1) {
			inline[name] = value;
			// Only set protected properties on creation
		} else if (property.protected() || property.primary()) {
			on_create[name] = value;
			// Read-only property?
		} else if (!property.readonly()) {
			set[name] = value;
		}
	}

	return {
		inline,
		on_create,
		on_match,
		set,
	};
}

/**
 * Add a node to the current statement
 *
 * @param neode Neode instance
 * @param builder Query builder
 * @param alias Alias
 * @param model Model
 * @param properties Map of properties
 * @param aliases Aliases to carry through in with statement
 * @param mode 'create' or 'merge'
 * @param merge_on Which properties should we merge on?
 */
export function addNodeToStatement(
	neode: Neode,
	builder: Builder,
	alias: string,
	model: Model<unknown>,
	properties: Record<string, unknown>,
	aliases: string[] = [],
	mode: "create" | "merge" = "create",
	merge_on: string[] = [],
) {
	// Split Properties
	const { inline, on_create, on_match, set } = splitProperties(
		mode,
		model,
		properties,
		merge_on,
	);

	// Add alias
	if (aliases.indexOf(alias) === -1) {
		aliases.push(alias);
	}

	// Create
	builder[mode](alias, model, inline);

	// On create set
	for (const [key, value] of Object.entries(on_create)) {
		builder.onCreateSet(`${alias}.${key}`, value);
	}

	// On Match Set
	for (const [key, value] of Object.entries(on_match)) {
		builder.onCreateSet(`${alias}.${key}`, value);
	}

	// Set
	for (const [key, value] of Object.entries(set)) {
		builder.set(`${alias}.${key}`, value);
	}

	// Relationships
	for (const [relationship, key] of model.relationships() {
	}

	model.relationships().forEach((relationship, key) => {
		if (properties.hasOwnProperty(key)) {
			let value = properties[key];

			const rel_alias = `${alias}_${key}_rel`;
			const target_alias = `${alias}_${key}_node`;

			// Carry alias through
			builder.with(...aliases);

			if (!relationship.target()) {
				throw new Error(
					`A target defintion must be defined for ${key} on model ${model.name()}`,
				);
			} else if (Array.isArray(relationship.target())) {
				throw new Error(
					`You cannot create a node with the ambiguous relationship: ${key} on model ${model.name()}`,
				);
			}

			switch (relationship.type()) {
				// Single Relationship
				case "relationship":
					addRelationshipToStatement(
						neode,
						builder,
						alias,
						rel_alias,
						target_alias,
						relationship,
						value,
						aliases,
						mode,
					);
					break;

				// Array of Relationships
				case "relationships":
					if (!Array.isArray(value)) value = [value];

					value.forEach((value, idx) => {
						// Carry alias through
						addRelationshipToStatement(
							neode,
							builder,
							alias,
							rel_alias + idx,
							target_alias + idx,
							relationship,
							value,
							aliases,
							mode,
						);
					});
					break;

				// Single Node
				case "node":
					addNodeRelationshipToStatement(
						neode,
						builder,
						alias,
						rel_alias,
						target_alias,
						relationship,
						value,
						aliases,
						mode,
					);
					break;

				// Array of Nodes
				case "nodes":
					if (!Array.isArray(value)) value = [value];

					value.forEach((value, idx) => {
						addNodeRelationshipToStatement(
							neode,
							builder,
							alias,
							rel_alias + idx,
							target_alias + idx,
							relationship,
							value,
							aliases,
							mode,
						);
					});
					break;
			}
		}
	});

	return builder;
}

/**
 * Add a relationship to the current statement
 *
 * @param {Neode}           neode           Neode instance
 * @param {Builder}         builder         Query builder
 * @param {String}          alias           Current node alias
 * @param {String}          rel_alias       Generated alias for the relationship
 * @param {String}          target_alias    Generated alias for the relationship
 * @param {Relationship}    relationship    Model
 * @param {Object}          value           Value map
 * @param {Array}           aliases         Aliases to carry through in with statement
 * @param {String}          mode        'create' or 'merge'
 */
export function addRelationshipToStatement(
	neode,
	builder,
	alias,
	rel_alias,
	target_alias,
	relationship,
	value,
	aliases,
	mode,
) {
	if (aliases.length > MAX_CREATE_DEPTH) {
		return;
	}

	// Extract Node
	const node_alias = relationship.nodeAlias();
	let node_value = value[node_alias];

	delete value[node_alias];

	// Create Node

	// If Node is passed, attempt to create a relationship to that specific node
	if (node_value instanceof Node) {
		builder
			.match(target_alias)
			.whereId(target_alias, node_value.identity());
	}

	// If Primary key is passed then try to match on that
	else if (typeof node_value == "string" || typeof node_value == "number") {
		const model = neode.model(relationship.target());

		builder.merge(target_alias, model, {
			[model.primaryKey()]: node_value,
		});
	}

	// If Map is passed, attempt to create that node and then relate
	else if (Object.keys(node_value).length) {
		const model = neode.model(relationship.target());

		if (!model) {
			throw new Error(
				`Couldn't find a target model for ${relationship.target()} in ${relationship.name()}.  Did you use module.exports?`,
			);
		}

		node_value = GenerateDefaultValues.async(neode, model, node_value);

		addNodeToStatement(
			neode,
			builder,
			target_alias,
			model,
			node_value,
			aliases,
			mode,
			model.mergeFields(),
		);
	}

	// Create the Relationship
	builder[mode](alias)
		.relationship(
			relationship.relationship(),
			relationship.direction(),
			rel_alias,
		)
		.to(target_alias);

	// Set Relationship Properties
	relationship.properties().forEach((property) => {
		const name = property.name();

		if (value.hasOwnProperty(name)) {
			builder.set(`${rel_alias}.${name}`, value[name]);
		}
	});
}

/**
 * Add a node relationship to the current statement
 *
 * @param {Neode}           neode           Neode instance
 * @param {Builder}         builder         Query builder
 * @param {String}          alias           Current node alias
 * @param {String}          rel_alias       Generated alias for the relationship
 * @param {String}          target_alias    Generated alias for the relationship
 * @param {Relationship}    relationship    Model
 * @param {Object}          value           Value map
 * @param {Array}           aliases         Aliases to carry through in with statement
 * @param {String}  mode        'create' or 'merge'
 */
export function addNodeRelationshipToStatement(
	neode,
	builder,
	alias,
	rel_alias,
	target_alias,
	relationship,
	value,
	aliases,
	mode,
) {
	if (aliases.length > MAX_CREATE_DEPTH) {
		return;
	}

	// If Node is passed, attempt to create a relationship to that specific node
	if (value instanceof Node) {
		builder.match(target_alias).whereId(target_alias, value.identity());
	}
	// If Primary key is passed then try to match on that
	else if (typeof value == "string" || typeof value == "number") {
		const model = neode.model(relationship.target());

		builder.merge(target_alias, model, {
			[model.primaryKey()]: value,
		});
	}
	// If Map is passed, attempt to create that node and then relate
	// TODO: What happens when we need to validate this?
	// TODO: Is mergeFields() the right option here?
	else if (Object.keys(value).length) {
		const model = neode.model(relationship.target());

		if (!model) {
			throw new Error(
				`Couldn't find a target model for ${relationship.target()} in ${relationship.name()}.  Did you use module.exports?`,
			);
		}

		value = GenerateDefaultValues.async(neode, model, value);

		addNodeToStatement(
			neode,
			builder,
			target_alias,
			model,
			value,
			aliases,
			mode,
			model.mergeFields(),
		);
	}

	// Create the Relationship
	builder[mode](alias)
		.relationship(
			relationship.relationship(),
			relationship.direction(),
			rel_alias,
		)
		.to(target_alias);
}
