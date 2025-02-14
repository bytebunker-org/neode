import { Model } from "./Model.js";
import type { Neode } from "./Neode.js";
import type { SchemaObject } from "./types.js";

export class ModelMap extends Map<string, Model<unknown>> {
	private readonly _neode: Neode;

	constructor(neode: Neode) {
		super();

		this._neode = neode;
	}

	/**
	 * Get the definition for an array labels
	 */
	public getByLabels(label: string): Model<unknown> | undefined;
	public getByLabels(labels: string[]): Model<unknown> | undefined;
	public getByLabels(
		labelOrArray: string | string[],
	): Model<unknown> | undefined;
	public getByLabels(
		labelOrArray: string | string[],
	): Model<unknown> | undefined {
		const labels = Array.isArray(labelOrArray)
			? labelOrArray
			: [labelOrArray];

		for (const definition of this.values()) {
			if (
				definition.labels().sort().join(":") === labels.sort().join(":")
			) {
				return definition;
			}
		}

		return undefined;
	}

	/**
	 * Extend a model with extra configuration
	 *
	 * @param  {String} name   Original Model to clone
	 * @param  {String} as     New Model name
	 * @param  {Object} using  Schema changes
	 * @return {Model}
	 */
	extend<T>(name: string, as: string, using: SchemaObject): Model<T> {
		// Get Original Model
		const original = this.get(name);

		if (!original) {
			throw new Error(`Couldn't find a definition for "${name}".`);
		}

		// Add new Labels
		const labels = original.labels().slice(0);
		labels.push(as);
		labels.sort();

		// Merge Schema
		const schema = Object.assign({}, original.schema, using);

		// Create and set
		const model = new Model(this._neode, as, schema);

		model.setLabels(...labels);

		this.set(as, model);

		return model;
	}
}
