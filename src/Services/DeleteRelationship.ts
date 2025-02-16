import type { Integer, QueryResult } from "neo4j-driver";
import type { Neode } from "../Neode.js";

export function DeleteRelationship(
	neode: Neode,
	identity: Integer,
): Promise<QueryResult> {
	const query = `
        MATCH ()-[rel]->() 
        WHERE id(rel) = $identity
        DELETE rel
    `;

	return neode.writeCypher(query, { identity });
}
