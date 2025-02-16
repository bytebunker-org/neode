import type { IStatement } from "./IStatement.js";

export class WithDistinctStatement implements IStatement {
	private readonly with: string[];

	constructor(...args: string[]) {
		this.with = args;
	}

	public toString(): string {
		const vars = this.with.join(",");

		return `WITH DISTINCT ${vars}`;
	}
}
