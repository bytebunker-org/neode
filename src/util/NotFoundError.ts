import type { Model } from "../Model.js";
import { NeodeError } from "./NeodeError.js";

export const ERROR_NOT_FOUND = "ERROR_NOT_FOUND";

export class NotFoundError<
	T extends Record<string, unknown>,
> extends NeodeError {
	constructor(
		public readonly alias: string,
		public readonly model: string | Model<T> | undefined,
	) {
		super(ERROR_NOT_FOUND, 404);
	}
}
