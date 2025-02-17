import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { Integerable, NodePropertyObject } from "../types.js";
import { CleanValue } from "./CleanValue.js";
import { Validator } from "./Validator.js";

export async function UpdateNode<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T>,
	identity: string,
	properties: Partial<T>,
): Promise<{ key: string; value: unknown }[]> {
	const query = `
        MATCH (node)
        WHERE elementId(node) = $identity
        SET node += $properties
        WITH node

        UNWIND keys($properties) AS key
        RETURN key, node[key] AS value
    `;

	// Clean up values
	const schema = model.schema;
	const cleanedProperties: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(schema)) {
		const nodeProperty =
			typeof value === "string"
				? ({ type: schema[key] } as NodePropertyObject)
				: (value as NodePropertyObject);

		// Clean Value
		if (properties[key]) {
			cleanedProperties[key] = CleanValue(nodeProperty, properties[key]);
		}
	}

	const validatedProperties = await Validator(
		neode,
		model,
		cleanedProperties as Partial<T>,
	);

	const result = await neode.writeCypher(query, {
		identity,
		properties: validatedProperties,
	});

	return result.records.map((row) => ({
		key: row.get("key") as string,
		value: row.get("value") as unknown,
	}));
}
