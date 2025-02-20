import type { Result, Session } from "neo4j-driver";
import type { Model } from "../Model.js";
import type { Neode } from "../Neode.js";
import type {
	RelationshipDirectionEnum,
	RelationshipType,
} from "../RelationshipType.js";
import type { IStatement } from "./IStatement.js";
import { Match } from "./Match.js";
import { Order, type OrderDirectionEnum } from "./Order.js";
import { Property } from "./Property.js";
import type { Return } from "./Return.js";
import { Statement } from "./Statement.js";
import { Where } from "./Where.js";
import { WhereBetween } from "./WhereBetween.js";
import { WhereId } from "./WhereId.js";
import { WhereRaw } from "./WhereRaw.js";
import { OPERATOR_EQUALS, WhereStatement } from "./WhereStatement.js";
import { WithDistinctStatement } from "./WithDistinctStatement.js";
import { WithStatement } from "./WithStatement.js";

type WhereParams<T extends Record<string, unknown>> = T | string;
type FullWhereParams<T extends Record<string, unknown>> =
	| [WhereParams<T>]
	| [left: keyof T & string, value: unknown]
	| [left: keyof T & string, operator: string, value: unknown];
type FullInternalWhereArgs<T extends Record<string, unknown>> =
	| FullWhereParams<T>
	| [FullWhereParams<T>[]];

type OrderByParams<T extends Record<string, unknown>> =
	| [property: keyof T & string, order: OrderDirectionEnum]
	| [Record<keyof T & string, OrderDirectionEnum>];
type OrderByParamsOrArray<T extends Record<string, unknown>> =
	| OrderByParams<T>
	| [OrderByParams<T>[]];

export enum QueryMode {
	READ = "READ",
	WRITE = "WRITE",
}

export class Builder {
	private _params: Record<string, unknown> = {};
	private _statements: IStatement[] = [];
	private _current: Statement | undefined;
	private _where: WhereStatement | undefined;
	private _setCount = 0;

	constructor(private readonly _neode: Neode) {}

	private get current(): Statement {
		if (!this._current) {
			throw new Error(
				"You must add a statement before using other builder methods",
			);
		}

		return this._current;
	}

	/**
	 * Start a new Query segment and set the current statement
	 */
	statement(prefix?: string): this {
		if (this._current) {
			this._statements.push(this._current);
		}

		this._current = new Statement(prefix);

		return this;
	}

	/**
	 * Start a new Where Segment
	 */
	whereStatement(prefix = ""): this {
		if (this._where) {
			if (!this._current) {
				throw new Error(
					"You must add a statement before adding a where clause",
				);
			}

			this._current.where(this._where);
		}

		this._where = new WhereStatement(prefix);

		return this;
	}

	/**
	 * Match a Node by a definition
	 *
	 * @param alias Alias in query
	 * @param model Model definition
	 * @param properties Inline Properties
	 * @return Builder
	 */
	public match<T extends Record<string, unknown>>(
		alias?: string,
		model?: Model<T> | string,
		properties: Partial<T> = {},
	): this {
		this.whereStatement("WHERE");
		this.statement();

		const modelObj =
			typeof model === "string" ? this._neode.model<T>(model) : model;

		(this.current as Statement<T>).match(
			new Match(
				alias,
				modelObj,
				this._convertPropertyMap(alias, properties),
			),
		);

		return this;
	}

	public optionalMatch<T extends Record<string, unknown>>(
		alias: string,
		model?: Model<T> | string,
	): this {
		this.whereStatement("WHERE");
		this.statement("OPTIONAL MATCH");

		const modelObj =
			typeof model === "string" ? this._neode.model<T>(model) : model;

		(this.current as Statement<T>).match(new Match(alias, modelObj));

		return this;
	}

	/**
	 * Add a 'with' statement to the query
	 *
	 * @param args Variables/aliases to carry through
	 */
	public with(...args: string[]): this {
		this.whereStatement("WHERE");
		this.statement();

		this._statements.push(new WithStatement(...args));

		return this;
	}

	/**
	 * Add a 'with distinct' statement to the query
	 *
	 * @param  {...String} args Variables/aliases to carry through
	 * @return {Builder}
	 */
	public withDistinct(...args: string[]): this {
		this.whereStatement("WHERE");
		this.statement();

		this._statements.push(new WithDistinctStatement(...args));

		return this;
	}

