import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { RelationshipType } from "../RelationshipType.js";
import { Builder } from "./Builder.js";

export const EAGER_ID = "__EAGER_ID__";
export const EAGER_LABELS = "__EAGER_LABELS__";
export const EAGER_TYPE = "__EAGER_TYPE__";
export const MAX_EAGER_DEPTH = 3;

/**
 * Build a pattern to use in an eager load statement
 *
 * @param neode Neode instance
 * @param depth Maximum depth to stop at
 * @param alias Alias for the starting node
 * @param rel Type of relationship
 */
export function eagerPattern<
	T extends Record<string, unknown>,
	E extends Record<string, unknown>,
>(
	neode: Neode,
	depth: number,
	alias: string,
	rel: RelationshipType<T, E>,
): string {
	const builder = new Builder(neode);

	const name = rel.name;
	const type = rel.type;
	const relationship = rel.relationship;
	const direction = rel.direction;
	const target = rel.target;
	const relationshipVariable = `${alias}_${name}_rel`;
	const nodeVariable = `${alias}_${name}_node`;

	let targetModel: Model<E> | undefined = undefined;
	try {
		targetModel = typeof target === "string" ? neode.model(target) : target;
	} catch (error) {}

	// Build Pattern
	builder
		.match(alias)
		.relationship(relationship, direction, relationshipVariable)
		.to(nodeVariable, targetModel);

	let fields = nodeVariable;

	switch (type) {
		case "node":
		case "nodes":
			fields = eagerNode(neode, depth + 1, nodeVariable, targetModel);
			break;

		case "relationship":
		case "relationships":
			fields = eagerRelationship(
				neode,
				depth + 1,
				relationshipVariable,
				rel.nodeAlias,
				nodeVariable,
				targetModel,
			);
	}

	const pattern = `${name}: [ ${builder.pattern().trim()} | ${fields} ]`;

	// Get the first?
	if (type === "node" || type === "relationship") {
		return `${pattern}[0]`;
	}

	return pattern;
}

/**
 * Produces a Cypher pattern for a consistent eager loading format for a
 * Node and any subsequent eagerly loaded models up to the maximum depth.
 *
 * @param neode Neode instance
 * @param depth Maximum depth to traverse to
 * @param alias Alias of the node
 * @param model Node model
 */
export function eagerNode<T extends Record<string, unknown>>(
	neode: Neode,
	depth: number,
	alias: string,
	model?: Model<T>,
): string {
	const indent = "  ".repeat(depth * 2);
	let pattern = `\n${indent} ${alias} { `;

	// Properties
	pattern += `\n${indent}${indent}.*`;

	// ID
	pattern += `\n${indent}${indent},${EAGER_ID}: elementId(${alias})`;

	// Labels
	pattern += `\n${indent}${indent},${EAGER_LABELS}: labels(${alias})`;

	// Eager
	if (model && depth <= MAX_EAGER_DEPTH) {
		for (const rel of model.eager) {
			pattern += `\n${indent}${indent},${eagerPattern(neode, depth, alias, rel)}`;
		}
	}

	pattern += `\n${indent}}`;

	return pattern;
}

/**
 * Produces a Cypher pattern for a consistent eager loading format for a
 * Relationship and any subsequent eagerly loaded modules up to the maximum depth.
 *
 * @param neode Neode instance
 * @param depth Maximum depth to traverse to
 * @param alias Alias of the node
 * @param nodeAlias
 * @param nodeVariable
 * @param nodeModel Node model
 */
export function eagerRelationship<T extends Record<string, unknown>>(
	neode: Neode,
	depth: number,
	alias: string,
	nodeAlias: string,
	nodeVariable: string,
	nodeModel?: Model<T>,
): string {
	const indent = "  ".repeat(depth * 2);
	let pattern = `\n${indent} ${alias} { `;

	// Properties
	pattern += `\n${indent}${indent}.*`;

	// ID
	pattern += `\n${indent}${indent},${EAGER_ID}: elementId(${alias})`;

	// Type
	pattern += `\n${indent}${indent},${EAGER_TYPE}: type(${alias})`;

	// Node Alias
	// pattern += `\n,${indent}${indent},${nodeAlias}`
	pattern += `\n${indent}${indent},${nodeAlias}: `;
	pattern += eagerNode(neode, depth + 1, nodeVariable, nodeModel);

	pattern += `\n${indent}}`;

	return pattern;
}
