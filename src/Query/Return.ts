export class Return {
	// TODO: Does alias carry an 'as' value?
	constructor(
		private readonly alias: string,
		private readonly as: string,
	) {}

	toString() {
		let output = this.alias;

		if (this.as) {
			output += ` AS ${this.as}`;
		}

		return output;
	}
}
