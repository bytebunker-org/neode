export class WhereRaw {
	private negative = false;

	constructor(private readonly statement: string) {}

	public setNegative(): this {
		this.negative = true;

		return this;
	}

	public toString(): string {
		const negative = this.negative ? "NOT " : "";

		return `${negative}${this.statement}`;
	}
}
