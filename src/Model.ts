import type { Neode } from "./Neode.js";
import { Property } from "./Property.js";
import { Queryable } from "./Queryable.js";
import { DIRECTION_BOTH, type RelationshipType } from "./RelationshipType.js";
import type {
	BaseRelationshipNodeProperties,
	NodeProperty,
	PropertyTypes,
	RelationshipLikePropertyObject,
	SchemaObject,
} from "./types.js";

const RELATIONSHIP_TYPES: PropertyTypes[] = [
	"relationship",
	"relationships",
	"node",
	"nodes",
];

export class Model<T> extends Queryable<T> {
	private readonly _name: string;
	private readonly _schema: SchemaObject;

	private readonly _properties: Map<string, Property>;
	private readonly _relationships: Map<string, RelationshipType>;
	private readonly _labels: string[];
	private readonly _primary_key: string;
	private readonly _unique: string[];
	private readonly _indexed: string[];
	private readonly _hidden: string[];
	private readonly _readonly: string[];

	constructor(neode: Neode, name: string, schema: SchemaObject) {
		super(neode);

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
	 *
	 * @return {Object}
	 */
	public get schema() {
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
	 *
	 * @return {String}
	 */
	name() {
		return this._name;
	}

	/**
	 * Set Labels
	 *
	 * @param  {...String} labels
	 * @return {Model}
	 */
	setLabels(...labels) {
		this._labels = labels.sort();

		return this;
	}

	/**
	 * Get Labels
	 *
	 * @return {Array}
	 */
	labels() {
		return this._labels;
	}

	/**
	 * Add a property definition
	 *
	 * @param key Property name
	 * @param schema Schema object
	 */
	addProperty(key: string, schema: SchemaObject | PropertyTypes): this {
		const property = new Property(key, schema);

		this._properties.set(key, property);

		// Is this key the primary key?
		if (property.primary()) {
			this._primary_key = key;
		}

		// Is this property unique?
		if (property.unique() || property.primary()) {
			this._unique.push(key);
		}

		// Is this property indexed?
		if (property.indexed()) {
			this._indexed.push(key);
		}

		// Should this property be hidden during JSON conversion?
		if (property.hidden()) {
			this._hidden.push(key);
		}

		// Is this property only to be read and never written to DB (e.g. auto-generated UUIDs)?
		if (property.readonly()) {
			this._readonly.push(key);
		}

		return this;
	}

	/**
	 * Add a new relationship
	 *
	 * @param  {String} name                The name given to the relationship
	 * @param  {String} type                Type of Relationship
	 * @param  {String} direction           Direction of Node (Use constants DIRECTION_IN, DIRECTION_OUT, DIRECTION_BOTH)
	 * @param  {String|Model|null} target   Target type definition for the
	 * @param  {Object} schema              Property Schema
	 * @param  {Bool} eager                 Should this relationship be eager loaded?
	 * @param  {Bool|String} cascade        Cascade delete policy for this relationship
	 * @param  {String} node_alias          Alias to give to the node in the pattern comprehension
	 * @return {Relationship}
	 */
	relationship(
		name,
		type,
		relationship,
		direction = DIRECTION_BOTH,
		target,
		schema = {},
		eager = false,
		cascade = false,
		node_alias = "node",
	) {
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
					node_alias,
				),
			);
		}

		return this._relationships.get(name);
	}

	/**
	 * Get all defined Relationships  for this Model
	 *
	 * @return {Map}
	 */
	relationships() {
		return this._relationships;
	}

	/**
	 * Get relationships defined as Eager relationships
	 *
	 * @return {Array}
	 */
	eager() {
		return Array.from(this._relationships)
			.map(([key, value]) => {
				// eslint-disable-line  no-unused-vars
				return value._eager ? value : null;
			})
			.filter((a) => !!a);
	}

	/**
	 * Get the name of the primary key
	 *
	 * @return {String}
	 */
	primaryKey() {
		return this._primary_key;
	}

	/**
	 * Get array of hidden fields
	 *
	 * @return {String[]}
	 */
	hidden() {
		return this._hidden;
	}

	/**
	 * Get array of indexed fields
	 *
	 * @return {String[]}
	 */
	indexes() {
		return this._indexed;
	}

	/**
	 * Get defined merge fields
	 *
	 * @return {Array}
	 */
	mergeFields() {
		return this._unique.concat(this._indexed);
	}
}
