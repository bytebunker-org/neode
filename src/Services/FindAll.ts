import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";
import { Builder } from "../Query/Builder.js";
import { eagerNode } from "../Query/EagerUtils.js";

export function FindAll<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T>,
	properties: Partial<T>,
	order: string | Record<string, unknown>,
	limit,
	skip,
): Promise<Node<T>[]> {
	const alias = "this";

	const builder = new Builder(neode);

	// Match
	builder.match(alias, model);

	// Where
	for (const [key, value] of Object.entries(properties)) {
		builder.where(`${alias}.${key}`, value);
	}

	// Order
	if (typeof order == "string") {
		builder.orderBy(`${alias}.${order}`);
	} else if (typeof order == "object") {
		Object.keys(order).forEach((key) => {
			builder.orderBy(`${alias}.${key}`, order[key]);
		});
	}

	// Output
	const output = eagerNode(neode, 1, alias, model);

	return builder
		.return(output)
		.limit(limit)
		.skip(skip)
		.execute(mode.READ)
		.then((res) => neode.hydrate(res, alias));
}
