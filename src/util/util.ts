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
