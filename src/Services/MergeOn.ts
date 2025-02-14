import type { Neode } from "../Neode.js";
import type { Node } from "../Node.js";
import Builder, { mode } from "../Query/Builder.js";
import { eagerNode } from "../Query/EagerUtils.js";
import type { Queryable } from "../Queryable.js";
/*
import GenerateDefaultValues from './GenerateDefaultValues';
import Node from '../Node';
import Validator from './Validator';
import { DIRECTION_IN, DIRECTION_OUT } from '../RelationshipType';
import { eagerNode } from '../Query/EagerUtils';

const MAX_CREATE_DEPTH = 99;
const ORIGINAL_ALIAS = 'this';
*/
import GenerateDefaultValues from "./GenerateDefaultValues.js";
import { Validator } from "./Validator.js";
import { ORIGINAL_ALIAS, addNodeToStatement } from "./WriteUtils.js";

export function MergeOn<T>(
	neode: Neode,
	model: Queryable<T>,
	merge_on: Record<string, unknown>,
	properties: Record<string, unknown>,
): Promise<Node<T>> {
	return GenerateDefaultValues(neode, model, properties)
		.then((properties) => Validator(neode, model, properties))
		.then((properties) => {
			const alias = ORIGINAL_ALIAS;

			const builder = new Builder(neode);

			addNodeToStatement(
				neode,
				builder,
				alias,
				model,
				properties,
				[alias],
				"merge",
				merge_on,
			);

			// Output
			const output = eagerNode(neode, 1, alias, model);

			return builder
				.return(output)
				.execute(mode.WRITE)
				.then((res) => neode.hydrateFirst(res, alias));
		});
}
