import type neo4j from "neo4j-driver";
import type { NodeCollection } from "../types/index.js";
import type { Model } from "./Model.js";
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

export class Queryable<T extends Record<string, unknown>> {
	private readonly _neode: Neode;
	private _model!: Model<T>;

	constructor(neode: Neode) {
		this._neode = neode;
	}

	protected setModel(_model: Model<T>) {
		this._model = _model;
	}

	/**
	 * Return a new Query Builder
	 */
	public query(): Builder {
		return new Builder(this._neode);
	}

	/**
	 * Create a new instance of this Model
	 */
	public create(properties: T): Promise<Node<T>> {
		return Create<T>(this._neode, this._model, properties);
	}

	/**
	 * Merge a node based on the defined indexes
	 *
	 * @param properties
	 */
	public merge(properties: T): Promise<Node<T>> {
		const merge_on = this._model.mergeFields;

		return MergeOn(this._neode, this._model, merge_on, properties);
	}

	/**
	 * Merge a node based on the supplied properties
	 *
	 * @param  {Object} match Specific properties to merge on
	 * @param  {Object} set   Properties to set
	 * @return {Promise}
	 */
	mergeOn(
		match: Record<string, unknown>,
		set: Record<string, unknown>,
	): Node<T> {
		const mergeOn = Object.keys(match);
		const properties = Object.assign({}, match, set);

		return MergeOn(this._neode, this._model, mergeOn, properties);
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
	public all(properties, order, limit, skip) {
		return FindAll(this._neode, this, properties, order, limit, skip);
	}

	/**
	 * Find a Node by its Primary Key
	 */
	public find(id: string | number): Promise<Node<T>> {
		return this.first(this._model.primaryKey, id);
	}

	/**
	 * Find a Node by its internal node ID
	 */
	public findById(id: number) {
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
