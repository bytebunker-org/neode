import {
	type RelationshipDirectionEnum,
	RelationshipType,
} from "../RelationshipType.js";
import type { IStatement } from "./IStatement.js";
import type { Match } from "./Match.js";
import type { Order } from "./Order.js";
import { Property } from "./Property.js";
import { Relationship } from "./Relationship.js";
import type { Return } from "./Return.js";
import type { WhereStatement } from "./WhereStatement.js";

export class Statement<
	T extends Record<string, unknown> = Record<string, unknown>,
> implements IStatement
{
	private readonly _prefix: string;
	private _pattern: (Match<T> | Relationship)[] = [];
	private _where: WhereStatement[] = [];
	private _order: Order<T>[] = [];
	private _detach_delete: string[] = [];
	private _delete: string[] = [];
	private _return: (Return | string)[] = [];
	private _set: Property<T>[] = [];
	private _on_create_set: Property<T>[] = [];
	private _on_match_set: Property<T>[] = [];
	private _remove: string[] = [];

	private _limit?: number;
	private _skip?: number;

	constructor(prefix = "MATCH") {
		this._prefix = prefix;
	}

	public match(match: Match<T>): this {
		this._pattern.push(match);

		return this;
	}

	public where(where: WhereStatement): this {
		this._where.push(where);

		return this;
	}

	public limit(limit: number): this {
		this._limit = limit;

		return this;
	}

	public skip(skip: number): this {
		this._skip = skip;

		return this;
	}

	public order(order: Order<T>): this {
		this._order.push(order);

		return this;
	}

	public delete(...values: string[]) {
		this._delete = this._delete.concat(values);

		return this;
	}

	public detachDelete(...values: string[]) {
		this._detach_delete = this._detach_delete.concat(values);

		return this;
	}

	public return(...values: (Return | string)[]) {
		this._return = this._return.concat(values);

		return this;
	}

	public relationship<
		T extends Record<string, unknown>,
		E extends Record<string, unknown>,
	>(
		relationship?: RelationshipType<T, E> | string,
		direction?: RelationshipDirectionEnum,
		alias?: string,
		degrees?: number | string,
	): this {
		if (relationship instanceof RelationshipType) {
			const rel = relationship;

			relationship = rel.relationship;
			direction = rel.direction;
		}

		this._pattern.push(
			new Relationship(relationship, direction, alias, degrees),
		);

		return this;
	}

	public set(
		key: keyof T & string,
		valueParam: string,
		operator = "=",
	): this {
		this._set.push(new Property<T>(key, valueParam, operator));

		return this;
	}

	public setRaw(items: Property<T>[]): this {
		this._set = this._set.concat(items);

		return this;
	}

	public onCreateSet(
		key: keyof T & string,
		valueParam: string,
		operator = "=",
	): this {
		this._on_create_set.push(new Property<T>(key, valueParam, operator));

		return this;
	}

	public onMatchSet(
		key: keyof T & string,
		valueParam: string,
		operator = "=",
	): this {
		this._on_match_set.push(new Property<T>(key, valueParam, operator));

		return this;
	}

	public remove(items: string[]): this {
		this._remove = this._remove.concat(items);

		return this;
	}

	public toString(includePrefix = true): string {
		const output = [];

		const appendStatements = (
			statements: { toString: () => string }[],
			prefix = "",
			join = "",
		) => {
			if (statements.length) {
				if (prefix) {
					output.push(prefix);
				}

				output.push(
					statements
						.map((statement) => statement.toString())
						.join(join),
				);
			}
		};

		appendStatements(this._pattern, includePrefix ? this._prefix : "");
		appendStatements(this._where);
		appendStatements(this._remove, "REMOVE", ", ");
		appendStatements(this._on_create_set, "ON CREATE SET", ", ");
		appendStatements(this._on_match_set, "ON MATCH SET", ", ");
		appendStatements(this._set, "SET", ", ");
		appendStatements(this._delete, "DELETE", "\n");
		appendStatements(this._detach_delete, "DETACH DELETE", "\n");
		appendStatements(this._return, "RETURN", "\n");
		appendStatements(this._order, "ORDER BY", "\n");

		if (this._skip) {
			output.push(`SKIP ${this._skip}`);
		}

		if (this._limit) {
			output.push(`LIMIT ${this._limit}`);
		}

		return output.join("\n");
	}
}
