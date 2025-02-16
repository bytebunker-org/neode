/* eslint indent: 0 */
import neo4j, { type Integer } from "neo4j-driver";
import type { Model } from "./Model.js";
import type { Node } from "./Node.js";
import type { NodeCollection } from "./NodeCollection.js";
import type { Property } from "./Property.js";
import type { Relationship } from "./Relationship.js";
import type { RelationshipCollection } from "./RelationshipCollection.js";
import type { RelationshipType } from "./RelationshipType.js";
import type { EntityPropertyMap } from "./types.js";

export type EagerObject<O extends Record<string, unknown>> =
	| Node<O>
	| NodeCollection<O>
	| Relationship<O, Record<string, unknown>, Record<string, unknown>>
	| RelationshipCollection<
			O,
			Record<string, unknown>,
			Record<string, unknown>
	  >;

export type EagerMap<T extends Record<string, unknown>> = Map<
	keyof T & string,
	EagerObject<Record<string, unknown>>
>;

/**
 * Convert a raw property into a JSON friendly format
 */
export function valueToJson(property: Property, value: unknown) {
	if (neo4j.isInt(value)) {
		return value.toNumber();
	} else if (
		value &&
		typeof value === "object" &&
		(neo4j.temporal.isDate(value) ||
			neo4j.temporal.isDateTime(value) ||
			neo4j.temporal.isTime(value) ||
			neo4j.temporal.isLocalDateTime(value) ||
			neo4j.temporal.isLocalTime(value) ||
			neo4j.temporal.isDuration(value))
	) {
		return value.toString();
	} else if (neo4j.spatial.isPoint(value)) {
		switch (value.srid.toString()) {
			// SRID values: @https://neo4j.com/docs/developer-manual/current/cypher/functions/spatial/
			case "4326": // WGS 84 2D
				return { longitude: value.x, latitude: value.y };
			case "4979": // WGS 84 3D
				return {
					longitude: value.x,
					latitude: value.y,
					height: value.z,
				};
			case "7203": // Cartesian 2D
				return { x: value.x, y: value.y };
			case "9157": // Cartesian 3D
				return { x: value.x, y: value.y, z: value.z };
		}
	}

	return value;
}

/**
 * Convert a property into a cypher value
 */
export function valueToCypher(property: Property, value: unknown): unknown {
	if (property.shouldConvertToInteger && value && typeof value === "number") {
		return neo4j.int(value);
	}

	return value;
}

export abstract class Entity<T extends Record<string, unknown>> {
	/**
	 * Get Internal Node ID
	 */
	public abstract get id(): number;

	/**
	 * Return internal ID as a Neo4j Integer
	 */
	public abstract get identity(): Integer;

	/**
	 * Get the Model or RelationshipType for this Entity
	 */
	public abstract get model(): Model<T> | RelationshipType<T>;

	protected abstract get internalProperties(): EntityPropertyMap<T>;

	protected abstract get internalEagerProperties(): EagerMap<T> | undefined;

	/**
	 * Return the Node's properties as an Object
	 *
	 * @return {Object}
	 */
	public properties(): T {
		const output = {} as T;

		const propertyIterator = this.model.properties.entries() as MapIterator<
			[keyof T & string, Property]
		>;
		for (const [key, property] of propertyIterator) {
			if (!property.hidden && this.internalProperties.has(key)) {
				// @ts-ignore
				output[key] = valueToJson(
					property,
					this.internalProperties.get(key),
				);
			}
		}

		return output;
	}

	/**
	 * Get a property for this node
	 *
	 * @param property Name of property
	 */
	get<K extends keyof T & string>(property: K): T[K] | undefined;
	/**
	 * Get a property for this node
	 *
	 * @param property Name of property
	 * @param fallback  Default value to supply if none exists
	 */
	get<K extends keyof T & string>(property: K, fallback: T[K]): T[K];
	get<K extends keyof T & string>(
		property: K,
		fallback?: T[K],
	): T[K] | undefined {
		// If property is set, return that
		if (this.internalProperties.has(property)) {
			return this.internalProperties.get(property) as T[K];
		}
		// If property has been set in eager, return that
		else if (this.internalEagerProperties?.has(property)) {
			return this.internalEagerProperties?.get(property) as T[K];
		}

		return fallback;
	}

	public abstract toJson(): Record<string, unknown>;

	/**
	 * Convert a raw property into a JSON friendly format
	 * TODO: Should this actually convert a property on this entity? Check the original code
	 */
	protected valueToJson(property: Property, value: unknown): unknown {
		return valueToJson(property, value);
	}
}
