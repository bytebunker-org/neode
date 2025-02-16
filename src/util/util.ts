import { Integer } from "neo4j-driver";
import type { Integerable } from "../types.js";

export function hasOwn<X, Y extends PropertyKey>(
	object: X,
	property: Y,
): object is NonNullable<X> & Record<Y, unknown> {
	return (
		object &&
		typeof object === "object" &&
		Object.prototype.hasOwnProperty.call(object, property)
	);
}

/**
 * Convert a neo4j integer like number to a Javascript integer/number.
 * Warning: Can be lossless!
 */
export function toJSInteger(value: Integerable): number {
	if (typeof value === "object") {
		if (Integer.isInteger(value)) {
			return value.toInt();
		} else {
			return Integer.fromBits(value.low, value.high).toInt();
		}
	} else if (typeof value === "string") {
		return Number.parseInt(value);
	} else {
		return Number(value);
	}
}

export function toNeo4jInteger(value: Integerable): Integer {
	if (typeof value === "object") {
		if (Integer.isInteger(value)) {
			return value;
		} else {
			return Integer.fromBits(value.low, value.high);
		}
	} else if (typeof value === "string") {
		return Integer.fromString(value);
	} else if (typeof value === "bigint") {
		return Integer.fromString(value.toString());
	} else {
		return Integer.fromInt(value);
	}
}
