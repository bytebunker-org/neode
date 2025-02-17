import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Model } from "../src/Model.js";
import type { Neode } from "../src/Neode.js";
import { Property } from "../src/Property.js";
import {
	RelationshipDirectionEnum,
	RelationshipType,
} from "../src/RelationshipType.js";
import type { SchemaObject } from "../src/types.js";
import { testNeodeInstance } from "./instance.js";

describe("Model", () => {
	let instance: Neode;
	let model: Model<Record<string, unknown>>;

	const name = "ModelTest";

	const schema = {
		labels: ["Test", "Labels"],
		uuid: {
			type: "uuid",
			primary: true,
		},
		boolean: "boolean",
		int: "int",
		integer: "integer",
		number: {
			type: "number",
			hidden: true,
			readonly: true,
		},
		string: {
			type: "string",
			indexed: true,
			unique: true,
			required: true,
		},
		relationship: {
			type: "relationship",
			relationship: "RELATIONSHIP",
			target: "ModelTest",
			eager: true,
			alias: "nodeattheend",
			direction: RelationshipDirectionEnum.BOTH,
			properties: {
				updated: {
					type: "boolean",
					default: false,
				},
			},
		},
		relationships: {
			type: "relationships",
			relationship: "RELATIONSHIPS",
			target: "ModelTest",
			direction: RelationshipDirectionEnum.BOTH,
			eager: false,
		},
		node: {
			type: "node",
			relationship: "NODE",
			target: "ModelTest",
			direction: RelationshipDirectionEnum.BOTH,
			eager: true,
		},
		nodes: {
			type: "nodes",
			relationship: "NODES",
			target: "ModelTest",
			direction: RelationshipDirectionEnum.BOTH,
			eager: false,
		},
	} satisfies SchemaObject;

	beforeEach(() => {
		instance = testNeodeInstance;
		model = instance.model(name, schema);
	});

	afterEach(async () => {
		await instance.deleteAll(name);
		await instance.close();
	});

	describe("::constructor", () => {
		it("should construct", () => {
			expect(model.name).toEqual(name);
			expect(model.labels).to.deep.equal(schema.labels.sort());

			expect(model.primaryKey).to.deep.equal("uuid");

			// Check Properties
			const props = [
				"uuid",
				"boolean",
				"number",
				"string",
				"int",
				"integer",
			];
			expect(model.properties.size).toEqual(props.length);

			for (const name of props) {
				const prop = model.properties.get(name);

				expect(prop).toBeInstanceOf(Property);
				expect(prop?.type).toEqual(name);
			}

			// Check properties have been set
			const uuid = model.properties.get("uuid");
			expect(uuid?.primary).toEqual(true);

			expect(model.properties.get("string")?.indexed).toEqual(true);
			expect(model.properties.get("string")?.unique).toEqual(true);

			expect(model.properties.get("number")?.readonly).toEqual(true);
			expect(model.properties.get("number")?.hidden).toEqual(true);

			expect(model.hidden).to.deep.equal(["number"]);

			expect(model.indexes).to.deep.equal(["string"]);

			// Check Relationships
			expect(model.relationships.size).toEqual(4);

			const rels = ["relationship", "relationships", "node", "nodes"];

			for (const rel of rels) {
				expect(model.relationships.get(rel)).toBeInstanceOf(
					RelationshipType,
				);
			}
		});

		it("should guess labels and primary key", () => {
			const model = new Model(instance, name, {});

			expect(model.name).toEqual(name);
			expect(model.labels).to.deep.equal(["ModelTest"]);

			expect(model.primaryKey).to.deep.equal("modeltest_id");
		});
	});

	describe("::update", () => {
		it("should update a nodes properties", async () => {
			const node = await instance.create(name, { string: "old" });

			expect(node).toBeDefined();
			await node!.update({ string: "new" });
			expect(node!.get("string")).toEqual("new");
		});

		it("should not throw an error if required properties are not included", async () => {
			const node = await instance.create(name, {
				string: "old",
				number: 3,
			});

			expect(node).toBeDefined();

			await node!.update({ number: 4 });
			expect(node!.get("string")).toEqual("old");
			expect(node!.get("number")).toEqual(4);
		});
	});

	describe("Relationships", () => {
		it("should create, update and delete a relationship", async () => {
			const [first, second] = await Promise.all([
				instance.create(name, { string: "first" }),
				instance.create(name, { string: "second" }),
			]);

			expect(first).toBeDefined();
			expect(second).toBeDefined();
			const relationship = await first!.relateTo(second!, "relationship");

			const res2 = await relationship.update({ updated: true });
			expect(res2.get("updated")).toBeTruthy();

			const records = await instance.cypher(
				"MATCH ()-[r]->() WHERE elementId(r) = $id RETURN r.updated AS updated",
				{ id: res2.id },
			);
			expect(records.records[0].get("updated")).toBeTruthy();

			const deleteRes = await relationship.delete();
			await instance
				.cypher("MATCH ()-[r]->() WHERE elementId(r) = $id RETURN r", {
					id: deleteRes.id,
				})
				.then((res) => {
					expect(res.records.length).toEqual(0);
				});
		});
	});
});
