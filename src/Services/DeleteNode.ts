import type { Integer, QueryResult } from "neo4j-driver";
import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import { Builder, QueryMode } from "../Query/Builder.js";
import {
	RelationshipCascadePolicyEnum,
	type RelationshipType,
} from "../RelationshipType.js";
import type { Integerable } from "../types.js";

export const MAX_EAGER_DEPTH = 10;

/**
 * Add a recursive cascade deletion
 *
 * @param neode Neode instance
 * @param builder Query Builder
 * @param fromAlias Alias of node
 * @param relationship relationship type definition
 * @param aliases Current aliases
 * @param toDepth Maximum depth to delete to
 */
function addCascadeDeleteNode<
	T extends Record<string, unknown>,
	E extends Record<string, unknown>,
>(
	neode: Neode,
	builder: Builder,
	fromAlias: string,
	relationship: RelationshipType<T, E>,
	aliases: string[],
	toDepth: number,
) {
	if (aliases.length > toDepth) return;

	const relAlias = `${fromAlias}${relationship.name}_rel`;
	const nodeAlias = `${fromAlias}${relationship.name}_node`;
	const target =
		typeof relationship.target === "string"
			? neode.model<E>(relationship.target)
			: relationship.target;

	// Optional Match
	builder
		.optionalMatch(fromAlias)
		.relationship(
			relationship.relationship,
			relationship.direction,
			relAlias,
		)
		.to(nodeAlias, relationship.target);

	// Check for cascade deletions
	if (target?.relationships?.size) {
		const targetRelationshipIterator =
			target.relationships.values() as MapIterator<
				RelationshipType<
					Record<string, unknown>,
					Record<string, unknown>
				>
			>;
		for (const relationship of targetRelationshipIterator) {
			if (relationship.cascade === RelationshipCascadePolicyEnum.DELETE) {
				addCascadeDeleteNode(
					neode,
					builder,
					nodeAlias,
					relationship,
					aliases.concat(nodeAlias),
					toDepth,
				);
			} else if (
				relationship.cascade === RelationshipCascadePolicyEnum.DETACH
			) {
				// addDetachNode(neode, builder, node_alias, relationship, aliases);
			}

			// TODO: What if cascade === true?
		}
	}

	// Delete it
	builder.detachDelete(nodeAlias);
}

/**
 * Delete the relationship to the other node
 *
 * @param {Neode}            neode          Neode instance
 * @param {Builder}          builder        Query Builder
 * @param {String}           from_alias     Alias of node at start of the match
 * @param {RelationshipType} relationship   model definition
 * @param {Array}            aliases        Current aliases
 * /
function addDetachNode(neode, builder, from_alias, relationship, aliases) {
    // builder.withDistinct(aliases);

    const rel_alias = from_alias + relationship.name() + '_rel';

    builder.optionalMatch(from_alias)
        .relationship(relationship.relationship(), relationship.direction(), rel_alias)
        .toAnything()
        .delete(rel_alias);

    // builder.withDistinct( aliases );
}
 */

/**
 * Cascade Delete a Node
 *
 * @param neode Neode instance
 * @param identity Neo4j internal ID of node to delete
 * @param model Model definition
 * @param toDepth Maximum deletion depth
 */
export async function DeleteNode<T extends Record<string, unknown>>(
	neode: Neode,
	identity: Integerable,
	model: Model<T>,
	toDepth = MAX_EAGER_DEPTH,
): Promise<QueryResult> {
	const alias = "this";
	// const to_delete = [];
	const aliases = [alias];
	// const depth = 1;

	const builder = new Builder(neode)
		.match(alias, model)
		.whereId(alias, identity);

	// Cascade delete to relationships
	const relationshipsIterator = model.relationships.values() as MapIterator<
		RelationshipType<Record<string, unknown>, Record<string, unknown>>
	>;
	for (const relationship of relationshipsIterator) {
		if (relationship.cascade === RelationshipCascadePolicyEnum.DELETE) {
			addCascadeDeleteNode(
				neode,
				builder,
				alias,
				relationship,
				aliases,
				toDepth,
			);
		} else if (
			relationship.cascade === RelationshipCascadePolicyEnum.DETACH
		) {
			// addDetachNode(neode, builder, alias, relationship, aliases);
		}
	}

	// Detach Delete target node
	builder.detachDelete(alias);

	return builder.execute(QueryMode.WRITE);
}
