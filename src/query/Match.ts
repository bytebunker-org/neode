// TODO: Rename this, NodePattern?

import { Model } from "../Model.js";
import type { Property } from "./Property.js";

export class Match<
	T extends Record<string, unknown> = Record<string, unknown>,
> {
	constructor(
		private readonly alias?: string,
		private readonly model?: Model<T>,
		private readonly properties: Property[] = [],
	) {}

	public toString(): string {
		const alias = this.alias ?? "";
		let modelName = "";
		let properties = "";

		if (this.model instanceof Model) {
			modelName = `:${this.model.labels.join(":")}`;
		}

		if (this.properties.length) {
			properties = " { ";

			properties += this.properties
				.map((property) => property.toInlineString())
				.join(", ");

			properties += " }";
		}

		return `(${alias}${modelName ? modelName : ""}${properties})`;
	}
}
