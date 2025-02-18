import type { PointObject } from "./generalTypes.js";
import type {
	BaseNodeProperties,
	BaseRelationshipNodeProperties,
	NodeProperty,
	PropertyTypes,
	SchemaObject,
} from "./schemaTypes.js";

interface TypeMap {
	string: string;
	uuid: string;
	number: number;
	int: number;
	integer: number;
	float: number;
	boolean: boolean;
	point: PointObject;
	date: Date;
	datetime: Date;
	time: Date;
	localdatetime: Date;
	localtime: Date;
	duration: Date;

	node: Record<string, unknown>;
	nodes: Record<string, unknown>[];
	relationship: Record<string, unknown>;
	relationships: Record<string, unknown>[];
}

/**
 * Utility that makes the property strictly T if `required` is `true`;
 * otherwise T | null | undefined.
 */
type MakeOptional<T, P extends NodeProperty> = P extends object
	? P["required"] extends true
		? T
		: T | undefined
	: T | undefined;

type InferRelationshipNodeType<P extends BaseRelationshipNodeProperties> =
	P extends {
		properties: {
			[index: string]: NodeProperty;
		};
	}
		? P["type"] extends "node" | "relationship"
			? InferGraphEntityType<P["properties"]>
			: InferGraphEntityType<P["properties"]>[]
		: Record<string, unknown>;

/**
 * Extracts the .type field from the NodeProperty, then looks it up in TypeMap.
 * If the property is a node or relation, use InferRelationshipNodeType.
 * Falls back to unknown if it’s not found.
 */
type MappedPropertyType<P extends NodeProperty> = P extends {
	type: keyof TypeMap;
}
	? TypeMap[P["type"]]
	: P extends BaseRelationshipNodeProperties
		? InferRelationshipNodeType<P>
		: unknown;

/**
 * Builds the final TypeScript property type by combining
 * the “mapped type” with the “required or optional” logic.
 */
export type InferPropertyType<P extends NodeProperty> = P extends PropertyTypes
	? MappedPropertyType<P> | undefined
	: P extends BaseNodeProperties<unknown>
		? MakeOptional<MappedPropertyType<P>, P>
		: never;

/**
 * Walks over each key in S, inferring the correct TypeScript type
 * if the value is a NodeProperty object. If you also have fields
 * like `labels?: string[]`, you can handle them specially or leave them as-is.
 */
export type InferGraphEntityType<S extends SchemaObject> = {
	[K in keyof S]: S[K] extends NodeProperty ? InferPropertyType<S[K]> : S[K];
} & {
	labels?: string;
} & Record<string, unknown>;
