import type {
	GenericPropertyTypes,
	NodeProperty,
	NodePropertyObject,
	PropertyTypes,
} from "./types/schemaTypes.js";

/**
 *  Container holding information for a property.
 *
 * TODO: Schema validation to enforce correct data types
 * TODO: Dynamically add all possible schema options?
 */
export class Property {
	private readonly _name: string;
	private readonly _schema: NodePropertyObject;

	private readonly _primary?: boolean;
	private readonly _required?: boolean;
	private readonly _unique?: boolean;
	private readonly _indexed?: boolean;
	private readonly _hidden?: boolean;
	private readonly _readonly?: boolean;
	private readonly _default?: unknown;
	private readonly _exists?: boolean;
	private readonly _protected?: boolean;

	constructor(name: string, schemaOrString: NodeProperty) {
		const schema: NodePropertyObject =
			typeof schemaOrString === "string"
				? ({
						type: schemaOrString as GenericPropertyTypes,
					} satisfies NodePropertyObject)
				: schemaOrString;

		this._name = name;
		this._schema = schema;

		this._primary = schema.primary;
		this._required = schema.required;
		this._unique = schema.unique;
		this._indexed = schema.indexed;
		this._hidden = schema.hidden;
		this._readonly = schema.readonly;
		this._default = schema.default;
	}

	public get name(): string {
		return this._name;
	}

	public get type(): PropertyTypes {
		return this._schema.type;
	}

	public get primary(): boolean {
		return this._primary ?? false;
	}

	public get unique(): boolean {
		return this._unique ?? false;
	}

	public get exists(): boolean {
		return this._exists ?? false;
	}

	public get required(): boolean {
		return this._exists ?? this._required ?? false;
	}

	public get indexed(): boolean {
		return this._indexed ?? false;
	}

	public get protected(): boolean {
		return this._primary ?? this._protected ?? false;
	}

	public get hidden(): boolean {
		return this._hidden ?? false;
	}

	public get readonly(): boolean {
		return this._readonly ?? false;
	}

	public get shouldConvertToInteger(): boolean {
		return this.type === "int" || this.type === "integer";
	}
}
