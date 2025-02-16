import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";
import { Builder, QueryMode } from "../Query/Builder.js";
import { eagerNode } from "../Query/EagerUtils.js";
import { GenerateDefaultValues } from "./GenerateDefaultValues.js";
import { Validator } from "./Validator.js";
import { ORIGINAL_ALIAS, addNodeToStatement } from "./WriteUtils.js";

export async function Create<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T>,
	properties: T,
): Promise<Node<T> | undefined> {
	const propertiesWithDefaults = GenerateDefaultValues(
		neode,
		model,
		properties,
	);
	const validatedProperties = await Validator(
		neode,
		model,
		propertiesWithDefaults,
	);

	const alias = ORIGINAL_ALIAS;

	const builder = new Builder(neode);

	addNodeToStatement(neode, builder, alias, model, validatedProperties, [
		alias,
	]);

	// Output
	const output = eagerNode(neode, 1, alias, model);

	const result = await builder.return(output).execute(QueryMode.WRITE);

	return neode.hydrateFirst(result, alias);
}
