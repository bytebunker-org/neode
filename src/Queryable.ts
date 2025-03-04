import type { QueryResult } from "neo4j-driver";
import type { Model } from "./Model.js";
import type { Neode } from "./Neode.js";
import type { Node } from "./Node.js";
import type { NodeCollection } from "./NodeCollection.js";
import { Builder } from "./query/Builder.js";
import type { OrderDirectionEnum } from "./query/Order.js";
import { Create } from "./services/Create.js";
import { DeleteAll } from "./services/DeleteAll.js";
import { FindAll } from "./services/FindAll.js";
import { FindById } from "./services/FindById.js";
import { FindWithinDistance } from "./services/FindWithinDistance.js";
import { First } from "./services/First.js";
import { MergeOn } from "./services/MergeOn.js";
import type { PointObject } from "./types/generalTypes.js";

export class Queryable<T extends Record<string, unknown>> {
	private readonly _neode: Neode;
	private _model!: Model<T>;

	constructor(neode: Neode) {
		this._neode = neode;
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
	public create(properties: Partial<T>): Promise<Node<T>> {
		return Create<T>(this._neode, this._model, properties);
	}

	/**
	 * Merge a node based on the defined indexes
	 *
	 * @param properties
	 */
	public merge(properties: Partial<T>): Promise<Node<T>> {
		const mergeOn = this._model.mergeFields;

		return MergeOn(this._neode, this._model, mergeOn, properties);
	}

	/**
	 * Merge a node based on the supplied properties
	 *
	 * @param  {Object} match Specific properties to merge on
	 * @param  {Object} set   Properties to set
	 * @return {Promise}
	 */
	public mergeOn(match: Partial<T>, set: Partial<T>): Promise<Node<T>> {
		const mergeOn = Object.keys(match);
		const properties = {
			...match,
			...set,
		} as T;

		return MergeOn<T>(this._neode, this._model, mergeOn, properties);
	}

	/**
	 * Delete all nodes for this model
	 */
	public deleteAll(): Promise<QueryResult> {
		return DeleteAll(this._neode, this._model);
	}

	/**
	 * Get a collection of nodes for this label
	 */
	public all(
		properties: Partial<T>,
		order?:
			| (keyof T & string)
			| Record<keyof T & string, OrderDirectionEnum>,
		limit?: number,
		skip?: number,
	): Promise<NodeCollection<T>> {
		return FindAll(
			this._neode,
			this._model,
			properties,
			order,
			limit,
			skip,
		);
	}

	/**
	 * Find a Node by its Primary Key
	 */
	public find(id: string | number): Promise<Node<T>>;
	public find(
		id: string | number,
		throwOnMissing: false,
	): Promise<Node<T> | undefined>;
	public find(
		id: string | number,
		throwOnMissing = true,
	): Promise<Node<T> | undefined> {
		return this.first(this._model.primaryKey, id, throwOnMissing);
	}

	/**
	 * Find a Node by its internal node ID
	 */
	public findById(id: string): Promise<Node<T>>;
	/**
	 * Find a Node by its internal node ID
	 */
	public findById(
		id: string,
		throwOnMissing: false,
	): Promise<Node<T> | undefined>;
	public findById(
		id: string,
		throwOnMissing = true,
	): Promise<Node<T> | undefined> {
		return FindById(this._neode, this._model, id, throwOnMissing);
	}

	/**
	 * Find a node by properties
	 */
	public first(key: keyof T & string, value: unknown): Promise<Node<T>>;
	public first(
		key: keyof T & string,
		value: unknown,
		throwOnMissing: false,
	): Promise<Node<T> | undefined>;
	/**
	 * Find a node by properties
	 *
	 * @param properties An object of key/value pairs to find the node by
	 */
	public first(properties: Partial<T>): Promise<Node<T>>;
	/**
	 * Find a node by properties
	 *
	 * @param properties An object of key/value pairs to find the node by
	 * @param value
	 * @param throwOnMissing
	 */
	public first(
		properties: Partial<T>,
		value: undefined,
		throwOnMissing: false,
	): Promise<Node<T> | undefined>;
	/**
	 * Find a node by properties
	 *
	 * @param keyOrObject A string for the property name to find the node by or an object of key/value pairs
	 * @param value The value to search for
	 * @param throwOnMissing
	 * @deprecated internal API
	 */
	public first(
		keyOrObject: (keyof T & string) | Partial<T>,
		value?: unknown,
		throwOnMissing?: boolean,
	): Promise<Node<T> | undefined>;
	public first(
		keyOrObject: (keyof T & string) | Partial<T>,
		value?: unknown,
		throwOnMissing = true,
	): Promise<Node<T> | undefined> {
		return First(
			this._neode,
			this._model,
			keyOrObject,
			value,
			throwOnMissing,
		);
	}

	/**
	 * Get a collection of nodes within a certain distance belonging to this label
	 */
	public withinDistance(
		locationProperty: string,
		point: PointObject,
		distance: number,
		properties?: Partial<T>,
		order?: string | Record<string, OrderDirectionEnum>,
		limit?: number,
		skip?: number,
	): Promise<NodeCollection<T>> {
		return FindWithinDistance(
			this._neode,
			this._model,
			locationProperty,
			point,
			distance,
			properties,
			order,
			limit,
			skip,
		);
	}

	protected setModel(_model: Model<T>) {
		this._model = _model;
	}
}
