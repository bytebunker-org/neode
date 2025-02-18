import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { NodeCollection } from "../NodeCollection.js";
import { Builder, QueryMode } from "../query/Builder.js";
import { eagerNode } from "../query/EagerUtils.js";
import { OrderDirectionEnum } from "../query/Order.js";
import type { PointObject } from "../types.js";
import { hasOwn } from "../util/util.js";

export async function FindWithinDistance<
	T extends Record<string, unknown> = Record<string, unknown>,
>(
	neode: Neode,
	model: Model<T>,
	locationProperty: string,
	point: PointObject,
	distance: number,
	properties: Partial<T> = {},
	order?: string | Record<string, OrderDirectionEnum>,
	limit?: number,
	skip?: number,
): Promise<NodeCollection<T>> {
	const alias = "this";

	const builder = new Builder(neode);

	// Match
	builder.match<T>(alias, model);

	// Where
	for (const [key, value] of Object.entries(properties)) {
		builder.where(`${alias}.${key}`, value);
	}

	const prefixedProperties: Record<string, unknown> = {};

	// Prefix key on Properties
	if (properties) {
		for (const [key, value] of Object.entries(properties)) {
			prefixedProperties[`${alias}.${key}`] = value;
		}
	}

	// Distance from Point
	// TODO: When properties are passed match them as well .where(properties);
	let pointString: string | undefined;

	if (hasOwn(point, "latitude") && hasOwn(point, "longitude")) {
		pointString = `latitude:${point.latitude}, longitude:${point.longitude}`;

		if (hasOwn(point, "height")) {
			pointString += `, height:${point.height}`;
		}
	} else if (hasOwn(point, "x") && hasOwn(point, "y")) {
		pointString = `x:${point.x}, y:${point.y}`;

		if (hasOwn(point, "z")) {
			pointString += `, z:${point.z}`;
		}
	}

	builder.whereRaw(
		`distance (${alias}.${locationProperty}, point({${pointString}})) <= ${distance}`,
	);

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
