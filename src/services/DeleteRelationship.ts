import type { QueryResult } from "neo4j-driver";
import type { Neode } from "../Neode.js";

export function DeleteRelationship(
	neode: Neode,
	identity: string,
): Promise<QueryResult> {
	const query = `
        MATCH ()-[rel]->() 
        WHERE elementId(rel) = $identity
        DELETE rel
    `;

	return neode.writeCypher(query, { identity });
}
