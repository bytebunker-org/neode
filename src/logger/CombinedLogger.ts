import type { Logger } from "./Logger.js";

export class CombinedLogger implements Logger {
	public logQuery = this.callLoggers("logQuery");
	public logQueryResult = this.callLoggers("logQueryResult");
	public logQueryError = this.callLoggers("logQueryError");
	public logSchema = this.callLoggers("logSchema");
	public logErrorObject = this.callLoggers("logErrorObject");
	public logDebug = this.callLoggers("logDebug");
	public logInfo = this.callLoggers("logInfo");
	public logWarn = this.callLoggers("logWarn");
	public logError = this.callLoggers("logError");
	public logMessage = this.callLoggers("logMessage");

	/**
	 * Create a combined logger which redirects all received log messages to multiple loggers
	 *
	 * @param loggers an array of loggers which should receive every message. The order of the loggers is important if `callOnlyFirstLogger` is true
	 * @param callOnlyFirstLogger if true, only the first logger which handles the message
	 * (doesn't ignore the message for example because of the log level) will be called
	 */
	constructor(
		private readonly loggers: Logger[],
		private readonly callOnlyFirstLogger = false,
	) {}

	private callLoggers<
		F extends keyof Logger,
		Args extends Parameters<Logger[F]>,
	>(functionName: F): (...args: Args) => boolean {
		return (...args: Args) => {
			let handled = false;

			for (const logger of this.loggers) {
				// @ts-ignore
				handled = logger[functionName](...args);

				if (handled && this.callOnlyFirstLogger) {
					return true;
				}
			}

			return handled;
		};
	}
}
