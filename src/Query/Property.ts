export class Property<
	T extends Record<string, unknown> = Record<string, unknown>,
> {
	private readonly param: string;

	constructor(
		private readonly property: keyof T & string,
		paramName?: string,
		private readonly operator = "=",
	) {
		this.param = paramName ? `$${paramName}` : "null";
		this.operator = operator;
	}

	public toString(): string {
		return `${this.property} ${this.operator} ${this.param}`.trim();
	}

	public toInlineString(): string {
		return `${this.property}: ${this.param}`.trim();
	}
}
