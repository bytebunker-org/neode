import type { QueryResult } from "neo4j-driver";
import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";

export function DetachFrom<
	T extends Record<string, unknown>,
	U extends Record<string, unknown>,
>(neode: Neode, from: Node<T>, to: Node<U>): Promise<QueryResult> {
	const params = {
		from_id: from.identity,
		to_id: to.identity,
	};

	const query = `
        MATCH (from)-[rel]-(to)
        WHERE id(from) = $from_id
        AND id(to) = $to_id
        DELETE rel
    `;

	return neode.writeCypher(query, params);
}
