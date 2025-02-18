import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";
import { Builder, QueryMode } from "../query/Builder.js";
import { eagerNode } from "../query/EagerUtils.js";

export async function FindById<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T>,
	id: string,
): Promise<Node<T> | undefined> {
	const alias = "this";

	const builder = new Builder(neode);

	const result = await builder
		.match(alias, model)
		.whereId(alias, id)
		.return(eagerNode(neode, 1, alias, model))
		.limit(1)
		.execute(QueryMode.READ);

	return neode.hydrateFirst(result, alias, model);
}
