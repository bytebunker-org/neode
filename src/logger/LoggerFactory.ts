import { hasOwn } from "../util/util.js";
import { CombinedLogger } from "./CombinedLogger.js";
import { ConsoleLogger } from "./ConsoleLogger.js";
import { DebugLogger } from "./DebugLogger.js";
import type { LogLevelOption, Logger, LoggerOptions } from "./Logger.js";

export function createLogger(options: LoggerOptions | undefined): Logger {
	let logLevel: LogLevelOption = ["warn", "error"];
	let logger: Logger | undefined;

	if (options && typeof options === "object") {
		if (
			hasOwn(options, "logLevel") &&
			(typeof options.logLevel === "boolean" || !!options.logLevel)
		) {
			logLevel = options.logLevel as LogLevelOption;
		} else if (hasOwn(options, "logger") && options.logger) {
			logger = options.logger as Logger;
		}
	}

	if (!logger) {
		logger = new CombinedLogger(
			[new DebugLogger(), new ConsoleLogger(logLevel)],
			true,
		);
	}

	return logger;
}
