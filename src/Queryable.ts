import type { NodeCollection } from "../types/index.js";
import type { Neode } from "./Neode.js";
import type { Node } from "./Node.js";
import { Builder } from "./Query/Builder.js";
import { Create } from "./Services/Create.js";
import { DeleteAll } from "./Services/DeleteAll.js";
import { FindAll } from "./Services/FindAll.js";
import { FindById } from "./Services/FindById.js";
import { FindWithinDistance } from "./Services/FindWithinDistance.js";
import { First } from "./Services/First.js";
import { MergeOn } from "./Services/MergeOn.js";

export class Queryable<T> {
	private readonly _neode: Neode;

	constructor(neode: Neode) {
		this._neode = neode;
	}

	/**
	 * Return a new Query Builder
	 *
	 * @return {Builder}
	 */
	query() {
		return new Builder(this._neode);
	}

	/**
	 * Create a new instance of this Model
	 *
	 * @param  {object} properties
	 * @return {Promise}
	 */
	create(properties) {
		return Create(this._neode, this, properties);
	}

	/**
	 * Merge a node based on the defined indexes
	 *
	 * @param  {Object} properties
	 * @return {Promise}
	 */
	merge(properties) {
		const merge_on = this.mergeFields();

		return MergeOn(this._neode, this, merge_on, properties);
	}

	/**
	 * Merge a node based on the supplied properties
	 *
	 * @param  {Object} match Specific properties to merge on
	 * @param  {Object} set   Properties to set
	 * @return {Promise}
	 */
	mergeOn<T>(
		match: Record<string, unknown>,
		set: Record<string, unknown>,
	): Node<T> {
		const merge_on = Object.keys(match);
		const properties = Object.assign({}, match, set);

		return MergeOn(this._neode, this, merge_on, properties);
	}

	/**
	 * Delete all nodes for this model
	 *
	 * @return {Promise}
	 */
	public deleteAll() {
		return DeleteAll(this._neode, this);
	}

	/**
	 * Get a collection of nodes for this label
	 *
	 * @param  {Object}              properties
	 * @param  {String|Array|Object} order
	 * @param  {Int}                 limit
	 * @param  {Int}                 skip
	 * @return {Promise}
	 */
	all(properties, order, limit, skip) {
		return FindAll(this._neode, this, properties, order, limit, skip);
	}

	/**
	 * Find a Node by its Primary Key
	 *
	 * @param id
	 */
	find(id): Promise<Node<T>> {
		const primary_key = this.primaryKey();

		return this.first(primary_key, id);
	}

	/**
	 * Find a Node by it's internal node ID
	 *
	 * @param  {String} model
	 * @param  {int}    id
	 * @return {Promise}
	 */
	public findById(id) {
		return FindById(this._neode, this, id);
	}

	/**
	 * Find a Node by properties
	 *
	 * @param key Either a string for the property name or an object of values
	 * @param value Value
	 */
	public first(
		key: string | Record<string, unknown>,
		value: string | number,
	) {
		return First(this._neode, this, key, value);
	}

	/**
	 * Get a collection of nodes within a certain distance belonging to this label
	 */
	public withinDistance(
		location_property: string,
		point:
			| { x: number; y: number; z?: number }
			| { latitude: number; longitude: number; height?: number },
		distance: number,
		properties?: Record<string, unknown>,
		order?: string | unknown[] | Record<string, unknown>,
		limit?: number,
		skip?: number,
	): Promise<NodeCollection> {
		return FindWithinDistance(
			this._neode,
			this,
			location_property,
			point,
			distance,
			properties,
			order,
			limit,
			skip,
		);
	}
}
