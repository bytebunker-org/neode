import { v4 as uuidV4 } from "uuid";
import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { RelationshipType } from "../RelationshipType.js";
import type { NodePropertyObject } from "../types/schemaTypes.js";
import { ValidationError } from "../util/ValidationError.js";
import { CleanValue } from "./CleanValue.js";

/**
 * Generate default values where no values are not currently set.
 */
export function GenerateDefaultValues<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T> | RelationshipType<T>,
	properties: Partial<T>,
): T {
	const schema = model.schema;
	const output: Record<string, unknown> = {};

	if (!properties || typeof properties !== "object") {
		throw new ValidationError(
			"`properties` must be an object.",
			properties,
		);
	}

	for (const [key, value] of Object.entries(schema)) {
		const nodeProperty =
			typeof value === "string"
				? ({ type: schema[key] } as NodePropertyObject)
				: (value as NodePropertyObject);

		if (nodeProperty.type === "uuid") {
			nodeProperty.default = uuidV4;
		}

		if (Object.hasOwn(properties, key)) {
			// @ts-ignore
			output[key] = properties[key];
		} else if (typeof nodeProperty.default !== "undefined") {
			output[key] =
				typeof nodeProperty.default === "function"
					? nodeProperty.default()
					: nodeProperty.default;
		}

		if (output[key]) {
			output[key] = CleanValue(nodeProperty, output[key]);
		}
	}

	return output as T;
}
