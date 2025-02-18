export enum OrderDirectionEnum {
	ASC = "ASC",
	DESC = "DESC",
}

export class Order<
	T extends Record<string, unknown> = Record<string, unknown>,
> {
	constructor(
		private readonly what: keyof T & string,
		private readonly how?: OrderDirectionEnum,
	) {}

	public toString(): string {
		return `${this.what} ${this.how ?? ""}`.trim();
	}
}
