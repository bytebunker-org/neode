import neo4j, { type Integer, type Point } from "neo4j-driver";
import type { PointObject } from "../types/generalTypes.js";
import type { NodePropertyObject } from "../types/schemaTypes.js";
import { hasOwn } from "../util/util.js";

const temporal = [
	"date",
	"datetime",
	"time",
	"localdatetime",
	"localtime",
] as const;
const isTemporalType = (type: string): type is (typeof temporal)[number] =>
	temporal.includes(type as (typeof temporal)[number]);

function parsePoint(
	value: PointObject | unknown,
): Point<number | Integer> | undefined {
	if (!value || typeof value !== "object") {
		return undefined;
	}

	// SRID values: @https://neo4j.com/docs/developer-manual/current/cypher/functions/spatial/
	if (
		(!hasOwn(value, "x") || Number.isNaN(value.x)) &&
		hasOwn(value, "latitude") &&
		hasOwn(value, "longitude") &&
		typeof value.latitude === "number" &&
		typeof value.longitude === "number"
	) {
		// WGS 84
		if (
			hasOwn(value, "height") &&
			typeof value.height === "number" &&
			!Number.isNaN(value.height)
		) {
			return new neo4j.types.Point(
				4979, // WGS 84 3D
				value.longitude,
				value.latitude,
				value.height,
			);
		} else {
			return new neo4j.types.Point(
				4326, // WGS 84 2D
				value.longitude,
				value.latitude,
			);
		}
	} else if (
		hasOwn(value, "x") &&
		hasOwn(value, "y") &&
		typeof value.x === "number" &&
		typeof value.y === "number" &&
		!Number.isNaN(value.x) &&
		!Number.isNaN(value.y)
	) {
		if (
			hasOwn(value, "z") &&
			typeof value.z === "number" &&
			!Number.isNaN(value.z)
		) {
			return new neo4j.types.Point(
				9157, // Cartesian 3D
				value.x,
				value.y,
				value.z,
			);
		} else {
			return new neo4j.types.Point(
				7203, // Cartesian 2D
				value.x,
				value.y,
			);
		}
	} else {
		throw new Error(`Invalid point value ${value}`);
	}
}

/**
 * Convert a value to its native type
 *
 * @param config Field Configuration
 * @param value Value to be converted
 */
export function CleanValue(
	config: NodePropertyObject,
	value: unknown,
): unknown {
	// Convert temporal to a native date?
	if (
		isTemporalType(config.type) &&
		(typeof value === "number" || typeof value === "string")
	) {
		value = new Date(value);
	}

	// Clean Values
	switch (config.type) {
		case "float":
			return Number.parseFloat(String(value));
		case "int":
		case "integer":
			// TODO: Does this make sense? Don't we loose the extra precision of the neo4j int type here?
			return neo4j.int(Number.parseInt(String(value)));
		case "boolean":
			return Boolean(!!value);
		case "date":
			return value instanceof Date
				? neo4j.types.Date.fromStandardDate(value)
				: value;
		case "datetime":
			return value instanceof Date
				? neo4j.types.DateTime.fromStandardDate(value)
				: value;

		case "localdatetime":
			return value instanceof Date
				? neo4j.types.LocalDateTime.fromStandardDate(value)
				: value;

		case "time":
			return value instanceof Date
				? neo4j.types.Time.fromStandardDate(value)
				: value;
		case "localtime":
			return value instanceof Date
				? neo4j.types.LocalTime.fromStandardDate(value)
				: value;
		case "point":
			return parsePoint(value);
		default:
			return value;
	}
}