	/**
	 * Add a where condition to the current statement.
	 *
	 * @param values Object with key/values to match or an array where all entries are passed to the where function
	 */
	or<T extends Record<string, unknown>>(
		values: FullWhereParams<T>[] | WhereParams<T>,
	): this;

	/**
	 * Add a where condition to the current statement.
	 * @param left the key to check
	 * @param value the expected value
	 */
	or<T extends Record<string, unknown>>(
		left: keyof T & string,
		value: unknown,
	): this;

	/**
	 * Add a where condition to the current statement.
	 * @param left the key to check
	 * @param operator the CypherQL operator for the statement
	 * @param value the expected value
	 */
	or<T extends Record<string, unknown>>(
		left: keyof T & string,
		operator: string,
		value: unknown,
	): this;
	or<T extends Record<string, unknown>>(
		...args: FullInternalWhereArgs<T>
	): this {
		this.whereStatement("OR");

		// @ts-ignore - internal API
		return this.where(...args);
	}

	/**
	 * Add a where condition to the current statement.
	 *
	 * @param values Object with key/values to match or an array where all entries are passed to the where function
	 */
	public where<T extends Record<string, unknown>>(
		values: FullWhereParams<T>[] | WhereParams<T>,
	): this;

	/**
	 * Add a where condition to the current statement.
	 * @param left the key to check
	 * @param value the expected value
	 */
	public where<T extends Record<string, unknown>>(
		left: keyof T & string,
		value: unknown,
	): this;

	/**
	 * Add a where condition to the current statement.
	 * @param left the key to check
	 * @param operator the CypherQL operator for the statement
	 * @param value the expected value
	 */
	public where<T extends Record<string, unknown>>(
		left: keyof T & string,
		operator: string,
		value: unknown,
	): this;

	public where<T extends Record<string, unknown>>(
		...args: FullInternalWhereArgs<T>
	): this {
		if (!this._where) {
			throw new Error(
				"You must add a where statement before adding a where clause",
			);
		}

		if (!args.length || !args[0]) {
			return this;
		}

		// If 2 character length, it should be straight forward where
		if (args.length === 2) {
			args = [args[0], OPERATOR_EQUALS, args[1]];
		}

		// If only one argument, treat it as a single string
		if (args.length === 1) {
			const [arg] = args;

			if (Array.isArray(arg)) {
				for (const inner of arg) {
					// @ts-ignore - internal API
					this.where(...(inner as FullWhereParams<T>));
				}
			} else if (typeof arg === "object") {
				for (const [key, value] of Object.entries(arg)) {
					this.where(key, value);
				}
			} else if (typeof arg === "string") {
				this._where?.append(new WhereRaw(arg));
			}
		} else {
			const [left, operator, value] = args;
			const right = this._addWhereParameter(left, value);

			this._params[right] = value;
			this._where.append(new Where(left, operator, `$${right}`));
		}

		return this;
	}

	/**
	 * Query on Internal Element ID
	 */
	public whereId(alias: string, value: string): this {
		if (!this._where) {
			throw new Error(
				"You must add a where statement before adding a where clause",
			);
		}

		const param = this._addWhereParameter(`${alias}_id`, value);

		this._where.append(new WhereId(alias, param));

		return this;
	}

	/**
	 * Add a raw where clause
	 */
	public whereRaw(clause: string): this {
		if (!this._where) {
			throw new Error(
				"You must add a where statement before adding a where clause",
			);
		}

		this._where.append(new WhereRaw(clause));

		return this;
	}

	/**
	 * A negative where clause
	 *
	 * @param values Object with key/values to match or an array where all entries are passed to the where function
	 */
	whereNot<T extends Record<string, unknown>>(
		values: FullWhereParams<T>[] | WhereParams<T>,
	): this;

	/**
	 * A negative where clause
	 *
	 * @param left the key to check
	 * @param value the expected value
	 */
	whereNot<T extends Record<string, unknown>>(
		left: keyof T & string,
		value: unknown,
	): this;

