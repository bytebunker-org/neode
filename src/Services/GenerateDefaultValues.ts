import { v4 as uuidV4 } from "uuid";
import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import { ValidationError } from "../util/ValidationError.js";
import { CleanValue } from "./CleanValue.js";

function GenerateDefaultValuesAsync(
	neode: Neode,
	model: Model,
	properties: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const schema = model.schema();
	const output: Record<string, unknown> = {};

	if (!(properties instanceof Object)) {
		throw new ValidationError(
			"`properties` must be an object.",
			properties,
		);
	}

	// Get All Config
	for (const key of Object.keys(schema)) {
		const config =
			typeof schema[key] === "string"
				? { type: schema[key] }
				: schema[key];

		switch (config.type) {
			case "uuid":
				config.default = uuidV4;
				break;
		}

		if (Object.hasOwn(properties, key)) {
			output[key] = properties[key];
		}

		// Set Default Value
		else if (typeof config.default !== "undefined") {
			output[key] =
				typeof config.default === "function"
					? config.default()
					: config.default;
		}

		// Clean Value
		if (output[key]) {
			output[key] = CleanValue(config, output[key]);
		}
	}

	return Promise.resolve(output);
}

/**
 * Generate default values where no values are not currently set.
 */
function GenerateDefaultValues(
	neode: Neode,
	model: Model,
	properties: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const output = GenerateDefaultValuesAsync(neode, model, properties);

	return Promise.resolve(output);
}

GenerateDefaultValues.async = GenerateDefaultValuesAsync;

export default GenerateDefaultValues;
