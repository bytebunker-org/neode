import type { Model } from "./Model.js";
import { Property } from "./Property.js";
import type {
	NodeProperty,
	NodesPropertyTypes,
	RelationshipLikePropertyObject,
	RelationshipPropertyTypes,
} from "./types.js";

export enum RelationshipDirectionEnum {
	IN = "DIRECTION_IN",
	OUT = "DIRECTION_OUT",
	BOTH = "DIRECTION_BOTH",
}

export enum RelationshipCascadePolicyEnum {
	DETACH = "DETACH",
	DELETE = "DELETE",
}

export const DEFAULT_ALIAS = "node";

export class RelationshipType {
	private readonly _name: string;
	private readonly _type: NodesPropertyTypes | RelationshipPropertyTypes;
	private readonly _relationship: string;
	private _direction: RelationshipDirectionEnum;
	private readonly _target: string | Model<unknown> | undefined;
	private readonly _schema: Partial<RelationshipLikePropertyObject>;
	private readonly _eager: boolean;
	private readonly _cascade: boolean | RelationshipCascadePolicyEnum;
	private readonly _node_alias: string;
	private readonly _properties = new Map<string, Property>();

	/**
	 * @param name The name given to the relationship
	 * @param type Type of Relationship (relationship, relationships, node, nodes)
	 * @param relationship Internal Neo4j Relationship type (ie 'KNOWS')
	 * @param direction Direction of Node
	 * @param target Target type definition for the Relationship
	 * @param schema Relationship definition schema
	 * @param eager Should this relationship be eager loaded?
	 * @param cascade Cascade delete policy for this relationship
	 * @param node_alias Alias to give to the node in the pattern comprehension
	 */
	constructor(
		name: string,
		type: NodesPropertyTypes | RelationshipPropertyTypes,
		relationship: string,
		direction: RelationshipDirectionEnum,
		target: string | Model<unknown> | undefined,
		schema: Partial<RelationshipLikePropertyObject> = {},
		eager = false,
		cascade: boolean | RelationshipCascadePolicyEnum = false,
		node_alias = DEFAULT_ALIAS,
	) {
		this._name = name;
		this._type = type;
		this._relationship = relationship;
		this._direction = direction;

		this._target = target;
		this._schema = schema;

		this._eager = eager;
		this._cascade = cascade;
		this._node_alias = node_alias;

		for (const [key, value] of Object.entries(schema)) {
			this._properties.set(key, new Property(key, value as NodeProperty));
		}
	}

	/**
	 * Type
	 */
	public get type(): NodesPropertyTypes | RelationshipPropertyTypes {
		return this._type;
	}

	/**
	 * Get Internal Relationship Type
	 */
	public get relationship(): string {
		return this._relationship;
	}

	/**
	 * Name
	 */
	public get name(): string {
		return this._name;
	}

	/**
	 * Get Direction of Node
	 */
	public get direction(): RelationshipDirectionEnum {
		return this._direction;
	}

	/**
	 * Get the target node definition
	 */
	public get target(): string | Model<unknown> | undefined {
		return this._target;
	}

	/**
	 * Get Schema object
	 */
	public get schema(): Partial<RelationshipLikePropertyObject> {
		return this._schema;
	}

	/**
	 * Should this relationship be eagerly loaded?
	 */
	public get eager(): boolean {
		return this._eager;
	}

	/**
	 * Cascade policy for this relationship type
	 */
	public get cascade(): boolean | RelationshipCascadePolicyEnum {
		return this._cascade;
	}

	/**
	 * Get the alias given to the node
	 */
	public get nodeAlias(): string {
		return this._node_alias;
	}

	/**
	 * Set Direction of relationship
	 */
	public setDirection(
		direction: RelationshipDirectionEnum = RelationshipDirectionEnum.OUT,
	): this {
		this._direction = direction;

		return this;
	}

	/**
	 * Get Properties defined for this relationship
	 *
	 * @return Map
	 */
	properties() {
		return this._properties;
	}
}