	/**
	 * A negative where clause
	 *
	 * @param left the key to check
	 * @param operator the CypherQL operator for the statement
	 * @param value the expected value
	 */
	whereNot<T extends Record<string, unknown>>(
		left: keyof T & string,
		operator: string,
		value: unknown,
	): this;
	whereNot<T extends Record<string, unknown>>(
		...args: FullInternalWhereArgs<T>
	): this {
		// @ts-ignore - internal API
		this.where(...args);

		this._where!.last.setNegative();

		return this;
	}

	/**
	 * Between clause
	 */
	public whereBetween(alias: string, floor: unknown, ceiling: unknown): this {
		if (!this._where) {
			throw new Error(
				"You must add a where statement before adding a where clause",
			);
		}

		const floorAlias = this._addWhereParameter(`${alias}_floor`, floor);
		const ceilingAlias = this._addWhereParameter(
			`${alias}_ceiling`,
			ceiling,
		);

		this._where.append(new WhereBetween(alias, floorAlias, ceilingAlias));

		return this;
	}

	/**
	 * Negative Between clause
	 */
	public whereNotBetween(
		alias: string,
		floor: unknown,
		ceiling: unknown,
	): this {
		this.whereBetween(alias, floor, ceiling);

		this._where!.last.setNegative();

		return this;
	}

	/**
	 * Set Delete fields
	 */
	public delete(...args: string[]): this {
		this.current.delete(...args);

		return this;
	}

	/**
	 * Set Detach Delete fields
	 */
	public detachDelete(...args: string[]): this {
		this.current.detachDelete(...args);

		return this;
	}

	/**
	 * Start a Create Statement by alias/definition
	 *
	 * @param alias Alias in query
	 * @param model Model definition
	 * @param properties Inline Properties
	 */
	public create<T extends Record<string, unknown>>(
		alias?: string,
		model?: Model<T> | string,
		properties: Partial<T> = {},
	): this {
		this.whereStatement("WHERE");
		this.statement("CREATE");

		const modelObj =
			typeof model === "string" ? this._neode.model<T>(model) : model;

		(this.current as Statement<T>).match(
			new Match(
				alias,
				modelObj,
				this._convertPropertyMap(alias, properties),
			),
		);

		return this;
	}

	/**
	 * Start a Merge Statement by alias/definition
	 *
	 * @param alias Alias in query
	 * @param model Model definition
	 * @param properties Inline Properties
	 */
	public merge<T extends Record<string, unknown>>(
		alias?: string,
		model?: Model<T> | string,
		properties: Partial<T> = {},
	): this {
		this.whereStatement("WHERE");
		this.statement("MERGE");

		const modelObj =
			typeof model === "string" ? this._neode.model<T>(model) : model;

		(this.current as Statement<T>).match(
			new Match(
				alias,
				modelObj,
				this._convertPropertyMap(alias, properties),
			),
		);

		return this;
	}

	/**
	 * Set multiple properties
	 *
	 * @param properties Array of {@link Property} objects to set
	 */
	public set<T extends Record<string, unknown> = Record<string, unknown>>(
		properties: Property<T>[],
	): this;

	/**
	 * Set multiple properties
	 *
	 * @param properties Object of properties to set
	 */
	public set<T extends Record<string, unknown> = Record<string, unknown>>(
		properties: Partial<T>,
	): this;

	/**
	 * Set a property
	 *
	 * @param property Property in {alias}.{property} format
	 * @param value Value
	 * @param operator Operator
	 */
	public set<T extends Record<string, unknown> = Record<string, unknown>>(
		property: keyof T & string,
		value: unknown,
		operator?: string,
	): this;

	public set<T extends Record<string, unknown> = Record<string, unknown>>(
		property: (keyof T & string) | Partial<T> | Property<T>[],
		value?: unknown,
		operator = "=",
	): this {
		// Support a map of properties
		if (!value && property && typeof property === "object") {
			for (const [key, value] of Object.entries(property)) {
				this.set(key, value);
			}
		} else {
			if (typeof property === "string" && value !== undefined) {
				const alias = `set_${this._setCount}`;
				this._params[alias] = value;

				this._setCount++;

				this.current.set(property, alias, operator);
			} else if (Array.isArray(property)) {
				(this.current as Statement<T>).setRaw(property);
			}
		}

		return this;
	}

