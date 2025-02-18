import type { Integer } from "neo4j-driver";

export type QueryParams = Record<string, unknown>;
export type Query = string | { text: string; parameters?: QueryParams };

export interface SerializedGraph {
	_id: string;
	_labels?: string[];
	type?: string;

	[x: string]: unknown;
}

export type Integerable =
	| number
	| string
	| Integer
	| {
			low: number;
			high: number;
	  }
	| bigint;

export type PointObject =
	| {
			x: number;
			y: number;
			z?: number;
	  }
	| {
			latitude: number;
			longitude: number;
			height?: number;
	  };
