import { describe, expect, it } from "vitest";
import { Model } from "../src/Model.js";
import { Property } from "../src/Property.js";
import {
	RelationshipCascadePolicyEnum,
	RelationshipDirectionEnum,
	RelationshipType,
} from "../src/RelationshipType.js";
import type { Neode } from "../src/index.js";
import type { SchemaObject } from "../src/types.js";

describe("RelationshipType", () => {
	it("should construct", () => {
		const name = "test";
		const type = "relationships";
		const rel = "TEST_RELATIONSHIP";
		const direction = RelationshipDirectionEnum.IN;
		const target = new Model(undefined as unknown as Neode, "name", {});
		const schema = {
			name: "string",
		} satisfies SchemaObject;
		const eager = true;
		const cascade = RelationshipCascadePolicyEnum.DELETE;
		const nodeAlias = "alias";

		const relationship = new RelationshipType(
			name,
			type,
			rel,
			direction,
			target,
			schema,
			eager,
			cascade,
			nodeAlias,
		);

		expect(relationship.name).toEqual(name);
		expect(relationship.type).toEqual(type);
		expect(relationship.relationship).toEqual(rel);
		expect(relationship.direction).toEqual(RelationshipDirectionEnum.IN);
		expect(relationship.target).toEqual(target);
		expect(relationship.schema).toEqual(schema);
		expect(relationship.eager).toEqual(eager);
		expect(relationship.cascade).toEqual(cascade);
		expect(relationship.nodeAlias).toEqual(nodeAlias);

		const props = relationship.properties;

		expect(props).to.be.an.instanceOf(Map);
		expect(props.has("name")).toEqual(true);
		expect(props.get("name")).toBeInstanceOf(Property);

		expect(props.get("name")?.type).toEqual("string");
	});
});
