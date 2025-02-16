import type { IStatement } from "./IStatement.js";

export class WithStatement implements IStatement {
	private readonly with: string[];

	constructor(...args: string[]) {
		this.with = args;
	}

	public toString(): string {
		const vars = this.with.join(",");

		return `WITH ${vars}`;
	}
}
