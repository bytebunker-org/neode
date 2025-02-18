import type { QueryResult } from "neo4j-driver";
import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";

export function DetachFrom<
	T extends Record<string, unknown>,
	U extends Record<string, unknown>,
>(neode: Neode, from: Node<T>, to: Node<U>): Promise<QueryResult> {
	const params = {
		fromId: from.id,
		toId: to.id,
	};

	const query = `
        MATCH (from)-[rel]-(to)
        WHERE elementId(from) = $fromId
        AND elementId(to) = $toId
        DELETE rel
    `;

	return neode.writeCypher(query, params);
}
