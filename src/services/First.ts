import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";
import { Builder, QueryMode } from "../query/Builder.js";
import { eagerNode } from "../query/EagerUtils.js";

export function First<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T> | string,
	key: keyof T & string,
	value: unknown,
): Promise<Node<T> | undefined>;

export function First<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T> | string,
	properties: Partial<T>,
): Promise<Node<T> | undefined>;

export async function First<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T> | string,
	keyOrObject: (keyof T & string) | Partial<T>,
	value?: unknown,
): Promise<Node<T> | undefined>;

export async function First<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T> | string,
	keyOrObject: (keyof T & string) | Partial<T>,
	value?: unknown,
): Promise<Node<T> | undefined> {
	const alias = "this";

	const builder = new Builder(neode);
	const modelObj = typeof model === "string" ? neode.model<T>(model) : model;

	// Match
	builder.match(alias, modelObj);

	// Where
	if (typeof keyOrObject === "object") {
		// Process a map of properties
		for (const [key, value] of Object.entries(keyOrObject)) {
			builder.where(`${alias}.${key}`, value);
		}
	} else {
		// Straight key/value lookup
		builder.where(`${alias}.${keyOrObject}`, value);
	}

	const output = eagerNode(neode, 1, alias, modelObj);

	const result = await builder
		.return(output)
		.limit(1)
		.execute(QueryMode.READ);

	return neode.hydrateFirst(result, alias, model);
}
