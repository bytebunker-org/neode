import Joi from "joi";
import neo4j from "neo4j-driver";
import { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import { Node } from "../Node.js";
import { DEFAULT_ALIAS, RelationshipType } from "../RelationshipType.js";
import type { NodePropertyObject, SchemaObject } from "../types.js";
import { ValidationError } from "../util/ValidationError.js";

const joi_options = {
	allowUnknown: true,
	abortEarly: false,
};

// TODO: Move these to constants and validate the model schemas a bit better
const ignore = [
	"labels",
	"type",
	"default",
	"alias",
	"properties",
	"primary",
	"relationship",
	"target",
	"direction",
	"eager",
	"hidden",
	"readonly",
	"index",
	"unique",
	"cascade",
] as const;
const isIgnoredKey = (key: string): key is (typeof ignore)[number] =>
	ignore.includes(key as (typeof ignore)[number]);
const booleans = [
	"optional",
	"forbidden",
	"strip",
	"positive",
	"negative",
	"port",
	"integer",
	"iso",
	"isoDate",
	"insensitive",
	"required",
	"truncate",
	"creditCard",
	"alphanum",
	"token",
	"hex",
	"hostname",
	"lowercase",
	"uppercase",
] as const;
const isBooleanOption = (option: string): option is (typeof booleans)[number] =>
	booleans.includes(option as (typeof booleans)[number]);
const booleanOrOptions = ["email", "ip", "uri", "base64", "normalize", "hex"];
const isBooleanOrOption = (
	option: string,
): option is (typeof booleanOrOptions)[number] =>
	booleanOrOptions.includes(option as (typeof booleanOrOptions)[number]);

const temporal = Joi.extend((joi) => ({
	type: "temporal",
	base: joi.object(),
	messages: {
		"temporal.before": "Value before minimum expected value",
		"temporal.after": "Value after minimum expected value",
	},
	rules: {
		after: {
			method(after: Date) {
				return this.$_addRule({ name: "after", args: { after } });
			},
			validate(value, helpers, args) {
				let { after } = args;

				// if 'after' is "now", convert to current Date
				if (after === "now") {
					after = new Date();
				}

				// Compare as Date objects
				if (new Date(value.toString()) < new Date(after)) {
					// Return custom error
					return helpers.error("temporal.after", { v: value });
				}

				// Return the original value if it passes
				return value;
			},
		},
		before: {
			method(after: Date) {
				return this.$_addRule({ name: "before", args: { after } });
			},
			validate(value, helpers, args) {
				let { after } = args;

				// if 'after' is "now", convert to current Date
				if (after === "now") {
					after = new Date();
				}

				if (new Date(value.toString()) > new Date(after)) {
					return helpers.error("temporal.before", { v: value });
				}

				return value;
			},
		},
	},
}));

const neoInteger = Joi.extend((joi) => ({
	type: "neoInteger",
	base: joi.alternatives().try(
		joi.number().integer(),
		joi
			.object()
			// biome-ignore lint/complexity/noBannedTypes:
			.instance(neo4j.types.Integer as unknown as Function),
	),
	messages: {
		"neoInteger.min":
			"Value before minimum expected value (must be >= {{#limit}}).",
		"neoInteger.max":
			"Value after maximum expected value (must be <= {{#limit}}).",
		"neoInteger.multiple": "Value is not a multiple of {{#multiple}}.",
	},
	rules: {
		min: {
			method(min: number) {
				return this.$_addRule({ name: "min", args: { min } });
			},
			validate(value, helpers, args) {
				const compare =
					value instanceof neo4j.types.Integer
						? value.toNumber()
						: value;
				if (compare < args["min"]) {
					return helpers.error("neoInteger.min", {
						limit: args["min"],
					});
				}
				return value; // Valid
			},
		},
		max: {
			method(max: number) {
				return this.$_addRule({ name: "max", args: { max } });
			},
			validate(value, helpers, args) {
				const compare =
					value instanceof neo4j.types.Integer
						? value.toNumber()
						: value;
				if (compare > args["max"]) {
					return helpers.error("neoInteger.max", {
						limit: args["max"],
					});
				}
				return value; // Valid
			},
		},
		multiple: {
			method(multiple: number) {
				return this.$_addRule({ name: "multiple", args: { multiple } });
			},
			validate(value, helpers, args) {
				const compare =
					value instanceof neo4j.types.Integer
						? value.toNumber()
						: value;
				if (compare % args["multiple"] !== 0) {
					return helpers.error("neoInteger.multiple", {
						multiple: args["multiple"],
					});
				}
				return value; // Valid
			},
		},
	},
}));

// Usage example:
// const schema = neoInteger.neoInteger().min(1).max(100).multiple(5);

const point = Joi.extend((joi) => ({
	type: "point",
	base: joi.object().instance(neo4j.types.Point),
}));

function nodeSchema() {
	return Joi.alternatives().try(
		Joi.object().instance(Node),
		Joi.string(),
		Joi.number(),
		Joi.object(),
	);
}

function relationshipSchema(alias: string, properties = {}) {
	return Joi.object().keys(
		Object.assign(
			{},
			{
				[alias]: nodeSchema().required(),
			},
			BuildValidationSchema(properties),
		),
	);
}

function BuildValidationSchema<T extends Record<string, unknown>>(
	schemaOrObject: SchemaObject | Model<T> | RelationshipType<T>,
): Joi.ObjectSchema {
	let schema: SchemaObject;
	if (
		schemaOrObject instanceof Model ||
		schemaOrObject instanceof RelationshipType
	) {
		schema = schemaOrObject.schema;
	} else {
		schema = schemaOrObject;
	}

	const objectSchema: Joi.SchemaMap = {};

	for (const [key, value] of Object.entries(schema)) {
		// Ignore Labels
		if (key === "labels") {
			continue;
		}

		const nodeProperty =
			typeof value === "string"
				? ({ type: schema[key] } as NodePropertyObject)
				: (value as NodePropertyObject);

		let validation: Joi.Schema;

		if (nodeProperty.type === "node") {
			validation = nodeSchema();
		} else if (nodeProperty.type === "nodes") {
			validation = Joi.array().items(nodeSchema());
		} else if (nodeProperty.type === "relationship") {
			validation = relationshipSchema(
				nodeProperty.alias ?? DEFAULT_ALIAS,
				nodeProperty.properties,
			);
		} else if (nodeProperty.type === "relationships") {
			validation = Joi.array().items(
				relationshipSchema(
					nodeProperty.alias ?? DEFAULT_ALIAS,
					nodeProperty.properties,
				),
			);
		} else if (nodeProperty.type === "uuid") {
			validation = Joi.string().guid({ version: "uuidv4" });
		} else if (nodeProperty.type === "string") {
			let stringSchema = Joi.string();

			if (nodeProperty.regex) {
				if (nodeProperty.regex instanceof RegExp) {
					stringSchema = stringSchema.pattern(nodeProperty.regex);
				} else {
					stringSchema = stringSchema.pattern(
						nodeProperty.regex.pattern,
						nodeProperty.regex,
					);
				}
			}

			if (nodeProperty.replace) {
				stringSchema = stringSchema.replace(
					nodeProperty.replace.pattern,
					nodeProperty.replace.replacement,
				);
			}

			validation = stringSchema;
		} else if (
			nodeProperty.type === "number" ||
			nodeProperty.type === "boolean"
		) {
			validation = Joi[nodeProperty.type]();
		} else if (
			nodeProperty.type === "int" ||
			nodeProperty.type === "integer"
		) {
			validation = neoInteger.integer();
		} else if (nodeProperty.type === "float") {
			validation = Joi.number();
		} else if (nodeProperty.type === "datetime") {
			validation = temporal.temporal().type(neo4j.types.DateTime);
		} else if (nodeProperty.type === "date") {
			validation = temporal.temporal().type(neo4j.types.Date);
		} else if (nodeProperty.type === "time") {
			validation = temporal.temporal().type(neo4j.types.Time);
		} else if (nodeProperty.type === "localdatetime") {
			validation = temporal.temporal().type(neo4j.types.LocalDateTime);
		} else if (nodeProperty.type === "localtime") {
			validation = temporal.temporal().type(neo4j.types.LocalTime);
		} else if (nodeProperty.type === "point") {
			validation = point.point().type(neo4j.types.Point);
		} else {
			validation = Joi.any();
		}

		if (!nodeProperty.required) {
			validation = validation.allow(null);
		}

		// Apply additional Validation
		for (const [validator, options] of Object.entries(nodeProperty)) {
			if (isBooleanOrOption(validator)) {
				if (typeof options === "object") {
					// @ts-ignore
					validation = validation[validator](options);
				} else if (options) {
					// @ts-ignore
					validation = validation[validator]();
				}
			}
			if (isBooleanOption(validator)) {
				if (options === true) {
					// @ts-ignore
					validation = validation[validator](options);
				}
			} else if (
				!isIgnoredKey(validator) &&
				// @ts-ignore
				validation[validator]
			) {
				// @ts-ignore
				validation = validation[validator](options);
			} else if (
				!isIgnoredKey(validator) &&
				// @ts-ignore
				!validation[validator]
			) {
				throw new Error(
					`Not sure how to validate ${validator} on ${key}`,
				);
			}
		}

		objectSchema[key] = validation;
	}

	return Joi.object(objectSchema);
}

/**
 * Run Validation
 *
 * TODO: Recursive Validation
 * TODO: Cache validation schemas?
 */
export async function Validator<T extends Record<string, unknown>>(
	neode: Neode,
	model: Model<T> | RelationshipType<T>,
	properties: T,
): Promise<T> {
	const schema = BuildValidationSchema(model);

	try {
		return await schema.validateAsync(properties, {
			abortEarly: false,
			allowUnknown: true,
		});
	} catch (error) {
		// `err` is a Joi.ValidationError
		if (error instanceof Joi.ValidationError) {
			const formattedErrors = error.details
				.map(
					(detail) =>
						`Field "${detail.path.join(".")}" failed: ${detail.message}`,
				)
				.join("; ");

			throw new ValidationError(formattedErrors, properties, error);
		} else {
			throw new ValidationError(
				// @ts-ignore
				error.message ?? "Unknown validation error",
				properties,
			);
		}
	}
}
