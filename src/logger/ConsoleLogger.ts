import { AbstractLogger } from "./AbstractLogger.js";
import type { LogLevel, LogType } from "./Logger.js";

export class ConsoleLogger extends AbstractLogger {
	protected writeLog(
		level: LogLevel,
		type: LogType | undefined,
		...message: unknown[]
	): void {
		console[level](...[type ? `[${type}]` : type, message].filter(Boolean));
	}
}
