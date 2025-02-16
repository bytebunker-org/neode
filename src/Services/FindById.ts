import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";
import { Builder, QueryMode } from "../Query/Builder.js";
import { eagerNode } from "../Query/EagerUtils.js";
import type { Integerable } from "../types.js";

export async function FindById<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T>,
	id: Integerable,
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
