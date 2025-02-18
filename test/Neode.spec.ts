import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Model } from "../src/Model.js";
import { Node } from "../src/Node.js";
import { NodeCollection } from "../src/NodeCollection.js";
import { Property } from "../src/Property.js";
import { Relationship } from "../src/Relationship.js";
import { RelationshipDirectionEnum } from "../src/RelationshipType.js";
import { Neode } from "../src/index.js";
import { Builder } from "../src/query/Builder.js";
import type { Query, SchemaObject } from "../src/types/generalTypes.js";
import { TransactionError } from "../src/util/TransactionError.js";
import { testNeodeInstance } from "./instance.js";

describe("Neode", () => {
	const label = "IndexTest";
	const schema = {
		name: { type: "string", primary: true },
		setme: "string",
		relate_test: {
			type: "relationship",
			relationship: "RELATE_TEST",
			direction: RelationshipDirectionEnum.OUT,
			target: "IndexTest",
			properties: {
				test: "boolean",
			},
		},
	} satisfies SchemaObject;
	let instance: Neode;

	beforeEach(() => {
		instance = testNeodeInstance;
		instance.with({ [label]: schema });
	});

	afterEach(async () => {
		await instance.writeCypher(`MATCH (n:${label}) DETACH DELETE n`);
	});

	it("should instantiate", () => {
		expect(instance).toBeInstanceOf(Neode);
		// expect(instance.driver).toBeInstanceOf(neo4j.driver);
	});

	it("should instantiate with enterprise mode", () => {
		const enterprise = new Neode({
			connectionString: "bolt://localhost:3000",
			username: "username",
			password: "password",
			enterprise: true,
			database: "defaultdb",
		});

		expect(enterprise).toBeInstanceOf(Neode);
		expect(enterprise.enterprise).toEqual(true);
		expect(enterprise.database).toEqual("defaultdb");
	});

	it("should load models using `with` and return self", () => {
		const output = instance.with({
			WithTest: {
				name: "string",
			},
		});

		expect(output).toEqual(instance);
		expect(output.model("WithTest")).toBeInstanceOf(Model);
	});

	it("should run cypher query", async () => {
		const res = await instance.cypher("MATCH (n) RETURN count(n)");

		expect(res.records).to.be.an("array");
		expect(res.records.length).toEqual(1);
	});

	it("should run a cypher read query", async () => {
		const res = await instance.readCypher("MATCH (n) RETURN count(n)");

		expect(res.records).to.be.an("array");
		expect(res.records.length).toEqual(1);
	});

	it("should handle error in syntax query", async () => {
		await expect(
			instance.cypher("MATCH (n) RETURN coutn(n)"),
		).rejects.toThrowError();
	});

	describe("::batch", () => {
		it("should handle a batch of queries", async () => {
			const queries = [
				"MATCH (n) RETURN count(n)",
				{
					text: "MATCH (n) WHERE n.name = $name RETURN n",
					parameters: { name: "name" },
				},
			] satisfies Query[];

			const res = await instance.batch(queries);
			expect(Array.isArray(res)).toBeTruthy();
			expect(res.length).toEqual(2);
		});

		it("should throw a transaction error on error", async () => {
			await expect(
				instance.batch(["MATCH (a) RETURN b", "RETURN x"]),
			).rejects.toThrowError(TransactionError);
		});
	});

	describe("::model", () => {
		it("should register a new model", () => {
			const model = instance.model(label, schema);

			expect(model).toBeInstanceOf(Model);
			expect(model.name).toEqual(label);
		});
	});

	describe("::extend", () => {
		it("should extend a model with new properties", () => {
			const extended_label = "ExtendedTest";
			const using = {
				extended_id: {
					type: "uuid",
					primary: true,
				},
				somethingelse: "string",
			} satisfies SchemaObject;

			const model = instance.extend(label, extended_label, using);

			expect(model).toBeInstanceOf(Model);
			expect(model.name).toEqual(extended_label);
			expect(model.labels).to.contain(label, extended_label);

			expect(model.primaryKey).toEqual("extended_id");

			const newprop = model.properties.get("somethingelse");

			expect(newprop).toBeInstanceOf(Property);
			expect(newprop?.type).toEqual("string");

			expect(instance.model(extended_label)).toEqual(model);
		});
	});

	describe("::create", () => {
		it("should create a new model", async () => {
			const create_data = { name: "Test" };

			const res = await instance.create(label, create_data);
			expect(res).toBeInstanceOf(Node);
			expect(res?.get("name")).toEqual(create_data.name);

			expect(res?.properties).to.deep.equal(create_data);

			expect(res?.get("unknown", "default")).toEqual("default");

			const json = res?.toJSON();
			expect(json?.["name"]).toEqual(create_data.name);
		});
	});

	describe("::merge", () => {
		it("should merge a model", async () => {
			const create_data = { name: "Test" };

			// Only works when running in a sequence
			/*const [first, second] = await Promise.all([
				instance.merge(label, create_data),
				instance.merge(label, create_data),
			]);*/

			const first = await instance.merge(label, create_data);
			const second = await instance.merge(label, create_data);

			expect(first).toBeInstanceOf(Node);
			expect(first?.get("name")).toEqual(create_data.name);

			expect(second).toBeInstanceOf(Node);
			expect(second?.get("name")).toEqual(create_data.name);

			expect(first?.id).toEqual(second?.id);
		});
	});

	describe("::mergeOn", () => {
		it("should merge a model on specific properties", async () => {
			const match = { name: "Test" };
			const set = { setme: "set" };
			type ModelType = typeof match & typeof set;

			const first = await instance.mergeOn<ModelType>(label, match, set);
			const second = await instance.mergeOn<ModelType>(label, match, set);

			expect(first).toBeInstanceOf(Node);
			expect(first?.get("name")).toEqual(match.name);
			expect(first?.get("setme")).toEqual(set.setme);

			expect(second).toBeInstanceOf(Node);
			expect(second?.get("name")).toEqual(match.name);
			expect(second?.get("setme")).toEqual(set.setme);

			expect(first?.id).toEqual(second?.id);
		});
	});

	describe("::delete", () => {
		it("should delete a node", async () => {
			const create_data = { name: "DeleteTest" };
			const node = await instance.create(label, create_data);

			expect(node).toBeDefined();

			await instance.delete(node!);
		});
	});

	describe("::relateTo", () => {
		it("should relate two nodes", async () => {
			const props = { test: true };

			const [from, to] = await Promise.all([
				instance.create(label, { name: "From" }),
				instance.create(label, { name: "To" }),
			]);

			expect(from).toBeDefined();
			expect(to).toBeDefined();

			const rel = await instance.relate(from!, to!, "relate_test", props);

			expect(rel).toBeInstanceOf(Relationship);
			expect(rel.get("test")).toEqual(props.test);
			expect(rel.properties).to.deep.equal(props);

			const res = await instance.cypher(
				"MATCH (start)-[rel]->(end) WHERE elementId(start) = $start AND elementId(rel) = $rel AND elementId(end) = $end RETURN count(*) as count",
				{
					start: rel.startNode.id,
					rel: rel.id,
					end: rel.endNode.id,
				},
			);

			expect(res.records[0].get("count").toNumber()).toEqual(1);
		});

		it("should create a second relationship when forced", async () => {
			const props = { test: true };
			const [from, to] = await Promise.all([
				instance.create(label, { name: "From" }),
				instance.create(label, { name: "To" }),
			]);

			expect(from).toBeDefined();
			expect(to).toBeDefined();

			const rel = await instance.relate(from!, to!, "relate_test", props);
			expect(rel).toBeInstanceOf(Relationship);
			expect(rel.get("test")).toEqual(props.test);
			expect(rel.properties).to.deep.equal(props);

			const rel2 = await instance.relate(
				rel.startNode,
				rel.endNode,
				"relate_test",
				props,
				true,
			);
			expect(rel2).toBeInstanceOf(Relationship);
			expect(rel2.get("test")).toEqual(props.test);
			expect(rel2.properties).to.deep.equal(props);

			const res = await instance.cypher(
				`MATCH (start)-[:${rel2.type}]->(end) WHERE elementId(start) = $start AND elementId(end) = $end RETURN count(*) as count`,
				{
					start: rel2.startNode.id,
					rel: rel2.id,
					end: rel2.endNode.id,
				},
			);
			expect(res.records[0].get("count").toNumber()).toEqual(2);
		});

		it("should throw an error for an unknown relationship type", async () => {
			const [from, to] = await Promise.all([
				instance.create(label, { name: "From" }),
				instance.create(label, { name: "To" }),
			]);

			expect(from).toBeDefined();
			expect(to).toBeDefined();

			await expect(
				instance.relate(from!, to!, "unknown"),
			).rejects.toThrowError();
		});
	});

	describe("::detachFrom", () => {
		it("should detach two nodes", async () => {
			const [from, to] = await Promise.all([
				instance.create(label, { name: "From" }),
				instance.create(label, { name: "To" }),
			]);

			expect(from).toBeDefined();
			expect(to).toBeDefined();

			await from!.detachFrom(to!);

			const res = await instance.cypher(
				"MATCH (start)-[rel]->(end) WHERE elementId(start) = $start AND elementId(end) = $end RETURN count(*) as count",
				{
					start: from!.id,
					end: to!.id,
				},
			);

			expect(res.records[0].get("count").toNumber()).toEqual(0);
		});
	});

	describe("::query", () => {
		it("should return a query builder", () => {
			const query = instance.query();

			expect(query).toBeInstanceOf(Builder);
		});
	});

	describe("::all", () => {
		it("should return a collection of nodes", async () => {
			const res = await instance.all(label, {}, {}, 1, 0);

			expect(res).toBeInstanceOf(NodeCollection);
		});
	});

	describe("::find", () => {
		it("should find a label by its primary key", async () => {
			const create_data = { name: "FindTest" };
			const res = await instance.create(label, create_data);

			expect(res).toBeDefined();

			const found = await instance.find(label, create_data.name);
			expect(found).toBeDefined();
			expect(found!.id).toEqual(res!.id);

			await res!.delete();
		});
	});

	describe("::findById", () => {
		it("should find a label by its internal ID", async () => {
			const create_data = { name: "FindByIdTest" };
			const res = await instance.create(label, create_data);
			expect(res).toBeDefined();

			const found = await instance.findById(label, res!.id);
			expect(found).toBeDefined();
			expect(found!.id).toEqual(res!.id);

			await res!.delete();
		});
	});

	describe("::first", () => {
		it("should find a label by a property", async () => {
			const key = "name";
			const value = "FirstTest";

			const res = await instance.create(label, { [key]: value });

			const found = await instance.first(label, key, value);

			expect(found).toBeInstanceOf(Node);
			expect(found!.id).toEqual(res!.id);
		});

		it("should find a label by a map of properties", async () => {
			const key = "name";
			const value = "FirstMapTest";

			const res = await instance.create(label, { [key]: value });
			expect(res).toBeDefined();

			const found = await instance.first(label, { [key]: value });
			expect(found).toBeInstanceOf(Node);
			expect(found!.id).toEqual(res!.id);
		});
	});
});
