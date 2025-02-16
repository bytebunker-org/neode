import { RelationshipDirectionEnum } from "../RelationshipType.js";

export class Relationship {
	constructor(
		private readonly relationship?: string,
		private readonly direction?: RelationshipDirectionEnum,
		private readonly alias?: string,
		private readonly traversals?: number | string,
	) {}

	toString() {
		const dirIn =
			this.direction === RelationshipDirectionEnum.IN ? "<" : "";
		const dirOut =
			this.direction === RelationshipDirectionEnum.OUT ? ">" : "";
		const alias = this.alias ? String(this.alias) : "";

		let relationship = this.relationship ?? "";

		if (Array.isArray(relationship)) {
			relationship = relationship.join("`|`");
		}

		if (relationship !== "") {
			relationship = `:\`${relationship}\``;
		}

		const traversals = this.traversals ? `*${this.traversals}` : "";

		const rel =
			this.relationship || this.alias || this.traversals
				? `[${alias}${relationship}${traversals}]`
				: "";

		return `${dirIn}-${rel}-${dirOut}`;
	}
}
