import { RelationshipDirectionEnum } from "../src/RelationshipType.js";
import type {
	NodePropertyObject,
	OtherNodeProperties,
	RelationshipNodeProperties,
	SchemaObject,
} from "../src/types.js";

/**
 * Person Definition
 */
export const PersonSchema = {
	person_id: {
		type: "uuid",
		primary: true,
	},
	name: {
		type: "string",
		indexed: true,
	},
	age: "number",
	knows: {
		type: "relationship",
		relationship: "KNOWS",
		direction: RelationshipDirectionEnum.OUT,
		target: "Person",
		properties: {
			since: {
				type: "localdatetime",
				//default: () => new Date(),
			} satisfies OtherNodeProperties<Date>,
		},
	} satisfies RelationshipNodeProperties,
	createdAt: {
		type: "datetime",
		default: () => new Date(),
	},
} satisfies SchemaObject;
