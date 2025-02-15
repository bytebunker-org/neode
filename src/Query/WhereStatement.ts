import type { Where } from "./Where.js";

export enum WhereStatementConnectorEnum {
	AND = "AND",
	OR = "OR",
	XOR = "XOR",
}

export class WhereStatement {
	private readonly _prefix: string;
	private readonly _clauses: Where[] = [];
	private _connector: WhereStatementConnectorEnum =
		WhereStatementConnectorEnum.AND;

	constructor(prefix = "") {
		this._prefix = prefix;
	}

	/**
	 * Return the last condition in the collection
	 *
	 * @return {Where}
	 */
	public get last(): Where {
		return this._clauses[this._clauses.length - 1];
	}

	/**
	 * Set the Connector string for chaining statements (AND, OR)
	 */
	public setConnector(connector: WhereStatementConnectorEnum) {
		this._connector = connector;
	}

	/**
	 * Append a new clause
	 *
	 * @param clause Where clause to append
	 */
	public append(clause: Where): this {
		this._clauses.push(clause);

		return this;
	}

	/**
	 * Convert this Where Statement to a String
	 */
	public toString(): string {
		if (!this._clauses.length) {
			return "";
		}

		const statements = this._clauses
			.map((clause) => clause.toString())
			.join(` ${this._connector} `);

		return `${this._prefix} (${statements}) `;
	}
}
