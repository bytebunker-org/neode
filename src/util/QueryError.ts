import { NeodeError } from "./NeodeError.js";

export const ERROR_QUERY = "ERROR_QUERY";

export class QueryError extends NeodeError {
	constructor(
		public query: string,
		public params: Record<string, unknown> | undefined,
		public override cause: Error,
	) {
		super(ERROR_QUERY, 500);
	}
}
