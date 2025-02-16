export class WhereBetween {
	private negative = false;

	constructor(
		private readonly alias: string,
		private readonly floorParam: string,
		private readonly ceilingParam: string,
	) {}

	public setNegative(): this {
		this.negative = true;

		return this;
	}

	public toString(): string {
		const negative = this.negative ? "NOT " : "";

		return `${negative}$${this.floorParam} <= ${this.alias} <= $${this.ceilingParam}`;
	}
}
