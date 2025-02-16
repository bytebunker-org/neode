export class WhereId {
	private negative = false;

	constructor(
		private readonly alias: string,
		private readonly paramName: string,
	) {}

	public setNegative(): this {
		this.negative = true;

		return this;
	}

	public toString(): string {
		const negative = this.negative ? "NOT " : "";

		return `${negative}id(${this.alias}) = $${this.paramName}`;
	}
}
