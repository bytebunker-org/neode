import type { Integer } from "neo4j-driver";
import { Entity } from "./Entity.js";
import type { Neode } from "./Neode.js";
import type { Node } from "./Node.js";
import {
	RelationshipDirectionEnum,
	type RelationshipType,
} from "./RelationshipType.js";
import { DeleteRelationship } from "./Services/DeleteRelationship.js";
import { UpdateRelationship } from "./Services/UpdateRelationship.js";
import type {
	EntityPropertyMap,
	Integerable,
	SerializedGraph,
} from "./types.js";
import { hasOwn, toJSInteger, toNeo4jInteger } from "./util/util.js";

export class Relationship<
	T extends Record<string, unknown>,
	S extends Record<string, unknown>,
	E extends Record<string, unknown>,
> extends Entity<T> {
	private readonly _neode: Neode;
	private readonly _definition: RelationshipType<T>;
	private readonly _identity: string;
	private readonly _type: string;
	private readonly _properties: EntityPropertyMap<T>;
	private readonly _start: Node<S>;
	private readonly _end: Node<E>;
	private readonly _nodeAlias?: string;
	private _deleted = false;

	/**
	 *
	 * @param neode Neode instance
	 * @param definition Relationship type definition
	 * @param identity Internal Neo4j Element ID
	 * @param type Relationship type
	 * @param properties Map of properties for the relationship
	 * @param start Start Node
	 * @param end End Node
	 * @param nodeAlias Alias given to the Node when converting to JSON
	 */
	constructor(
		neode: Neode,
		definition: RelationshipType<T>,
		identity: string,
		type: string,
		properties: EntityPropertyMap<T> | undefined,
		start: Node<S>,
		end: Node<E>,
		nodeAlias?: string,
	) {
		super();

		this._neode = neode;
		this._definition = definition;
		this._identity = identity;
		this._type = type;
		this._properties = properties ?? (new Map() as EntityPropertyMap<T>);
		this._start = start;
		this._end = end;
		this._nodeAlias = nodeAlias;
	}

	/**
	 * Get the definition for this relationship
	 */
	public get definition(): RelationshipType<T> {
		return this._definition;
	}

	/**
	 * Get the relationship type
	 */
	public get type(): string {
		return this._type;
	}

	/**
	 * Get Internal Relationship Element ID
	 */
	public override get id(): string {
		return this._identity;
	}

	public override get model(): RelationshipType<T> {
		return this.definition;
	}

	protected override get internalProperties(): EntityPropertyMap<T> {
		return this._properties;
	}

	protected override get internalEagerProperties(): undefined {
		return undefined;
	}

	/**
	 * Get the start node for this relationship
	 */
	public get startNode(): Node<S> {
		return this._start;
	}

	/**
	 * Get the start node for this relationship
	 */
	public get endNode(): Node<E> {
		return this._end;
	}

	/**
	 * Get the node on the opposite end of the Relationship to the subject
	 * (ie if direction is in, get the end node, otherwise get the start node)
	 */
	public get otherNode(): Node<S> | Node<E> {
		return this._definition.direction === RelationshipDirectionEnum.IN
			? this.startNode
			: this.endNode;
	}

	/**
	 * Convert Relationship to a JSON friendly Object
	 */
	public override toJSON(): SerializedGraph {
		const output: SerializedGraph = {
			_id: this.id,
			_type: this.type,
		};

		const definition = this.definition;

		// Properties
		for (const [key, property] of definition.properties.entries()) {
			if (property.hidden) {
				continue;
			}

			if (this._properties.has(key)) {
				output[key] = this.valueToJson(
					property,
					this._properties.get(key),
				);
			}
		}

		// Get Other Node
		output[definition.nodeAlias] = this.otherNode.toJSON();

		return output;
	}

	/**
	 * Update the properties for this relationship
	 *
	 * @param properties New properties
	 */
	public async update(properties: Partial<T>): Promise<this> {
		// TODO: Temporary fix, add the properties to the properties map
		// Sorry, but it's easier than hacking the validator
		for (const property of this._definition.properties.values()) {
			const name = property.name;

			if (property.required && !hasOwn(properties, name)) {
				// @ts-ignore
				properties[name] = this._properties.get(name);
			}
		}

		const updatedProperties = await UpdateRelationship(
			this._neode,
			this._definition,
			this._identity,
			properties,
		);

		for (const [key, value] of Object.entries(updatedProperties)) {
			this._properties.set(key, value);
		}

		return this;
	}

	/**
	 * Delete this relationship from the Graph
	 */
	public async delete(): Promise<this> {
		await DeleteRelationship(this._neode, this.id);
		this._deleted = true;

		return this;
	}
}
