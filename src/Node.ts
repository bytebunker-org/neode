import neo4j from "neo4j-driver";
import { Entity } from "./Entity.js";
import type { Model } from "./Model.js";
import type { Neode } from "./Neode.js";
import type { Relationship } from "./Relationship.js";
import { RelationshipType } from "./RelationshipType.js";
import { DeleteNode } from "./Services/DeleteNode.js";
import { DetachFrom } from "./Services/DetachFrom.js";
import { RelateTo } from "./Services/RelateTo.js";
import type { EntityPropertyMap, SerializedGraph } from "./types.js";

/**
 * Node Container
 */
export class Node<T extends Record<string, unknown>> extends Entity<T> {
	private readonly _neode: Neode;
	private readonly _model: Model<T>;
	private readonly _identity: neo4j.Integer;
	private readonly _labels: string[];
	private readonly _properties: EntityPropertyMap<T>;
	private _eager: EntityPropertyMap<T>;

	private _deleted = false;

	/**
	 * @constructor
	 *
	 * @param neode Neode Instance
	 * @param model Model definition
	 * @param identity Internal Node ID
	 * @param labels Node labels
	 * @param properties Property Map
	 * @param eager Eagerly loaded values
	 */
	constructor(
		neode: Neode,
		model: Model<T>,
		identity: neo4j.Integer,
		labels: string[],
		properties: EntityPropertyMap<T> = new Map() as EntityPropertyMap<T>,
		eager: EntityPropertyMap<T> = new Map() as EntityPropertyMap<T>,
	) {
		super();

		this._neode = neode;
		this._model = model;
		this._identity = identity;
		this._labels = labels;
		this._properties = properties;
		this._eager = eager;
	}

	/**
	 * Get Internal Node ID
	 */
	public override get id(): number {
		return this._identity.toInt();
	}

	/**
	 * Get Internal Node ID
	 */
	public override get identity(): neo4j.Integer {
		return this._identity;
	}

	/**
	 * Get the Model for this Node
	 */
	public override get model(): Model<T> {
		return this._model;
	}

	/**
	 * Get Labels
	 */
	public get labels(): string[] {
		return this._labels;
	}

	public override get internalProperties(): EntityPropertyMap<T> {
		return this._properties;
	}

	public override get internalEagerProperties(): EntityPropertyMap<T> {
		return this._eager;
	}

	/**
	 * Set an eager value on the fly
	 */
	public setEager(key: string, value: unknown): this {
		this._eager.set(key, value);

		return this;
	}

	/**
	 * Delete this node from the Graph
	 *
	 * @param toDepth Depth to delete to (Defaults to 10)
	 */
	public async delete(toDepth = 10): Promise<this> {
		await DeleteNode(this._neode, this._identity, this._model, toDepth);

		this._deleted = true;

		return this;
	}

	/**
	 * Relate this node to another based on the type
	 *
	 * @param node Node to relate to
	 * @param type Type of Relationship definition
	 * @param properties Properties to set against the relationships
	 * @param forceCreate Force the creation a new relationship? If false, the relationship will be merged
	 */
	public async relateTo<
		U extends Record<string, unknown>,
		R extends Record<string, unknown>,
	>(
		node: Node<T>,
		type: string,
		properties: R = {},
		forceCreate = false,
	): Promise<Relationship<R, any, any>> {
		const relationship = this._model.relationships.get(type);

		if (!(relationship instanceof RelationshipType)) {
			return Promise.reject(
				new Error(`Cannot find relationship with type ${type}`),
			);
		}

		const rel = await RelateTo(
			this._neode,
			this,
			node,
			relationship,
			properties,
			forceCreate,
		);
		this._eager.delete(type);

		return rel;
	}

	/**
	 * Detach this node to another
	 *
	 * @param  {Node} node Node to detach from
	 * @return {Promise}
	 */
	detachFrom(other) {
		if (!(other instanceof Node)) {
			return Promise.reject(
				new Error(`Cannot find node with type ${other}`),
			);
		}

		return DetachFrom(this._neode, this, other);
	}

	/**
	 * Convert Node to a JSON friendly Object
	 */
	public override toJson(): SerializedGraph {
		const output: SerializedGraph = {
			_id: this.id,
			_labels: this.labels,
		};

		// Properties
		for (const [key, property] of this._model.properties.entries()) {
			if (property.hidden) {
				continue;
			}

			if (this._properties.has(key)) {
				output[key] = this.valueToJson(
					property,
					this._properties.get(key),
				);
			} else if (neo4j.temporal.isDateTime(output[key])) {
				output[key] = new Date(output[key].toString());
			} else if (neo4j.spatial.isPoint(output[key])) {
				switch (output[key].srid.toString()) {
					// SRID values: @https://neo4j.com/docs/developer-manual/current/cypher/functions/spatial/
					case "4326": // WGS 84 2D
						output[key] = {
							longitude: output[key].x,
							latitude: output[key].y,
						};
						break;

					case "4979": // WGS 84 3D
						output[key] = {
							longitude: output[key].x,
							latitude: output[key].y,
							height: output[key].z,
						};
						break;

					case "7203": // Cartesian 2D
						output[key] = { x: output[key].x, y: output[key].y };
						break;

					case "9157": // Cartesian 3D
						output[key] = {
							x: output[key].x,
							y: output[key].y,
							z: output[key].z,
						};
						break;
				}
			}
		}

		// Properties
		this._model.properties().forEach((property, key) => {});

		// Eager Promises
		return (
			Promise.all(
				this._model.eager().map((rel) => {
					const key = rel.name();

					if (this._eager.has(rel.name())) {
						// Call internal toJson function on either a Node or NodeCollection
						return this._eager
							.get(rel.name())
							.toJson()
							.then((value) => {
								return { key, value };
							});
					}
				}),
			)
				// Remove Empty
				.then((eager) => eager.filter((e) => !!e))

				// Assign to Output
				.then((eager) => {
					eager.forEach(({ key, value }) => (output[key] = value));

					return output;
				})
		);
	}

	/**
	 * Update the properties for this node
	 *
	 * @param {Object} properties  New properties
	 * @return {Node}
	 */
	update(properties) {
		// TODO: Temporary fix, add the properties to the properties map
		// Sorry, but it's easier than hacking the validator
		this._model.properties().forEach((property) => {
			const name = property.name();

			if (property.required() && !properties.hasOwnProperty(name)) {
				properties[name] = this._properties.get(name);
			}
		});

		return UpdateNode(this._neode, this._model, this._identity, properties)
			.then((properties) => {
				properties.map(({ key, value }) => {
					this._properties.set(key, value);
				});
			})
			.then(() => {
				return this;
			});
	}
}
