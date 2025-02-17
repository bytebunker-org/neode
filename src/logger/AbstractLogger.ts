import type { QueryResult } from "neo4j-driver";
import { serializeError } from "serialize-error";
import type { Query } from "../types.js";
import { hasOwn } from "../util/util.js";
import type {
	LogLevel,
	LogLevelOption,
	LogMessage,
	LogType,
	Logger,
} from "./Logger.js";

const logTypeLevels: Record<LogType | LogLevel, LogLevel> = {
	query: "debug",
	"query-result": "debug",
	"query-error": "error",
	schema: "debug",
	debug: "debug",
	info: "info",
	warn: "warn",
	error: "error",
};

export abstract class AbstractLogger implements Logger {
	constructor(private readonly logLevel: LogLevelOption) {}

	public logQuery(
		query: Query,
		parameters: Record<string, unknown> | undefined,
	): boolean {
		return this.logMessage({
			type: "query",
			message: [this.stringifyQuery(query, parameters)],
		});
	}

	public logQueryResult(queryResult: QueryResult): boolean {
		return this.logMessage({
			type: "query-result",
			message: [this.stringifyQueryResult(queryResult)],
		});
	}

	public logQueryError(
		query: Query,
		parameters: Record<string, unknown> | undefined,
		error: Error,
	): boolean {
		return this.logMessage({
			type: "query-error",
			message: [
				`${this.stringifyError(error)} -- Query: ${this.stringifyQuery(query, parameters)}`,
			],
		});
	}

	public logSchema(schema: string): boolean {
		return this.logMessage({
			type: "schema",
			message: [schema],
		});
	}

	public logDebug(...message: unknown[]): boolean {
		return this.logMessage({
			type: "debug",
			message,
		});
	}

	public logInfo(...message: unknown[]): boolean {
		return this.logMessage({
			type: "info",
			message,
		});
	}

	public logWarn(...message: unknown[]): boolean {
		return this.logMessage({
			type: "warn",
			message,
		});
	}

	public logError(...message: unknown[]): boolean {
		return this.logMessage({
			type: "error",
			message,
		});
	}

	public logErrorObject(error: Error): boolean {
		return this.logMessage({
			type: "error",
			message: [this.stringifyError(error)],
		});
	}

	public logMessage(message: LogMessage): boolean {
		if (!this.isLogEnabled(message.type)) {
			return false;
		}

		const logLevel = logTypeLevels[message.type];
		const logType =
			logLevel === message.type ? undefined : (message.type as LogType);

		this.writeLog(logLevel, logType, message);

		return true;
	}

	protected abstract writeLog(
		level: LogLevel,
		type: LogType | undefined,
		...message: unknown[]
	): void;

	protected isLogEnabled(type: LogLevel | LogType): boolean {
		if (typeof this.logLevel === "boolean") {
			return this.logLevel;
		} else if (typeof this.logLevel === "string") {
			return this.logLevel === "all";
		} else if (Array.isArray(this.logLevel)) {
			const logLevel = logTypeLevels[type];

			return (
				this.logLevel.includes(type) || this.logLevel.includes(logLevel)
			);
		} else {
			throw new Error(`Invalid log type ${type}`);
		}
	}

	protected stringifyError(error: Error): string {
		return `Error: ${JSON.stringify(serializeError(error, { useToJSON: true }))}`;
	}

	protected stringifyQuery(
		query: Query,
		parameters: Record<string, unknown> | undefined,
	): string {
		const queryString = typeof query === "string" ? query : query.text;
		const queryParameters =
			typeof query === "string"
				? parameters
				: (query.parameters ?? parameters);

		const hasParameters = Boolean(
			queryParameters && Object.keys(queryParameters).length,
		);

		return (
			queryString +
			(hasParameters
				? `\n-- Parameters: ${this.stringifyParams(queryParameters!)}`
				: "")
		);
	}

	protected stringifyParams(params: Record<string, unknown>): string {
		try {
			return JSON.stringify(params);
		} catch {
			return "Can't stringify params";
		}
	}

	protected stringifyQueryResult(queryResult: QueryResult): string {
		try {
			return JSON.stringify(queryResult);
		} catch {
			return "Can't stringify query result";
		}
	}

	protected stringifyUnknown(values: unknown | unknown[]): string {
		const stringifyUnknownValue = (value: unknown): string => {
			if (value && typeof value === "object" && hasOwn(value, "type")) {
				const message = value as LogMessage;

				return this.stringifyUnknown(message.message);
			} else if (value instanceof Error) {
				return this.stringifyError(value);
			} else if (value && typeof value === "object") {
				try {
					return JSON.stringify(value);
				} catch (error) {
					return String(value);
				}
			} else {
				return String(value);
			}
		};

		if (Array.isArray(values)) {
			return values.map(stringifyUnknownValue).join(" ");
		} else return stringifyUnknownValue(values);
	}
}
