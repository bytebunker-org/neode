export class Where {
	private negative = false;

	constructor(
		private readonly left: string,
		private readonly operator: string,
		private readonly right: string,
	) {}

	setNegative(): this {
		this.negative = true;

		return this;
	}

	toString() {
		const negative = this.negative ? "NOT " : "";

		return `${negative}${this.left} ${this.operator} ${this.right}`;
	}
}
