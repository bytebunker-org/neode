import type { QueryResult } from "neo4j-driver";
import type { Query } from "../types.js";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogType = "query" | "query-result" | "query-error" | "schema";

export type LogLevelOption = boolean | "all" | (LogLevel | LogType)[];

export type LoggerOptions =
	| LogLevelOption
	| {
			logLevel?: boolean | "all" | (LogLevel | LogType)[];
	  }
	| {
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
