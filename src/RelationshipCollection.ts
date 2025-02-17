import type { Neode } from "./Neode.js";
import type { Relationship } from "./Relationship.js";
import type { SerializedGraph } from "./types.js";

export class RelationshipCollection<
	T extends Record<string, unknown>,
	S extends Record<string, unknown>,
	E extends Record<string, unknown>,
> extends Array<Relationship<T, S, E>> {
	private readonly _neode: Neode;

	/**
	 * @param neode Neode Instance
	 * @param values Array of Relationships
	 */
	constructor(neode: Neode, values: Relationship<T, S, E>[]) {
		super(...values);

		this._neode = neode;
	}

	/**
	 * Get a value by its index
	 */
	public get(index: number): Relationship<T, S, E> | undefined {
		return this[index];
	}

	/**
	 * Get the first Relationship in the Collection
	 */
	public first(): Relationship<T, S, E> {
		return this[0];
	}

	/**
	 * Map the 'toJSON' function on all values
	 */
	public toJSON(): SerializedGraph[] {
		return this.map((r) => r.toJSON());
	}
}
