import type {
	Relationship as Neo4jRelationship,
	QueryResult,
} from "neo4j-driver";
import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";
import { Relationship } from "../Relationship.js";
import {
	RelationshipDirectionEnum,
	type RelationshipType,
} from "../RelationshipType.js";
import type { EntityPropertyMap } from "../types.js";
import { GenerateDefaultValues } from "./GenerateDefaultValues.js";
import { Validator } from "./Validator.js";

export async function RelateTo<
	R extends Record<string, unknown>,
	S extends Record<string, unknown>,
	E extends Record<string, unknown>,
>(
	neode: Neode,
	from: Node<S>,
	to: Node<E>,
	relationship: RelationshipType<R>,
	properties: Partial<R> = {},
	forceCreate = false,
): Promise<Relationship<R, S | E, S | E>> {
	const propertiesWithDefaults = GenerateDefaultValues<R>(
		neode,
		relationship,
		properties,
	);
	const validatedProperties = await Validator<R>(
		neode,
		relationship,
		propertiesWithDefaults,
	);

	const directionId =
		relationship.direction === RelationshipDirectionEnum.IN ? "<" : "";
	const directionOut =
		relationship.direction === RelationshipDirectionEnum.OUT ? ">" : "";
	const type = relationship.relationship;

	const params: Record<string, unknown> = {
		from_id: from.identity,
		to_id: to.identity,
	};
	let set = "";

	if (Object.keys(validatedProperties).length) {
		set += "SET ";
		set += Object.keys(validatedProperties)
			.map((key) => {
				params[`set_${key}`] = validatedProperties[key];

				return `rel.${key} = $set_${key}`;
			})
			.join(", ");
	}

	const mode = forceCreate ? "CREATE" : "MERGE";

	const query = `
                MATCH (from), (to)
                WHERE id(from) = $from_id
                AND id(to) = $to_id
                ${mode} (from)${directionId}-[rel:${type}]-${directionOut}(to)
                ${set}
                RETURN rel
            `;

	const result = await neode.writeCypher<{
		rel: Neo4jRelationship;
	}>(query, params);

	const relation = result.records[0].get("rel");
	const hydrateFrom = (
		relationship.direction === RelationshipDirectionEnum.IN ? to : from
	) as Node<S | E>;
	const hydrateTo = (
		relationship.direction === RelationshipDirectionEnum.OUT ? from : to
	) as Node<S | E>;

	const relationProperties = new Map(
		Object.entries(relation.properties),
	) as EntityPropertyMap<R>;

	return new Relationship<R, S | E, S | E>(
		neode,
		relationship,
		relation.identity,
		relation.type,
		relationProperties,
		hydrateFrom,
		hydrateTo,
	);
}
