import { Model } from "../Model.js";

export class Create<
	T extends Record<string, unknown> = Record<string, unknown>,
> {
	constructor(
		private readonly alias = "",
		private readonly model?: Model<T> | string | undefined,
	) {}

	toString() {
		const alias = this.alias ?? "";
		let model = "";

		if (this.model instanceof Model) {
			model = `:${this.model.labels.join(":")}`;
		} else if (typeof this.model === "string") {
			model = `:${this.model}`;
		}

		return `(${alias}${model ? model : ""})`;
	}
}
