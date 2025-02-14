import { NeodeError } from "./NeodeError.js";

export const ERROR_TRANSACTION_FAILED = "ERROR_TRANSACTION_FAILED";

export class TransactionError extends NeodeError {
	constructor(public readonly errors: unknown[]) {
		super(ERROR_TRANSACTION_FAILED, 500);

		this.errors = errors;
	}
}
