type PropertyType = string | number | boolean;

export type TemporalPropertyTypes =
	| "datetime"
	| "date"
	| "time"
	| "localdate"
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
	| "Point";

export type Direction =
	| "direction_in"
	| "direction_out"
	| "direction_both"
	| "in"
	| "out";

export interface BaseNodeProperties {
	primary?: boolean;
	required?: boolean;
	unique?: boolean;
	indexed?: boolean;
	hidden?: boolean;
	readonly?: boolean;
	default?: unknown;
}

export interface BaseNumberNodeProperties extends BaseNodeProperties {
	/**
	 * Minimum value of the number
	 */
	min: number;

	/**
	 * Maximum value of the number
	 */
	max: number;

	/**
	 * Is the number an integer
	 */
	integer: boolean;

	/**
	 * Can the number handle positive value
	 */
	positive: boolean;

	/**
	 * Can the number handle negative value
	 */
	negative: boolean;

	/**
	 * The number has to be a multiple of
	 */
	multiple: number;
}

export interface NumberNodeProperties extends BaseNumberNodeProperties {
	type: "number";
}

export interface IntNodeProperties extends BaseNumberNodeProperties {
	type: "int";
}

export interface IntegerNodeProperties extends BaseNumberNodeProperties {
	type: "integer";
}

export interface FloatNodeProperties extends BaseNumberNodeProperties {
	type: "float";

	/**
	 * Precision, decimal count
	 */
	precision: number;
}

export interface StringNodeProperties extends BaseNodeProperties {
	type: "string";

	regex:
		| RegExp
		| {
				pattern: RegExp;
				invert: boolean;
				name: string;
		  };

	/**
	 * Replace parts of the string
	 */
	replace: {
		/**
		 * RegExp pattern
		 */
		pattern: RegExp;

		/**
		 * What should replace the pattern
		 */
		replace: string;
	};

	/**
	 * Should the string be in a valid email format
	 */
	email:
		| boolean
		| {
				/**
				 * tld Domain whitelist (e.g ['com', 'fr'])
				 */
				tldWhitelist: string[];
		  };
}

export interface BaseRelationshipNodeProperties extends BaseNodeProperties {
	/**
	 * Neo4J Relationship name (e.g: ACTED_IN)
	 */
	relationship: string;

	/**
	 * Target model name
	 */
	target: string;

	/**
	 * Is the relation required to be fetch
	 */
	required?: boolean;

	/**
	 * Load the relation with the parent object
	 */
	eager?: boolean;

	/**
	 * Default value
	 */
	default?: unknown;

	/**
	 * Relationship direction
	 */
	direction: Direction;

	/**
	 * Behaviour when deleting the parent object
	 */
	cascade?: "detach" | "delete";

	/**
	 * Relationship attached properties
	 */
	properties?: {
		[index: string]: PropertyTypes;
	};
}

export interface RelationshipsNodeProperties
	extends BaseRelationshipNodeProperties {
	type: "relationships";
}

export interface RelationshipNodeProperties
	extends BaseRelationshipNodeProperties {
	type: "relationship";
}

export interface NodesNodeProperties extends BaseRelationshipNodeProperties {
	type: "nodes";
}

export interface NodeNodeProperties extends BaseRelationshipNodeProperties {
	type: "node";
}

export interface OtherNodeProperties extends BaseNodeProperties {
	type: PropertyTypes;
}

export type NodeProperty =
	| PropertyTypes
	| NumberNodeProperties
	| IntNodeProperties
	| IntegerNodeProperties
	| FloatNodeProperties
	| RelationshipNodeProperties
	| RelationshipsNodeProperties
	| NodeNodeProperties
	| NodesNodeProperties
	| StringNodeProperties
	| OtherNodeProperties;

export type NodePropertyObject =
	| NumberNodeProperties
	| IntNodeProperties
	| IntegerNodeProperties
	| FloatNodeProperties
	| RelationshipNodeProperties
	| RelationshipsNodeProperties
	| NodeNodeProperties
	| NodesNodeProperties
	| StringNodeProperties
	| OtherNodeProperties;

export type RelationshipLikePropertyObject =
	| RelationshipNodeProperties
	| RelationshipsNodeProperties
	| NodeNodeProperties
	| NodesNodeProperties;

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