	/**
	 * Set multiple properties on create
	 *
	 * @param properties Object of properties to set
	 */
	public onCreateSet<
		T extends Record<string, unknown> = Record<string, unknown>,
	>(properties: Partial<T>): this;

	/**
	 * Set a property on create
	 *
	 * @param property Property in {alias}.{property} format
	 * @param value Value
	 * @param operator Operator
	 */
	public onCreateSet<
		T extends Record<string, unknown> = Record<string, unknown>,
	>(property: keyof T & string, value: unknown, operator?: string): this;

	public onCreateSet<
		T extends Record<string, unknown> = Record<string, unknown>,
	>(
		property: (keyof T & string) | Partial<T>,
		value?: unknown,
		operator = "=",
	): this {
		// Support a map of properties
		if (value === undefined && property && typeof property === "object") {
			for (const [key, value] of Object.entries(property)) {
				this.onCreateSet(key, value);
			}
		} else if (typeof property === "string") {
			const alias = `set_${this._setCount}`;
			this._params[alias] = value;

			this._setCount++;

			this.current.onCreateSet(property, alias, operator);
		}

		return this;
	}

	/**
	 * Set multiple properties on match
	 *
	 * @param properties Object of properties to set
	 */
	public onMatchSet<
		T extends Record<string, unknown> = Record<string, unknown>,
	>(properties: Partial<T>): this;

	/**
	 * Set a property on match
	 *
	 * @param property Property in {alias}.{property} format
	 * @param value Value
	 * @param operator Operator
	 */
	public onMatchSet<
		T extends Record<string, unknown> = Record<string, unknown>,
	>(property: keyof T & string, value: unknown, operator?: string): this;

	public onMatchSet<
		T extends Record<string, unknown> = Record<string, unknown>,
	>(
		property: (keyof T & string) | Partial<T>,
		value?: unknown,
		operator = "=",
	): this {
		// Support a map of properties
		if (value === undefined && property && typeof property === "object") {
			for (const [key, value] of Object.entries(property)) {
				this.onMatchSet(key, value);
			}
		} else if (typeof property === "string") {
			const alias = `set_${this._setCount}`;
			this._params[alias] = value;

			this._setCount++;

			this.current.onMatchSet(property, alias, operator);
		}

		return this;
	}

	/**
	 * Remove properties or labels in {alias}.{property}
	 * or {alias}:{Label} format
	 */
	public remove(...items: string[]): this {
		this.current.remove(items);

		return this;
	}

	/**
	 * Set Return fields
	 */
	public return(...args: (Return | string)[]): this {
		this.current.return(...args);

		return this;
	}

	/**
	 * Set Record Limit
	 */
	public limit(limit: number): this {
		this.current.limit(limit);

		return this;
	}

	/**
	 * Set Records to Skip
	 */
	public skip(skip: number): this {
		this.current.skip(skip);

		return this;
	}

	/**
	 * Add an order by statement
	 *
	 * @param property Property to order by
	 * @param direction The order direction
	 */
	public orderBy<T extends Record<string, unknown> = Record<string, unknown>>(
		property: keyof T & string,
		direction: OrderDirectionEnum,
	): this;

	/**
	 * Add an order by statement
	 *
	 * @param properties Object of properties to order by
	 */
	public orderBy<T extends Record<string, unknown> = Record<string, unknown>>(
		properties: Record<keyof T & string, OrderDirectionEnum>,
	): this;

	/**
	 * Add an order by statement
	 *
	 * @param orderBy Array of order by statements
	 */
	public orderBy<T extends Record<string, unknown> = Record<string, unknown>>(
		orderBy: OrderByParams<T>[],
	): this;

	/**
	 * Add an order by statement
	 *
	 * @param args Order by statements
	 */
	public orderBy<T extends Record<string, unknown> = Record<string, unknown>>(
		...args: OrderByParamsOrArray<T>
	): this;

