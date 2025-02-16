import { valueToCypher } from "../Entity.js";
import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import { Node } from "../Node.js";
import type { Builder } from "../Query/Builder.js";
import type { RelationshipType } from "../RelationshipType.js";
import { hasOwn } from "../util/util.js";
import { GenerateDefaultValues } from "./GenerateDefaultValues.js";

export const MAX_CREATE_DEPTH = 99;
export const ORIGINAL_ALIAS = "this";

/**
 * Split properties into
 *
 * @param mode 'create' or 'merge'
 * @param model        Model to merge on
 * @param properties   Map of properties
 * @param mergeOn     Array of properties explicitly stated to merge on
 */
function splitProperties<T extends Record<string, unknown>>(
	mode: "create" | "merge",
	model: Model<T>,
	properties: T,
	mergeOn: (keyof T)[] = [],
): { inline: T; onCreate: T; onMatch: T; set: T } {
	const inline = {} as T;
	const set = {} as T;
	const onCreate = {} as T;
	const onMatch = {} as T;

	// Calculate Set Properties
	for (const property of model.properties.values()) {
		const name = property.name as keyof T;

		// Skip if not set
		if (!hasOwn(properties, name)) {
			continue;
		}

		const value = valueToCypher(property, properties[name]) as T[keyof T];

		// If mode is create, go ahead and set everything
		if (mode === "create") {
			inline[name] = value;
		} else if (mergeOn.indexOf(name) > -1) {
			inline[name] = value;
			// Only set protected properties on creation
		} else if (property.protected || property.primary) {
			onCreate[name] = value;
			// Read-only property?
		} else if (!property.readonly) {
			set[name] = value;
		}
	}

	return {
		inline,
		onCreate,
		onMatch,
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
 * @param mergeOn Which properties should we merge on?
 */
export function addNodeToStatement<T extends Record<string, unknown>>(
	neode: Neode,
	builder: Builder,
	alias: string,
	model: Model<T>,
	properties: T,
	aliases: string[] = [],
	mode: "create" | "merge" = "create",
	mergeOn: (keyof T & string)[] = [],
) {
	// Split Properties
	const { inline, onCreate, onMatch, set } = splitProperties(
		mode,
		model,
		properties,
		mergeOn,
	);

	// Add alias
	if (aliases.indexOf(alias) === -1) {
		aliases.push(alias);
	}

	// Create
	builder[mode](alias, model, inline);

	// On create set
	for (const [key, value] of Object.entries(onCreate)) {
		builder.onCreateSet(`${alias}.${key}`, value);
	}

	// On Match Set
	for (const [key, value] of Object.entries(onMatch)) {
		builder.onCreateSet(`${alias}.${key}`, value);
	}

	// Set
	for (const [key, value] of Object.entries(set)) {
		builder.set(`${alias}.${key}`, value);
	}

	// Relationships
	for (const [key, relationship] of model.relationships.entries()) {
		if (hasOwn(properties, key)) {
			type RelationshipValue = Record<
				string,
				| string
				| number
				| Node<Record<string, unknown>>
				| Record<string, unknown>
			>;
			type NodeValue =
				| string
				| number
				| Node<Record<string, unknown>>
				| Record<string, unknown>;

			const value = properties[key] as
				| RelationshipValue
				| RelationshipValue[]
				| NodeValue
				| NodeValue[];

			const relAlias = `${alias}_${key}_rel`;
			const targetAlias = `${alias}_${key}_node`;

			// Carry alias through
			builder.with(...aliases);

			if (!relationship.target) {
				throw new Error(
					`A target defintion must be defined for ${key} on model ${model.name}`,
				);
			} else if (Array.isArray(relationship.target)) {
				throw new Error(
					`You cannot create a node with the ambiguous relationship: ${key} on model ${model.name}`,
				);
			}

			if (relationship.type === "relationship") {
				// Single Relationship
				addRelationshipToStatement(
					neode,
					builder,
					alias,
					relAlias,
					targetAlias,
					relationship,
					value as RelationshipValue,
					aliases,
					mode,
				);
			} else if (relationship.type === "relationships") {
				// Array of Relationships
				const valueArray = Array.isArray(value)
					? (value as RelationshipValue[])
					: [value as RelationshipValue];
				let idx = 0;

				for (const value of valueArray) {
					// Carry alias through
					addRelationshipToStatement(
						neode,
						builder,
						alias,
						relAlias + idx,
						targetAlias + idx,
						relationship,
						value,
						aliases,
						mode,
					);

					idx++;
				}
			} else if (relationship.type === "node") {
				// Single Node
				addNodeRelationshipToStatement(
					neode,
					builder,
					alias,
					relAlias,
					targetAlias,
					relationship,
					value as NodeValue,
					aliases,
					mode,
				);
			} else if (relationship.type === "nodes") {
				// Array of Nodes
				const valueArray = Array.isArray(value)
					? (value as NodeValue[])
					: [value as NodeValue];
				let idx = 0;
				for (const value of valueArray) {
					addNodeRelationshipToStatement(
						neode,
						builder,
						alias,
						relAlias + idx,
						targetAlias + idx,
						relationship,
						value,
						aliases,
						mode,
					);

					idx++;
				}
			}
		}
	}

	return builder;
}

/**
 * Add a relationship to the current statement
 *
 * @param neode Neode instance
 * @param builder Query builder
 * @param alias Current node alias
 * @param relAlias Generated alias for the relationship
 * @param targetAlias Generated alias for the relationship
 * @param relationship Model
 * @param value Value map
 * @param aliases Aliases to carry through in with statement
 * @param mode 'create' or 'merge'
 */
export function addRelationshipToStatement<
	T extends Record<string, unknown>,
	E extends Record<string, unknown> = Record<string, unknown>,
>(
	neode: Neode,
	builder: Builder,
	alias: string,
	relAlias: string,
	targetAlias: string,
	relationship: RelationshipType<T, E>,
	value: Record<string, string | number | Node<E> | E>,
	aliases: string[],
	mode: "create" | "merge",
) {
	if (aliases.length > MAX_CREATE_DEPTH) {
		return;
	}

	// Extract Node
	const nodeAlias = relationship.nodeAlias;
	const nodeValue = value[nodeAlias] as string | number | Node<E> | E;

	delete value[nodeAlias];

	// Create Node

	// If Node is passed, attempt to create a relationship to that specific node
	if (nodeValue instanceof Node) {
		builder.match(targetAlias).whereId(targetAlias, nodeValue.identity);
	} else if (typeof nodeValue === "string" || typeof nodeValue === "number") {
		// If Primary key is passed then try to match on that
		const model =
			typeof relationship.target === "string"
				? neode.model<E>(relationship.target)
				: relationship.target!;

		builder.merge<E>(targetAlias, model, {
			[model.primaryKey]: nodeValue,
		} as Partial<E>);
	} else if (
		nodeValue &&
		typeof nodeValue === "object" &&
		Object.keys(nodeValue).length
	) {
		// If Map is passed, attempt to create that node and then relate
		const model =
			typeof relationship.target === "string"
				? neode.model<E>(relationship.target)
				: relationship.target;

		if (!model) {
			throw new Error(
				`Couldn't find a target model for ${relationship.target} in ${relationship.name}.  Did you use module.exports?`,
			);
		}

		const defaultedNodeProperties = GenerateDefaultValues<E>(
			neode,
			model,
			nodeValue,
		);

		addNodeToStatement(
			neode,
			builder,
			targetAlias,
			model,
			defaultedNodeProperties,
			aliases,
			mode,
			model.mergeFields,
		);
	}

	// Create the Relationship
	if (mode === "create") {
		builder.create(alias);
	} else if (mode === "merge") {
		builder.merge(alias);
	}

	builder
		.relationship(
			relationship.relationship,
			relationship.direction,
			relAlias,
		)
		.to(targetAlias);

	// Set Relationship Properties
	for (const property of relationship.properties.values()) {
		const name = property.name;

		if (hasOwn(value, name)) {
			builder.set(`${relAlias}.${name}`, value[name]);
		}
	}
}

/**
 * Add a node relationship to the current statement
 *
 * @param neode Neode instance
 * @param builder Query builder
 * @param alias Current node alias
 * @param relAlias Generated alias for the relationship
 * @param targetAlias Generated alias for the relationship
 * @param relationship Model
 * @param value Value map or the primary key
 * @param aliases Aliases to carry through in with statement
 * @param mode 'create' or 'merge'
 */
export function addNodeRelationshipToStatement<
	T extends Record<string, unknown>,
	E extends Record<string, unknown> = Record<string, unknown>,
>(
	neode: Neode,
	builder: Builder,
	alias: string,
	relAlias: string,
	targetAlias: string,
	relationship: RelationshipType<T, E>,
	value: string | number | Node<E> | E,
	aliases: string[],
	mode: "create" | "merge",
) {
	if (aliases.length > MAX_CREATE_DEPTH) {
		return;
	}

	// If Node is passed, attempt to create a relationship to that specific node
	if (value instanceof Node) {
		builder.match(targetAlias).whereId(targetAlias, value.identity);
	} else if (typeof value === "string" || typeof value === "number") {
		// If Primary key is passed then try to match on that

		const model =
			typeof relationship.target === "string"
				? neode.model<E>(relationship.target)
				: relationship.target!;

		builder.merge<E>(targetAlias, model, {
			[model.primaryKey]: value,
		} as Partial<E>);
	} else if (
		value &&
		typeof value === "object" &&
		Object.keys(value).length
	) {
		// If Map is passed, attempt to create that node and then relate
		// TODO: What happens when we need to validate this?
		// TODO: Is mergeFields() the right option here?
		const model =
			typeof relationship.target === "string"
				? neode.model<E>(relationship.target)
				: relationship.target;

		if (!model) {
			throw new Error(
				`Couldn't find a target model for ${relationship.target} in ${relationship.name}. Did you use module.exports?`,
			);
		}

		const defaultedProperties = GenerateDefaultValues<E>(
			neode,
			model,
			value,
		);

		addNodeToStatement(
			neode,
			builder,
			targetAlias,
			model,
			defaultedProperties,
			aliases,
			mode,
			model.mergeFields,
		);
	}

	// Create the Relationship

	if (mode === "create") {
		builder.create(alias);
	} else if (mode === "merge") {
		builder.merge(alias);
	}

	builder
		.relationship(
			relationship.relationship,
			relationship.direction,
			relAlias,
		)
		.to(targetAlias);
}
