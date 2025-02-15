export class Property {
	private readonly param: string;

	constructor(
		private readonly property: string,
		readonly paramName?: string,
		private readonly operator = "=",
	) {
		this.param = paramName ? `$${paramName}` : "null";
		this.operator = operator;
	}

	toString() {
		return `${this.property} ${this.operator} ${this.param}`.trim();
	}

	toInlineString() {
		return `${this.property}: ${this.param}`.trim();
	}
}
