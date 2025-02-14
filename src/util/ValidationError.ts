import { NeodeError } from "./NeodeError.js";

export const ERROR_VALIDATION = "ERROR_VALIDATION";

export class ValidationError extends NeodeError {
	constructor(
		public details: string,
		public input: unknown,
		private _joiError?: unknown,
	) {
		super(ERROR_VALIDATION, 422);
	}
}
