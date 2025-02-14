import { Model } from "../Model.js";

export class Create {
	private readonly _alias: string;
	private readonly _model: Model | string | false;

	constructor(alias = "", model: Model | string | false = false) {
		this._alias = alias;
		this._model = model;
	}

	toString() {
		const alias = this._alias ?? "";
		let model = "";

		if (this._model instanceof Model) {
			model = `:${this._model.labels().join(":")}`;
		} else if (typeof this._model === "string") {
			model = `:${this._model}`;
		}

		return `(${alias}${model ? model : ""})`;
	}
}
