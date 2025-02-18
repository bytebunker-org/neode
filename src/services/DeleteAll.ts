// TODO : Delete Dependencies

import type { QueryResult } from "neo4j-driver";
import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";

export function DeleteAll<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T>,
): Promise<QueryResult> {
	const query = `MATCH (node:${model.labels.join(":")}) DETACH DELETE node`;

	return neode.writeCypher(query);
}
