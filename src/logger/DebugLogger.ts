import debug, { type Debugger } from "debug";
import { AbstractLogger } from "./AbstractLogger.js";
import type { LogLevel, LogType } from "./Logger.js";

const DEBUG_PREFIX = "neode";

export class DebugLogger extends AbstractLogger {
	private readonly debugLoggers: Partial<
		Record<LogLevel | LogType, Debugger>
	> = {};

	constructor() {
		super("all");
	}

	protected writeLog(
		level: LogLevel,
		type: LogType | undefined,
		...message: unknown[]
	): void {
		const debugFunc = this.getDebugFunc(type ?? level);

		debugFunc(this.stringifyUnknown(message));
	}

	protected override isLogEnabled(type: LogLevel | LogType): boolean {
		const debugFunc = this.getDebugFunc(type);

		return debugFunc.enabled;
	}

	private getDebugFunc(type: LogLevel | LogType): Debugger {
		if (!this.debugLoggers[type]) {
			this.debugLoggers[type] = debug(`${DEBUG_PREFIX}:${type}`);
		}

		return this.debugLoggers[type];
	}
}
