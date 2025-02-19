import type { QueryResult } from "neo4j-driver";
import { type EagerMap, type EagerObject, Entity } from "./Entity.js";
import type { Model } from "./Model.js";
import type { Neode } from "./Neode.js";
import type { Relationship } from "./Relationship.js";
import { RelationshipType } from "./RelationshipType.js";
import { DeleteNode } from "./services/DeleteNode.js";
import { DetachFrom } from "./services/DetachFrom.js";
import { RelateTo } from "./services/RelateTo.js";
import { UpdateNode } from "./services/UpdateNode.js";
import type { SerializedGraph } from "./types/generalTypes.js";
import type { EntityPropertyMap } from "./types/schemaTypes.js";
import { hasOwn } from "./util/util.js";

/**
 * Node Container
 */
export class Node<T extends Record<string, unknown>> extends Entity<T> {
	private readonly _neode: Neode;
	private readonly _model: Model<T>;
	private readonly _identity: string;
	private readonly _labels: string[];
	private readonly _properties: EntityPropertyMap<T>;
	private readonly _eager: EagerMap<T>;

	private _deleted = false;

	/**
	 * @constructor
	 *
	 * @param neode Neode Instance
	 * @param model Model definition
	 * @param identity Internal Node Element ID
	 * @param labels Node labels
	 * @param properties Property Map
	 * @param eager Eagerly loaded values
	 */
	constructor(
		neode: Neode,
		model: Model<T>,
		identity: string,
		labels: string[],
		properties = new Map() as EntityPropertyMap<T>,
		eager = new Map() as EagerMap<T>,
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
	 * Get Internal Node Element ID
	 */
	public override get id(): string {
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

	public override get internalEagerProperties(): EagerMap<T> {
		return this._eager;
	}

	/**
	 * Set an eager value on the fly
	 */
	public setEager<O extends Record<string, unknown>>(
		key: string,
		value: EagerObject<O>,
	): this {
		this._eager.set(key, value as EagerObject<Record<string, unknown>>);

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
	 * @param relationshipKey Key of relationship on this node
	 * @param properties Properties to set against the relationships
	 * @param forceCreate Force the creation a new relationship? If false, the relationship will be merged
	 */
	public async relateTo<
		O extends Record<string, unknown>,
		R extends Record<string, unknown>,
	>(
		node: Node<O>,
		relationshipKey: keyof T & string,
		properties: Partial<R> = {},
		forceCreate = false,
	): Promise<Relationship<R, T | O, T | O>> {
		const relationshipType = this._model.relationships.get(relationshipKey);

		if (!(relationshipType instanceof RelationshipType)) {
			return Promise.reject(
				new Error(
					`Cannot find relationship with type ${relationshipKey}`,
				),
			);
		}

		const relationship = await RelateTo<R, T, O>(
			this._neode,
			this,
			node,
			relationshipType,
			properties,
			forceCreate,
		);
		this._eager.delete(relationshipKey);

		return relationship;
	}

	/**
	 * Detach this node from another
	 *
	 * @param other Node to detach from
	 */
	public detachFrom<O extends Record<string, unknown>>(
		other: Node<O>,
	): Promise<QueryResult> {
		if (!(other instanceof Node)) {
			throw new Error(`Cannot find node with type ${other}`);
		}

		return DetachFrom(this._neode, this, other);
	}

	/**
	 * Convert Node to a JSON friendly Object
	 */
	public override toJSON(): SerializedGraph {
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
			}

			// TODO: This code doesn't make sense, it tries to convert output[key] .. but output[key] is not yet set
			/*
            } else if (neo4j.temporal.isDateTime(output[key] as object)) {
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
                }*/
		}

		for (const eagerRelationship of this._model.eager) {
			const name = eagerRelationship.name;

			if (this._eager.has(name)) {
				// Call internal toJSON function on either a Node, NodeCollection, Relationship or RelationshipCollection

				const eagerValue = this._eager.get(name)!.toJSON();

				if (
					(Array.isArray(eagerValue) && eagerValue.length) ||
					Object.keys(eagerValue).length
				) {
					output[name] = eagerValue;
				}
			}
		}

		return output;
	}

	/**
	 * Update the properties for this node
	 *
	 * @param properties  New properties
	 */
	public async update(properties: Partial<T>): Promise<this> {
		// TODO: Temporary fix, add the properties to the properties map
		// Sorry, but it's easier than hacking the validator
		for (const property of this._model.properties.values()) {
			const name = property.name;

			if (property.required && !hasOwn(properties, name)) {
				// @ts-ignore
				properties[name] = this._properties.get(name);
			}
		}

		const updatedProperties = await UpdateNode(
			this._neode,
			this._model,
			this._identity,
			properties,
		);

		for (const [key, value] of Object.entries(updatedProperties)) {
			this._properties.set(key, value);
		}

		return this;
	}
}
