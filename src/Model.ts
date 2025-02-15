import type { Neode } from "./Neode.js";
import { Property } from "./Property.js";
import { Queryable } from "./Queryable.js";
import {
	type RelationshipCascadePolicyEnum,
	RelationshipDirectionEnum,
	RelationshipType,
} from "./RelationshipType.js";
import type {
	NodeProperty,
	NodesPropertyTypes,
	PropertyTypes,
	RelationshipLikePropertyObject,
	RelationshipPropertyTypes,
	SchemaObject,
} from "./types.js";

const RELATIONSHIP_TYPES: PropertyTypes[] = [
	"relationship",
	"relationships",
	"node",
	"nodes",
];

export class Model<T extends Record<string, unknown>> extends Queryable<T> {
	private readonly _name: string;
	private readonly _schema: SchemaObject;

	private readonly _properties: Map<string, Property>;
	private readonly _relationships: Map<
		string,
		RelationshipType<Record<string, unknown>>
	>;
	private _labels: string[];
	private _primary_key: string;
	private readonly _unique: string[];
	private readonly _indexed: string[];
	private readonly _hidden: string[];
	private readonly _readonly: string[];

	constructor(neode: Neode, name: string, schema: SchemaObject) {
		super(neode);

		this.setModel(this);

		this._name = name;
		this._schema = schema;

		this._properties = new Map();
		this._relationships = new Map();
		this._labels = [name];

		// Default Primary Key to {label}_id
		this._primary_key = `${name.toLowerCase()}_id`;

		this._unique = [];
		this._indexed = [];
		this._hidden = [];
		this._readonly = [];

		if (schema.labels) {
			this.setLabels(...schema.labels);
		}

		for (const [key, value] of Object.entries(schema)) {
			if (!["labels"].includes(key)) {
				const nodeProperty = value as NodeProperty;

				if (typeof nodeProperty === "string") {
					this.addProperty(key, nodeProperty);
				} else {
					if (
						nodeProperty.type &&
						RELATIONSHIP_TYPES.includes(nodeProperty.type)
					) {
						const relationProperty =
							nodeProperty as RelationshipLikePropertyObject;

						const {
							relationship,
							direction,
							target,
							properties,
							eager,
							cascade,
							alias,
						} = relationProperty;

						this.relationship(
							key,
							relationProperty.type,
							relationship,
							direction,
							target,
							properties,
							eager,
							cascade,
							alias,
						);
					} else {
						this.addProperty(key, nodeProperty);
					}
				}
			}
		}
	}

	/**
	 * Get Schema
	 */
	public get schema(): SchemaObject {
		return this._schema;
	}

	/**
	 * Get a map of Properties
	 */
	public get properties() {
		return this._properties;
	}

	/**
	 * Get Model name
	 */
	public get name(): string {
		return this._name;
	}

	/**
	 * Set Labels
	 */
	setLabels(...labels: string[]): this {
		this._labels = labels.sort();

		return this;
	}

	/**
	 * Get Labels
	 */
	public get labels(): string[] {
		return this._labels;
	}

	/**
	 * Add a property definition
	 *
	 * @param key Property name
	 * @param schema Schema object
	 */
	addProperty(key: string, schema: NodeProperty): this {
		const property = new Property(key, schema);

		this._properties.set(key, property);

		// Is this key the primary key?
		if (property.primary) {
			this._primary_key = key;
		}

		// Is this property unique?
		if (property.unique || property.primary) {
			this._unique.push(key);
		}

		// Is this property indexed?
		if (property.indexed) {
			this._indexed.push(key);
		}

		// Should this property be hidden during JSON conversion?
		if (property.hidden) {
			this._hidden.push(key);
		}

		// Is this property only to be read and never written to DB (e.g. auto-generated UUIDs)?
		if (property.readonly) {
			this._readonly.push(key);
		}

		return this;
	}

	/**
	 * Add a new relationship
	 *
	 * @param name The name given to the relationship
	 * @param type Type of Relationship
	 * @param relationship
	 * @param direction Direction of Node (Use constants DIRECTION_IN, DIRECTION_OUT, DIRECTION_BOTH)
	 * @param target Target type definition for the
	 * @param schema Property Schema
	 * @param eager Should this relationship be eager loaded?
	 * @param cascade Cascade delete policy for this relationship
	 * @param nodeAlias Alias to give to the node in the pattern comprehension
	 */
	public relationship<T extends Record<string, unknown>>(
		name: string,
		type: NodesPropertyTypes | RelationshipPropertyTypes,
		relationship: string,
		direction = RelationshipDirectionEnum.BOTH,
		target?: string | Model<T>,
		schema: SchemaObject = {},
		eager = false,
		cascade: boolean | RelationshipCascadePolicyEnum = false,
		nodeAlias = "node",
	): RelationshipType<Record<string, unknown>> | undefined {
		if (relationship && direction && schema) {
			this._relationships.set(
				name,
				new RelationshipType(
					name,
					type,
					relationship,
					direction,
					target,
					schema,
					eager,
					cascade,
					nodeAlias,
				),
			);
		}

		return this._relationships.get(name);
	}

	/**
	 * Get all defined Relationships  for this Model
	 */
	public get relationships(): Map<
		string,
		RelationshipType<Record<string, unknown>>
	> {
		return this._relationships;
	}

	/**
	 * Get relationships defined as Eager relationships
	 */
	public get eager(): RelationshipType<Record<string, unknown>>[] {
		return Array.from(this._relationships.values()).filter(
			(relationship) => relationship.eager,
		);
	}

	/**
	 * Get the name of the primary key
	 */
	public get primaryKey(): string {
		return this._primary_key;
	}

	/**
	 * Get array of hidden fields
	 *
	 * @return {String[]}
	 */
	public get hidden(): string[] {
		return this._hidden;
	}

	/**
	 * Get array of indexed fields
	 */
	public get indexes(): string[] {
		return this._indexed;
	}

	/**
	 * Get defined merge fields
	 */
	public get mergeFields(): string[] {
		return this._unique.concat(this._indexed);
	}
}
