import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Schema } from "../src/Schema.js";
import type { Neode } from "../src/index.js";
import { testNeodeInstance } from "./instance.js";

describe("Schema", () => {
	const label = "SchemaThing";
	let instance: Neode;

	beforeEach(() => {
		instance = testNeodeInstance;

		instance.model(label, {
			id: {
				type: "string",
				required: true,
				unique: true,
			},
			name: {
				type: "string",
				required: true,
			},
			age: {
				type: "number",
				indexed: true,
			},
		});
	});

	afterEach(async () => {
		await instance.close();
	});

	it("should construct", () => {
		expect(instance.schema).toBeInstanceOf(Schema);
		expect(instance.schema.install).toBeInstanceOf(Function);
		expect(instance.schema.drop).toBeInstanceOf(Function);
	});

	it("should install the schema", async () => {
		// TODO: Tests for Enterprise Mode
		await instance.schema.install();
		await instance.cypher("CALL db.awaitIndexes");
		const constraints = await instance.cypher("CALL db.constraints");
		let id_unique = false;
		let id_exists = false;
		let name_exists = false;

		// Check Constraints
		const is_unique =
			/CONSTRAINT ON \( ([a-z0-9]+):([A-Za-z0-9]+) \) ASSERT ([a-z0-9]+).([A-Za-z0-9]+) IS UNIQUE/;
		const will_exist =
			/CONSTRAINT ON \( ([a-z0-9]+):([A-Za-z0-9]+) \) ASSERT exists\(([a-z0-9]+).([A-Za-z0-9]+)\)/;

		for (const constraint of constraints.records) {
			const description = constraint.get("description");

			const unique = description.match(is_unique);
			const exists = description.match(will_exist);

			if (unique && unique[2] === label) {
				if (unique[4] === "id") {
					id_unique = true;
				}
			}

			if (exists && exists[2] === label) {
				if (exists[4] === "id") {
					id_exists = true;
				} else if (exists[4] === "name") {
					name_exists = true;
				}
			}
		}

		// Assertions
		// expect(id_unique).to.equal(true);

		// Enterprise?
		if (instance.enterprise) {
			expect(id_exists).to.equal(true);
			expect(name_exists).to.equal(true);
		}
		const indexes = await instance.cypher("CALL db.indexes");
		const expected = {
			"SchemaThing.age": true,
		};
		const actual: Record<string, boolean> = {};

		for (const index of indexes.records) {
			actual[
				`${index.get("labelsOrTypes")[0]}.${index.get("properties")[0]}`
			] = true;
		}

		expect(actual).toContain(expected);
	});

	it("should drop the schema", async () => {
		await instance.schema.drop();
		const constraints = await instance.cypher("CALL db.constraints");
		let id_unique = false;
		let id_exists = false;
		let name_exists = false;

		// Check Constraints
		const is_unique =
			/CONSTRAINT ON \( ([a-z0-9]+):([A-Za-z0-9]+) \) ASSERT ([a-z0-9]+).([A-Za-z0-9]+) IS UNIQUE/;
		const will_exist =
			/CONSTRAINT ON \( ([a-z0-9]+):([A-Za-z0-9]+) \) ASSERT exists\(([a-z0-9]+).([A-Za-z0-9]+)\)/;

		for (const constraint of constraints.records) {
			const description = constraint.get("description");

			const unique = description.match(is_unique);
			const exists = description.match(will_exist);

			if (unique && unique[2] === label) {
				if (unique[4] === "id") {
					id_unique = true;
				}
			}

			if (exists && exists[2] === label) {
				if (exists[4] === "id") {
					id_exists = true;
				} else if (exists[4] === "name") {
					name_exists = true;
				}
			}
		}

		// Assertions
		expect(id_unique).to.equal(false);
		expect(id_exists).to.equal(false);

		// Enterprise?
		if (instance.enterprise) {
			expect(name_exists).to.equal(false);
		}
	});
});
