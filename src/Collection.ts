import type { Neode } from "./Neode.js";
import type { Node } from "./Node.js";

export class Collection<T> extends Array<Node<T>> {
	/**
	 * @constructor
	 * @param  values  Array of Node
	 */
	constructor(values: Node<T>[]);
	/**
	 * @constructor
	 * @param  neode    Neode Instance
	 * @param  values  Array of Node
	 * @deprecated The constructor doesn't require you to pass in a Neode instance anymore
	 */
	constructor(neode: Neode, values: Node<T>[]);
	constructor(
		neodeOrValues: Neode | Node<T>[] | undefined,
		values: Node<T>[] = [],
	) {
		super(...(Array.isArray(neodeOrValues) ? neodeOrValues : values));
	}

	/**
	 * Get a value by its index
	 */
	public get(index: number): Node<T> | undefined {
		return this[index];
	}

	/**
	 * Get the first Node in the Collection
	 */
	public first(): Node<T> {
		return this[0];
	}

	/**
	 * Map the 'toJson' function on all values
	 */
	public toJson() {
		return Promise.all(this.map((value) => value.toJson()));
	}
}
