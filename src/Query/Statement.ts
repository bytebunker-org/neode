import {
	type RelationshipDirectionEnum,
	RelationshipType,
} from "../RelationshipType.js";
import type { Match } from "./Match.js";
import type { Order } from "./Order.js";
import { Property } from "./Property.js";
import { Relationship } from "./Relationship.js";
import type { WhereStatement } from "./WhereStatement.js";

export class Statement<
	T extends Record<string, unknown> = Record<string, unknown>,
> {
	private readonly _prefix: string;
	private _pattern: (Match | Relationship)[] = [];
	private _where: WhereStatement[] = [];
	private _order: Order[] = [];
	private _detach_delete: any[] = [];
	private _delete: any[] = [];
	private _return: Return[] = [];
	private _set: Property[] = [];
	private _on_create_set: Property[] = [];
	private _on_match_set: Property[] = [];
	private _remove: string[] = [];

	private _limit?: number;
	private _skip?: number;

	constructor(prefix = "MATCH") {
		this._prefix = prefix;
	}

	public match(match: Match): this {
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

	public order(order: Order): this {
		this._order.push(order);

		return this;
	}

	public delete(...values) {
		this._delete = this._delete.concat(values);

		return this;
	}

	public detachDelete(...values) {
		this._detach_delete = this._detach_delete.concat(values);

		return this;
	}

	public return(...values: Return[]) {
		this._return = this._return.concat(values);

		return this;
	}

	public relationship<T extends Record<string, unknown>>(
		relationship: RelationshipType<T> | string,
		direction: RelationshipDirectionEnum,
		alias: string,
		degrees: number,
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

	public set(key: string, valueParam: string, operator = "="): this {
		this._set.push(new Property(key, valueParam, operator));

		return this;
	}

	public setRaw(items: Property[]): this {
		this._set = this._set.concat(items);

		return this;
	}

	public onCreateSet(key: string, valueParam: string, operator = "="): this {
		this._on_create_set.push(new Property(key, valueParam, operator));

		return this;
	}

	public onMatchSet(key: string, valueParam: string, operator = "="): this {
		this._on_match_set.push(new Property(key, valueParam, operator));

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
