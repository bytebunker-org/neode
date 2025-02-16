export class Where {
	private negative = false;

	constructor(
		private readonly left: string,
		private readonly operator: string,
		private readonly right: string,
	) {}

	public setNegative(): this {
		this.negative = true;

		return this;
	}

	public toString(): string {
		const negative = this.negative ? "NOT " : "";

		return `${negative}${this.left} ${this.operator} ${this.right}`;
	}
}
