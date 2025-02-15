import type { Neode } from "./Neode.js";
import type { Node } from "./Node.js";

export class NodeCollection<T extends Record<string, unknown>> extends Array<
	Node<T>
> {
	private readonly _neode: Neode;

	/**
	 * @param neode Neode Instance
	 * @param values Array of Node
	 */
	constructor(neode: Neode, values: Node<T>[]) {
		super(...values);

		this._neode = neode;
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
