import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";
import { Builder, QueryMode } from "../Query/Builder.js";
import { eagerNode } from "../Query/EagerUtils.js";
import { OrderDirectionEnum } from "../Query/Order.js";

export async function FindAll<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T>,
	properties: Partial<T> = {},
	order?: string | Record<string, OrderDirectionEnum>,
	limit?: number,
	skip?: number,
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
	if (typeof order === "string") {
		builder.orderBy(`${alias}.${order}`, OrderDirectionEnum.ASC);
	} else if (typeof order === "object") {
		const prefixedOrderByArgs: Record<string, OrderDirectionEnum> = {};

		for (const [key, direction] of Object.entries(order)) {
			prefixedOrderByArgs[`${alias}.${key}`] = direction;
		}

		builder.orderBy(prefixedOrderByArgs);
	}

	if (skip) {
		builder.skip(skip);
	}

	if (limit) {
		builder.limit(limit);
	}

	// Output
	const output = eagerNode(neode, 1, alias, model);

	const result = await builder.return(output).execute(QueryMode.READ);
	return neode.hydrate(result, alias);
}
