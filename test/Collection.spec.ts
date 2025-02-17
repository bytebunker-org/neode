import { describe, expect, it } from "vitest";
import type { Neode } from "../src/Neode.ts";
import { NodeCollection } from "../src/NodeCollection.js";

describe("NodeCollection", () => {
	const neode = "__neode__" as unknown as Neode;
	const values = [1, 2, 3, 4];

	const collection = new NodeCollection(neode, values);

	describe("::constructor", () => {
		it("should construct", () => {
			expect(collection._neode).to.equal(neode);
			expect([...collection]).containSubset(values);
		});

		it("should construct with an empty array", () => {
			const collection = new NodeCollection(neode);
			expect(collection._neode).to.equal(neode);
			expect([...collection]).to.deep.equal([]);
		});
	});

	describe("::length", () => {
		it("should return the length", () => {
			expect(collection.length).to.equal(values.length);
		});
	});

	describe("::get", () => {
		it("should get an item from the internal values", () => {
			values.forEach((value, index) => {
				expect(collection.get(index)).to.equal(value);
			});
		});
	});

	describe("::[Symbol.iterator]", () => {
		it("should be iterable", () => {
			const output = [];

			for (const value of values) {
				output.push(value);
			}

			expect(output).to.deep.equal(values);
		});
	});

	describe("::first", () => {
		it("should get the first item in the collection", () => {
			expect(collection.first()).to.equal(values[0]);
		});
	});

	describe("::toJSONtoJSON", () => {
		class TestItem {
			constructor(private readonly value: number) {}

			toJSON() {
				return this.value;
			}
		}

		const jsonTest = new NodeCollection(neode, [
			new TestItem(1),
			new TestItem(2),
			new TestItem(3),
			new TestItem(4),
		]);

		it("should run the toJSON() function to all values", async () => {
			expect(jsonTest.toJSON()).to.deep.equal([1, 2, 3, 4]);
		});
	});
});
