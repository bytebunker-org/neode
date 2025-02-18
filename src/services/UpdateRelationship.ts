import type { Neode } from "../Neode.js";
import type { RelationshipType } from "../RelationshipType.js";
import type { NodePropertyObject } from "../types/schemaTypes.js";
import { CleanValue } from "./CleanValue.js";
import { Validator } from "./Validator.js";

export async function UpdateRelationship<T extends Record<string, unknown>>(
	neode: Neode,
	model: RelationshipType<T>,
	identity: string,
	properties: Partial<T>,
) {
	const query = `
        MATCH ()-[rel]->()
        WHERE elementId(rel) = $identity
        SET rel += $properties
        RETURN properties(rel) as properties
    `;

	// Clean up values
	const schema = model.schema;
	const cleanedProperties: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(schema)) {
		const relationshipProperty =
			typeof value === "string"
				? ({ type: schema[key] } as NodePropertyObject)
				: (value as NodePropertyObject);

		// Clean Value
		if (properties[key]) {
			cleanedProperties[key] = CleanValue(
				relationshipProperty,
				properties[key],
			);
		}
	}

	const validatedProperties = await Validator<Partial<T>>(
		neode,
		model,
		cleanedProperties as Partial<T>,
	);

	const result = await neode.writeCypher(query, {
		identity,
		properties: validatedProperties,
	});

	return result.records[0].get("properties");
}
