import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Factory } from "../src/Factory.js";
import { Model } from "../src/Model.js";
import { Node } from "../src/Node.js";
import { NodeCollection } from "../src/NodeCollection.js";
import { EAGER_ID, EAGER_LABELS, eagerNode } from "../src/Query/EagerUtils.js";
import { Relationship } from "../src/Relationship.js";
import { RelationshipCollection } from "../src/RelationshipCollection.js";
import {
	RelationshipDirectionEnum,
	RelationshipType,
} from "../src/RelationshipType.js";
import type { Neode } from "../src/index.js";
import { testNeodeInstance } from "./instance.js";

describe("Factory", () => {
	let instance: Neode;
	let factory: Factory;
	let model: Model<{ id: number }>;

	type AltModelType = {
		id: number;
	};

	let alt_model: Model<{
		id: number;
		relationship: { id: number; prop: number };
		relationships: { id: number; prop: number };
		node: { id: number };
		nodes: { id: number };
	}>;

	beforeAll(async () => {
		instance = testNeodeInstance;
		factory = new Factory(instance);

		model = instance.model("FactoryTest", {
			id: "number",
		});

		alt_model = instance.model("AnotherFactoryTest", {
			id: "number",
			relationship: {
				type: "relationship",
				relationship: "RELATIONSHIP",
				target: "AnotherFactoryTest",
				direction: RelationshipDirectionEnum.OUT,
				eager: true,
				properties: {
					prop: "float",
				},
			},
			relationships: {
				type: "relationships",
				relationship: "RELATIONSHIPS",
				target: "AnotherFactoryTest",
				alias: "alias",
				direction: RelationshipDirectionEnum.IN,
				eager: true,
			},
			node: {
				type: "node",
				relationship: "NODE",
				target: "AnotherFactoryTest",
				direction: RelationshipDirectionEnum.OUT,

				eager: true,
			},
			nodes: {
				type: "nodes",
				relationship: "NODES",
				target: "AnotherFactoryTest",
				direction: RelationshipDirectionEnum.IN,
				eager: true,
			},
		});

		await Promise.all([
			instance.create("FactoryTest", { id: 1 }),
			instance.create("FactoryTest", { id: 2 }),
		]);
	});

	afterAll(async () => {
		await instance.deleteAll("FactoryTest");
		await instance.close();
	});

	describe("::getDefinition", () => {
		it("should get a model definition based on an array of labels", () => {
			const output = factory.getDefinition(["FactoryTest"]);

			expect(output).to.be.an.instanceOf(Model);
		});

		it("should return false when definition not found", () => {
			const output = factory.getDefinition(["Unknown"]);

			expect(output).to.equal(undefined);
		});
	});

	describe("::hydrateFirst", () => {
		it("should return false on invalid result", () => {
			expect(factory.hydrateFirst(undefined)).to.equal(undefined);
		});

		it("should return false on empty result", () => {
			expect(factory.hydrateFirst({ records: [] })).to.equal(undefined);
		});

		it("should hydrate alias from first result", async () => {
			const res = await instance.cypher(`
                MATCH (n:FactoryTest)
                RETURN n {
                    .*,
                    ${EAGER_ID}: id(n),
                    ${EAGER_LABELS}: labels(n)
                } ORDER BY n.id ASC LIMIT 1
            `);
			const hydratedNode = factory.hydrateFirst(res, "n");

			expect(hydratedNode).to.be.an.instanceOf(Node);
			expect(hydratedNode!._model).to.equal(model);

			expect(hydratedNode!.get("id")).to.equal(1);
		});

		it("should hydrate alias from first result with specific model definition", (done) => {
			instance
				.cypher(`
                MATCH (n:FactoryTest)
                RETURN n {
                    .*,
                    ${EAGER_ID}: id(n),
                    ${EAGER_LABELS}: labels(n)
                } ORDER BY n.id ASC LIMIT 1
            `)
				.then((res) => {
					return factory.hydrateFirst(res, "n", alt_model);
				})
				.then((res) => {
					expect(res).to.be.an.instanceOf(Node);
					expect(res._model).to.equal(alt_model);

					expect(res.get("id")).to.equal(1);
				})
				.then(() => done())
				.catch((e) => done(e));
		});
	});

	describe("::hydrate", () => {
		it("should return empty node collection on invalid result", () => {
			const output = factory.hydrate(undefined);

			expect(output).to.be.an.instanceOf(NodeCollection);
			expect(output.length).to.equal(0);
		});

		it("should return an empty node collection", () => {
			const output = factory.hydrate({ records: [] });

			expect(output).to.be.an.instanceOf(NodeCollection);
			expect(output.length).to.equal(0);
		});

		it("should hydrate alias", async () => {
			const result = await instance.cypher(`
                MATCH (n:FactoryTest)
                RETURN n {
                    .*,
                    ${EAGER_ID}: id(n),
                    ${EAGER_LABELS}: labels(n)
                } ORDER BY n.id ASC
            `);

			const hydratedResult = factory.hydrate(result, "n");
			expect(hydratedResult).to.be.an.instanceOf(NodeCollection);
			expect(hydratedResult.length).to.equal(2);

			expect(hydratedResult.get(0)?.get("id")).to.equal(1);
			expect(hydratedResult.get(1)?.get("id")).to.equal(2);

			expect(hydratedResult.get(0)).to.be.an.instanceOf(Node);
		});

		it("should hydrate alias from first result with specific model definition", async () => {
			const result = await instance.cypher(`
                MATCH (n:FactoryTest)
                RETURN n {
                    .*,
                    ${EAGER_ID}: id(n),
                    ${EAGER_LABELS}: labels(n)
                } ORDER BY n.id ASC
            `);
			const hydratedResult = factory.hydrate(result, "n", alt_model);
			expect(hydratedResult).to.be.an.instanceOf(NodeCollection);
			expect(hydratedResult.length).to.equal(2);

			expect(hydratedResult.get(0)?.get("id")).to.equal(1);
			expect(hydratedResult.get(0)?._model).to.equal(alt_model);
			expect(hydratedResult.get(1)?.get("id")).to.equal(2);
			expect(hydratedResult.get(1)?._model).to.equal(alt_model);
		});

		it("should hydrate a node and eager relationships", async () => {
			const result = await instance.cypher(`
                CREATE (t:AnotherFactoryTest { id: 3 })
                CREATE (t)-[:RELATIONSHIP { prop: 1.234 }]->(:AnotherFactoryTest {id: 4})
                CREATE (t)<-[:RELATIONSHIPS]-(:AnotherFactoryTest {id: 5})
                CREATE (t)-[:NODE]->(:AnotherFactoryTest {id: 6})
                CREATE (t)<-[:NODES]-(:AnotherFactoryTest {id: 7})

                RETURN ${eagerNode(instance, 3, "t", alt_model)}
            `);
			const hydratedResult = factory.hydrate(result, "t");
			expect(hydratedResult.length).to.equal(1);

			const node = hydratedResult.get(0);

			// Correctly hydrated node?
			expect(node).to.be.an.instanceOf(Node);
			expect(node?.get("id")?.toNumber()).to.equal(3);

			// Outgoing Relationship
			const relationship = node?.get("relationship");
			expect(relationship).to.be.an.instanceOf(Relationship);

			expect(relationship.type()).to.equal("RELATIONSHIP");
			expect(relationship.definition()).to.be.an.instanceOf(
				RelationshipType,
			);

			expect(relationship.startNode().get("id").toNumber()).to.equal(3);
			expect(relationship.endNode().get("id").toNumber()).to.equal(4);
			expect(relationship.otherNode().get("id").toNumber()).to.equal(4);

			expect(relationship.get("prop")).to.equal(1.234);

			// Incoming Relationships
			expect(node.get("relationships")).to.be.an.instanceOf(
				RelationshipCollection,
			);

			expect(
				node
					.get("relationships")
					.first()
					.startNode()
					.get("id")
					.toNumber(),
			).to.equal(5);
			expect(
				node
					.get("relationships")
					.first()
					.endNode()
					.get("id")
					.toNumber(),
			).to.equal(3);
			expect(
				node
					.get("relationships")
					.first()
					.otherNode()
					.get("id")
					.toNumber(),
			).to.equal(5);

			// Outgoing Node
			expect(node.get("node")).to.be.an.instanceOf(Node);
			expect(node.get("node").get("id").toNumber()).to.equal(6);

			// Incoming Nodes
			expect(node.get("nodes")).to.be.an.instanceOf(NodeCollection);
			expect(node.get("nodes").first().get("id").toNumber()).to.equal(7);

			const json = relationship.toJSON();

			expect(json).to.deep.include({
				_type: "RELATIONSHIP",
				prop: 1.234,
			});

			expect(json.node).to.deep.include({
				id: 4,
			});

			await instance.cypher(
				`MATCH (n:AnotherFactoryTest) WHERE n.id IN [3, 4, 5, 6, 7] DETACH DELETE n`,
			);
		});

		it("should convert and hydrate a native node", (done) => {
			instance
				.cypher(`CREATE (t:AnotherFactoryTest { id: 8 }) RETURN t`)
				.then((res) => {
					return factory.hydrate(res, "t");
				})
				.then((output) => {
					expect(output).to.be.an.instanceOf(Collection);
					expect(output.length).to.equal(1);

					const first = output.first();

					expect(first).to.be.an.instanceOf(Node);
					expect(first.model()).be.an.instanceOf(Model);
					expect(first.model().name()).to.equal("AnotherFactoryTest");
					expect(first.get("id").toNumber()).to.equal(8);

					return first.delete();
				})
				.then(() => done())
				.catch((e) => done(e));
		});
	});
});
