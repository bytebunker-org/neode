import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import { Builder, QueryMode } from "../Query/Builder.js";
import { eagerNode } from "../Query/EagerUtils.js";
import GenerateDefaultValues from "./GenerateDefaultValues.js";
import { Validator } from "./Validator.js";
import { ORIGINAL_ALIAS, addNodeToStatement } from "./WriteUtils.js";

export async function Create<T>(
	neode: Neode,
	model: Model<T>,
	properties: Record<string, unknown>,
) {
	let properties = await GenerateDefaultValues(neode, model, properties);
	properties = await Validator(neode, model, properties);

	const alias = ORIGINAL_ALIAS;

	const builder = new Builder(neode);

	addNodeToStatement(neode, builder, alias, model, properties, [alias]);

	// Output
	const output = eagerNode(neode, 1, alias, model);

	return builder
		.return(output)
		.execute(QueryMode.WRITE)
		.then((res) => neode.hydrateFirst(res, alias));
}
