export class Order {
	constructor(
		private readonly what: string,
		private readonly how: string = "",
	) {}

	toString() {
		return `${this.what} ${this.how}`.trim();
	}
}
