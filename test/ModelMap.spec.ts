import { describe, expect, it } from "vitest";
import { Model } from "../src/Model.js";
import { ModelMap } from "../src/ModelMap.js";
import type { Neode } from "../src/index.js";

describe("ModelMap", () => {
	const undefinedNeode = undefined as unknown as Neode;
	const map = new ModelMap(undefinedNeode);

	describe("::set", () => {
		it("should set and get a new model", () => {
			const name = "ModelMap";
			const model = new Model(undefinedNeode, name, {});

			map.set(name, model);

			expect(map.get(name)).to.equal(model);
		});
	});

	describe("::getByLabels", () => {
		it("should identify a single label model", () => {
			const name = "SingleLabelModel";
			const schema = {};
			const model = new Model(undefinedNeode, name, schema);

			map.set(name, model);

			expect(map.getByLabels([name])).to.equal(model);
		});

		it("should identify a model with multiple labels", () => {
			const name = "MultipleLabelModel";
			const schema = {
				labels: ["Multiple", "Labels"],
			};
			const model = new Model(undefinedNeode, name, schema);

			map.set(name, model);

			expect(map.getByLabels(schema.labels)).to.equal(model);
		});
	});
});