	public orderBy<T extends Record<string, unknown> = Record<string, unknown>>(
		...args: OrderByParamsOrArray<T>
	): this {
		let orderBy: Order<T> | undefined;

		if (args.length === 2) {
			// Assume orderBy(what, how)
			orderBy = new Order(args[0], args[1]);
		} else if (Array.isArray(args[0])) {
			// Handle array of where's
			for (const arg of args[0]) {
				// @ts-ignore - internal API
				this.orderBy(arg);
			}
		} else if (typeof args[0] === "object") {
			// Assume {key: order}
			for (const [key, order] of Object.entries(args[0])) {
				this.orderBy(key, order);
			}
		} else if (args[0]) {
			// Assume orderBy(what, 'ASC')
			orderBy = new Order(args[0]);
		}

		if (orderBy) {
			(this.current as Statement<T>).order(orderBy);
		}

		return this;
	}

	/**
	 * Add a relationship to the query
	 *
	 * @param relationship Relationship name or RelationshipType object
	 * @param direction Direction of relationship DIRECTION_IN, DIRECTION_OUT
	 * @param alias Relationship alias
	 * @param degrees Number of degrees (1, "1..2", "0..2", "..3")
	 */
	public relationship<
		T extends Record<string, unknown>,
		E extends Record<string, unknown>,
	>(
		relationship?: RelationshipType<T, E> | string,
		direction?: RelationshipDirectionEnum,
		alias?: string,
		degrees?: number | string,
	): this {
		this.current.relationship(relationship, direction, alias, degrees);

		return this;
	}

	/**
	 * Complete a relationship
	 * @param alias Alias
	 * @param model Model definition
	 * @param properties  Properties
	 */
	public to<T extends Record<string, unknown> = Record<string, unknown>>(
		alias?: string,
		model?: Model<T> | string,
		properties: Partial<T> = {},
	): this {
		const modelObj =
			typeof model === "string" ? this._neode.model<T>(model) : model;

		(this.current as Statement<T>).match(
			new Match(
				alias,
				modelObj,
				this._convertPropertyMap(alias, properties),
			),
		);

		return this;
	}

	/**
	 * Complete the relationship statement to point to anything
	 */
	public toAnything(): this {
		this.current.match(new Match());

		return this;
	}

	/**
	 * Build the pattern without any keywords
	 */
	public pattern(): string {
		this.whereStatement();
		this.statement();

		return this._statements
			.map((statement) => statement.toString(false))
			.join("\n");
	}

	// TODO: output parameters doesn't do anything?
	/**
	 * Build the Query
	 *
	 * @param output References to output
	 */
	public build(...output: string[]): {
		query: string;
		params: Record<string, unknown>;
	} {
		// Append Statement to Statements
		this.whereStatement();
		this.statement();

		const query = this._statements
			.map((statement) => statement.toString())
			.join("\n")
			.replace(/\n+/g, "\n");

		return {
			query,
			params: this._params,
		};
	}

	/**
	 * Execute the query
	 */
	public async execute(queryMode = QueryMode.WRITE): Promise<Result> {
		const { query, params } = this.build();

		let session: Session | undefined;

		this._neode.logger.logQuery(query, params);

		try {
			if (queryMode === QueryMode.WRITE) {
				session = this._neode.writeSession();

				const result = await session.executeWrite((tx) =>
					tx.run(query, params),
				);
				this._neode.logger.logQueryResult(result);

				return result;
			} else {
				session = this._neode.readSession();

				const result = await session.executeRead((tx) =>
					tx.run(query, params),
				);
				this._neode.logger.logQueryResult(result);

				return result;
			}
		} catch (error) {
			this._neode.logger.logQueryError(query, params, error as Error);

			throw error;
		} finally {
			session?.close();
		}
	}

	/**
	 * Convert a map of properties into an Array of
	 */
	private _convertPropertyMap<T extends Record<string, unknown>>(
		alias?: string,
		properties: Partial<T> = {},
	): Property[] {
		return Object.entries(properties).map(([key, value]) => {
			const property_alias = alias ? `${alias}_${key}` : key;

			this._params[property_alias] = value;

			return new Property(key, property_alias);
		});
	}

	/**
	 * Generate a unique key and add the value to the params object
	 *
	 * @param key
	 * @param value
	 */
	private _addWhereParameter(key: string, value: unknown) {
		let attempt = 1;
		const base = `where_${key.replace(/[^a-z0-9]+/g, "_")}`;

		// Try to create a unique key
		let variable = base;

		while (typeof this._params[variable] !== "undefined") {
			attempt++;

			variable = `${base}_${attempt}`;
		}

		this._params[variable] = value;

		return variable;
	}
}
