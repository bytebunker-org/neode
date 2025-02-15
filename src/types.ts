import type Joi from "joi";
import type {
	RelationshipCascadePolicyEnum,
	RelationshipDirectionEnum,
} from "./RelationshipType.js";

type PropertyType = string | number | boolean;

export type TemporalPropertyTypes =
	| "datetime"
	| "date"
	| "time"
	| "localdatetime"
	| "localtime"
	| "duration";
export type NumberPropertyTypes = "number" | "int" | "integer" | "float";
export type RelationshipPropertyTypes = "relationship" | "relationships";
export type NodesPropertyTypes = "node" | "nodes";
export type StringPropertyTypes = "string" | "uuid";
export type PropertyTypes =
	| TemporalPropertyTypes
	| NumberPropertyTypes
	| RelationshipPropertyTypes
	| StringPropertyTypes
	| NodesPropertyTypes
	| "boolean"
	| "point";

export type GenericPropertyTypes =
	| TemporalPropertyTypes
	| "uuid"
	| "boolean"
	| "point";

export interface BaseNodeProperties<T, S extends Joi.Schema = Joi.Schema> {
	primary?: boolean;
	required?: boolean;
	unique?: boolean;
	indexed?: boolean;
	hidden?: boolean;
	readonly?: boolean;

	/**
	 * Default value
	 */
	default?: T | (() => T);

	/**
	 * Extend the joi validation schema
	 */
	extendSchema?: (schema: S) => S;
}

export interface BaseNumberNodeProperties
	extends BaseNodeProperties<number, Joi.NumberSchema> {
	/**
	 * Minimum value of the number
	 */
	min?: number;

	/**
	 * Maximum value of the number
	 */
	max?: number;

	/**
	 * Is the number an integer
	 */
	integer?: boolean;

	/**
	 * Can the number handle positive value
	 */
	positive?: boolean;

	/**
	 * Can the number handle negative value
	 */
	negative?: boolean;

	/**
	 * The number has to be a multiple of
	 */
	multiple?: number;
}

export interface NumberNodeProperties extends BaseNumberNodeProperties {
	type: "number" | "int" | "integer";
}

export interface FloatNodeProperties extends BaseNumberNodeProperties {
	type: "float";

	/**
	 * Precision, decimal count
	 */
	precision?: number;
}

export interface StringNodeProperties
	extends BaseNodeProperties<string, Joi.StringSchema> {
	type: "string";

	/**
	 * @deprecated use {@link BaseNodeProperties.extendSchema}
	 */
	regex?:
		| RegExp
		| {
				pattern: RegExp;
				invert?: boolean;
				name?: string;
		  };

	/**
	 * Replace parts of the string
	 *
	 * @deprecated use {@link BaseNodeProperties.extendSchema}
	 */
	replace?: {
		/**
		 * RegExp pattern
		 */
		pattern: RegExp;

		/**
		 * What should replace the pattern
		 */
		replacement: string;
	};

	/**
	 * Should the string be in a valid email format
	 *
	 * @deprecated use {@link BaseNodeProperties.extendSchema}
	 */
	email?:
		| boolean
		| {
				/**
				 * tld Domain whitelist (e.g ['com', 'fr'])
				 */
				tldWhitelist: string[];
		  };
}

export interface BaseRelationshipNodeProperties
	extends BaseNodeProperties<unknown> {
	/**
	 * Neo4J Relationship name (e.g: ACTED_IN)
	 */
	relationship: string;

	/**
	 * Target model name
	 */
	target: string;

	alias?: string;

	/**
	 * Is the relation required to be fetch
	 */
	required?: boolean;

	/**
	 * Load the relation with the parent object
	 */
	eager?: boolean;

	/**
	 * Relationship direction
	 */
	direction: RelationshipDirectionEnum;

	/**
	 * Behaviour when deleting the parent object
	 */
	cascade?: boolean | RelationshipCascadePolicyEnum;

	/**
	 * Relationship attached properties
	 */
	properties?: {
		[index: string]: PropertyTypes;
	};
}

export interface RelationshipNodeProperties
	extends BaseRelationshipNodeProperties {
	type: "relationship" | "relationships";
}

export interface NodeNodeProperties extends BaseRelationshipNodeProperties {
	type: "node" | "nodes";
}

export interface OtherNodeProperties extends BaseNodeProperties<unknown> {
	type: GenericPropertyTypes;
}

export type NodeProperty =
	| PropertyTypes
	| NumberNodeProperties
	| FloatNodeProperties
	| RelationshipNodeProperties
	| NodeNodeProperties
	| StringNodeProperties
	| OtherNodeProperties;

export type NodePropertyObject =
	| NumberNodeProperties
	| FloatNodeProperties
	| RelationshipNodeProperties
	| NodeNodeProperties
	| StringNodeProperties
	| OtherNodeProperties;

export type RelationshipLikePropertyObject =
	| RelationshipNodeProperties
	| NodeNodeProperties;

export type SchemaObject = {
	labels?: string[];
} & {
	[index: string]: NodeProperty;
};

export type RelationshipSchema = {
	[index: string]: BaseRelationshipNodeProperties;
};

export type Query = string | { text: string; parameters?: QueryParams };

export type QueryParams = Record<string, unknown>;

export type EntityPropertyMap<T extends Record<string, unknown>> =
	T extends Record<infer K, infer V> ? Map<K, V> : never;

export type SerializedGraph = Record<string, unknown> & {
	_id: number;
	_labels?: string[];
	type?: string;
};
