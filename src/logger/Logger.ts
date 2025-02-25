import type { QueryResult } from "neo4j-driver";
import type { Query } from "../types/generalTypes.js";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogType = "query" | "query-result" | "query-error" | "schema";

export type LogLevelOption = boolean | "all" | (LogLevel | LogType)[];

export type LoggerOptions =
	| LogLevelOption
	| {
			/**
			 * The log levels to output, all logs not included will be ignored.
			 *
			 * Can be `true` or `"all"` to log everything or contain an array with a combination of
			 * {@link LogLevel}s and {@link LogType}s to show.
			 *
			 * @default `["warn", "error"]`
			 */
			logLevel?: boolean | "all" | (LogLevel | LogType)[];
	  }
	| {
			/**
			 * Custom logger instance to write log messages to.
			 * If provided, this logger instance will be used instead of the default loggers.
			 *
			 * @default ```new CombinedLogger([new DebugLogger(), new ConsoleLogger(logLevel)], true)```
			 */
			logger?: Logger;
	  };

export interface LogMessage {
	type: LogLevel | LogType;

	message: unknown[];
}

export interface Logger {
	logQuery(
		query: Query,
		parameters: Record<string, unknown> | undefined,
	): boolean;

	logQueryError(
		query: Query,
		parameters: Record<string, unknown> | undefined,
		error: Error,
	): boolean;

	logQueryResult(queryResult: QueryResult): boolean;

	logSchema(schema: string): boolean;

	logErrorObject(error: Error): boolean;

	logDebug(...message: unknown[]): boolean;

	logInfo(...message: unknown[]): boolean;

	logWarn(...message: unknown[]): boolean;

	logError(...message: unknown[]): boolean;

	logMessage(message: LogMessage): boolean;
}
