import { config as dotenvConfig } from "dotenv";
import neo4j, {
	type Driver,
	type QueryResult,
	type RecordShape,
	type Session,
	type Transaction,
	type Config as Neo4jConfig,
} from "neo4j-driver";
import { Factory } from "./Factory.js";
import { Model } from "./Model.js";
import { ModelMap } from "./ModelMap.js";
import type { Node } from "./Node.js";
import { NodeCollection } from "./NodeCollection.js";
import type { Relationship } from "./Relationship.js";
import { Schema } from "./Schema.js";
import type { Logger, LoggerOptions } from "./logger/Logger.js";
import { createLogger } from "./logger/LoggerFactory.js";
import { Builder, QueryMode } from "./query/Builder.js";
import type { OrderDirectionEnum } from "./query/Order.js";
import type { Query, QueryParams } from "./types/generalTypes.js";
import type { SchemaObject } from "./types/schemaTypes.js";
import { QueryError } from "./util/QueryError.js";
import { TransactionError } from "./util/TransactionError.js";

/**
 * Configuration options for creating a Neode instance.
 */
export interface NeodeOptions {
	/**
	 * The connection string for the Neo4j database.
	 *
	 * @example bolt://127.0.0.1:7687
	 */
	connectionString: string;

	/**
	 * The username for database authentication.
	 */
	username?: string;

	/**
	 * The password for database authentication.
	 */
	password?: string;

	/**
	 * Whether to use Neo4j Enterprise features.
	 *
	 * @see Compare the differences at https://neo4j.com/pricing
	 */
	enterprise: boolean;

	/**
	 * The name of the database to connect to.
	 */
	database?: string;

	/**
	 * Additional configuration options for the Neo4j driver.
	 *
	 * @see {@link Neo4jConfig}
	 */
	driverConfig?: Neo4jConfig;

	/**
	 * Logging configuration options.
	 */
	logging?: LoggerOptions;
}

/**
 * The main class for interacting with Neo4j using the Neode OGM.
 */
export class Neode {
	private readonly _schema: Schema;
	private readonly _driver: Driver;
	private readonly _models: ModelMap;
	private factory: Factory;
	private database?: string;
	private _enterprise: boolean;

	private _logger!: Logger;

	/**
	 * Creates a new Neode instance.
	 * @param options Configuration options for connecting to Neo4j, Neode and the neo4j-driver.
	 */
	constructor(options: NeodeOptions) {
		const auth =
			options.username && options.password
				? neo4j.auth.basic(options.username, options.password)
				: undefined;
		this._driver = neo4j.driver(
			options.connectionString,
			auth,
			options.driverConfig ?? {},
		);

		this._models = new ModelMap(this);
		this._schema = new Schema(this);
		this.factory = new Factory(this);

		this.database = options.database;

		this._enterprise = options.enterprise;
		this.setEnterprise(options.enterprise);

		this.setLogger(options.logging);
	}

	public get schema(): Schema {
		return this._schema;
	}

	public get driver(): neo4j.Driver {
		return this._driver;
	}

	/**
	 * Are we running in enterprise mode?
	 */
	public get enterprise(): boolean {
		return this._enterprise;
	}

	public get models(): ModelMap {
		return this._models;
	}

	public get logger(): Logger {
		return this._logger;
	}

	/**
	 * @static
	 * Generate Neode instance using .env configuration
	 */
	public static fromEnv(): Neode {
		dotenvConfig();

		const connection_string = `${process.env["NEO4J_PROTOCOL"]}://${process.env["NEO4J_HOST"]}:${process.env["NEO4J_PORT"]}`;
		const username = process.env["NEO4J_USERNAME"];
		const password = process.env["NEO4J_PASSWORD"];
		const enterprise = process.env["NEO4J_ENTERPRISE"] === "true";

		// Multi-database
		const database = process.env["NEO4J_DATABASE"] ?? "neo4j";

		// Build additional config
		const driverConfig: Record<string, unknown> = {};

		const settings = {
			NEO4J_ENCRYPTION: "encrypted",
			NEO4J_TRUST: "trust",
			NEO4J_TRUSTED_CERTIFICATES: "trustedCertificates",
			NEO4J_KNOWN_HOSTS: "knownHosts",

			NEO4J_MAX_CONNECTION_POOLSIZE: "maxConnectionPoolSize",
			NEO4J_MAX_TRANSACTION_RETRY_TIME: "maxTransactionRetryTime",
			NEO4J_LOAD_BALANCING_STRATEGY: "loadBalancingStrategy",
			NEO4J_MAX_CONNECTION_LIFETIME: "maxConnectionLifetime",
			NEO4J_CONNECTION_TIMEOUT: "connectionTimeout",
			NEO4J_DISABLE_LOSSLESS_INTEGERS: "disableLosslessIntegers",
			NEO4J_LOGGING_LEVEL: "logging",
		} satisfies Record<string, string>;

		for (const setting of Object.keys(settings)) {
			if (Object.hasOwn(process.env, setting)) {
				const key = settings[setting as keyof typeof settings];
				const envValue = process.env[setting]!;
				let value: string | string[] | boolean = envValue;

				if (key === "trustedCertificates") {
					value = envValue.split(",");
				} else if (key === "disableLosslessIntegers") {
					value = envValue === "true";
				}

				driverConfig[key] = value;
			}
		}

		return new Neode({
			connectionString: connection_string,
			username,
			password,
			enterprise,
			database,
			driverConfig,
		});
	}

	public setLogger(loggingOptions: LoggerOptions | undefined): void {
		this._logger = createLogger(loggingOptions);
	}

	/**
	 * Scan a directory for Models
	 *
	 * @param directory Directory to scan
	 */
	/*public async withDirectory(directory: string): Promise<this> {
		const files = await fs.readdir(directory);

		const filteredFiles = files.filter(
			(file) => path.extname(file).toLowerCase() === ".js",
		);
		await Promise.all(
			files
				.filter((file) => path.extname(file).toLowerCase() === ".js")
				.map(async (fileName) => {
					const model = fileName.replace(".js", "");
					const filePath = path.join(directory, fileName);
					const fileExports = await import(filePath);

					if()

					this.model(model, schema);
				}),
		);

		return this;
	}*/

	/**
	 * Define multiple models
	 *
	 * @param models Map of models with their schema.  ie {Movie: {...}}
	 */
	public with(models: Record<string, SchemaObject>): this {
		for (const [modelName, model] of Object.entries(models)) {
			this.model(modelName, model);
		}

		return this;
	}

	/**
	 * Set the default database for all future connections
	 */
	setDatabase(database: string) {
		this.database = database;
	}

	/**
	 * Set Enterprise Mode
	 */
	setEnterprise(enterprise: boolean) {
		this._enterprise = enterprise;
	}

	/**
	 * Define a new Model
	 */
	public model<T extends Record<string, unknown>>(
		name: string,
		schema?: SchemaObject,
	): Model<T> {
		if (schema && typeof schema === "object") {
			const model = new Model(this, name, schema);
			this._models.set(name, model);
		}

		if (!this._models.has(name)) {
			const defined = [...this._models.keys()];

			let message = `Couldn't find a definition for "${name}".`;

			if (defined.length === 0) {
				message += " It looks like no models have been defined.";
			} else {
				message += ` The models currently defined are [${defined.join(", ")}]`;
			}

			throw new Error(message);
		}

		return this._models.get(name)! as Model<T>;
	}

	/**
	 * Extend a model with extra configuration
	 *
	 * @param name Name of the original model to clone
	 * @param as New model name
	 * @param using Schema changes
	 */
	extend<T extends Record<string, unknown>>(
		name: string,
		as: string,
		using: SchemaObject,
	): Model<T> {
		return this._models.extend<T>(name, as, using);
	}

	/**
	 * Create a new Node of a type
	 */
	public create<T extends Record<string, unknown>>(
		model: string,
		properties: Partial<T>,
	): Promise<Node<T> | undefined> {
		return this.model<T>(model).create(properties);
	}

	/**
	 * Merge a node based on the defined indexes
	 */
	public merge<T extends Record<string, unknown>>(
		model: string,
		properties: Partial<T>,
	): Promise<Node<T> | undefined> {
		return this.model<T>(model).merge(properties);
	}

	/**
	 * Merge a node based on the supplied properties
	 *
	 * @param model
	 * @param match Specific properties to merge on
	 * @param set Properties to set
	 */
	public mergeOn<T extends Record<string, unknown>>(
		model: string,
		match: Partial<T>,
		set: Partial<T>,
	): Promise<Node<T> | undefined> {
		return this.model<T>(model).mergeOn(match, set);
	}

	/**
	 * Delete a Node from the graph
	 *
	 * @param node The node to delete
	 * @param toDepth Depth to delete to (Defaults to 10)
	 */
	public delete<T extends Record<string, unknown>>(
		node: Node<T>,
		toDepth = 10,
	): Promise<Node<T> | undefined> {
		return node.delete(toDepth);
	}

	/**
	 * Delete all node labels
	 */
	public deleteAll(
		label: string | string[],
	): Promise<QueryResult | undefined> {
		const model = this._models.getByLabels(label);

		if (model) {
			return model.deleteAll();
		} else {
			return Promise.resolve(undefined);
		}
	}

	/**
	 * Relate two nodes based on the type
	 *
	 * @param from Origin node
	 * @param to Target node
	 * @param type Type of Relationship definition
	 * @param properties Properties to set against the relationships
	 * @param forceCreate Force the creation a new relationship? If false, the relationship will be merged
	 */
	public relate<
		T extends Record<string, unknown>,
		O extends Record<string, unknown>,
		R extends Record<string, unknown>,
	>(
		from: Node<T>,
		to: Node<O>,
		type: string,
		properties: Partial<R> = {},
		forceCreate = false,
	): Promise<Relationship<R, T | O, T | O>> {
		return from.relateTo(to, type, properties, forceCreate);
	}

	/**
	 * Run an explicitly defined Read query
	 */
	public async readCypher<R extends RecordShape = RecordShape>(
		query: Query,
		params: QueryParams = {},
	): Promise<QueryResult<R>> {
		const session = this.readSession();

		const result = await this.cypher(query, params, session);
		this.logger.logQueryResult(result);

		return result;
	}

	/**
	 * Run an explicitly defined Write query
	 */
	public async writeCypher<R extends RecordShape = RecordShape>(
		query: Query,
		params: QueryParams = {},
	): Promise<QueryResult<R>> {
		const session = this.writeSession();

		const result = await this.cypher(query, params, session);
		this.logger.logQueryResult(result);

		return result;
	}

	/**
	 * Run a Cypher query
	 */
	public async cypher<R extends RecordShape = RecordShape>(
		query: string | { text: string; parameters?: Record<string, unknown> },
		params?: Record<string, unknown>,
		runInSession?: Session,
	): Promise<QueryResult<R>> {
		// If single run, open a new session
		const session = runInSession ?? this.session();
		try {
			this.logger.logQuery(query, params);

			const result = await session.run(query, params);
			this.logger.logQueryResult(result);

			return result;
		} catch (error) {
			this.logger.logQueryError(query, params, error as Error);

			throw new QueryError(
				typeof query === "string" ? query : query.text,
				typeof query === "string" ? params : query.parameters,
				error as Error,
			);
		} finally {
			await session.close();
		}
	}

	/**
	 * Create a new Session in the Neo4j Driver.
	 */
	public session(database = this.database): Session {
		return this.readSession(database);
	}

	/**
	 * Create an explicit Read Session
	 */
	public readSession(database = this.database): Session {
		return this._driver.session({
			database,
			defaultAccessMode: neo4j.session.READ,
		});
	}

	/**
	 * Create an explicit Write Session
	 */
	public writeSession(database = this.database): Session {
		return this._driver.session({
			database,
			defaultAccessMode: neo4j.session.WRITE,
		});
	}

	/**
	 * Create a new Transaction
	 */
	public async transaction<T>(
		runInTransaction: (tx: Transaction) => Promise<T>,
		{
			mode = QueryMode.WRITE,
			database = this.database,
		}: { mode?: QueryMode; database?: string } = {},
	): Promise<T> {
		const session = this._driver.session({
			database,
			defaultAccessMode:
				mode === QueryMode.WRITE
					? neo4j.session.WRITE
					: neo4j.session.READ,
		});
		const tx = session.beginTransaction();

		try {
			const result = await runInTransaction(tx);

			await tx.commit();

			return result;
		} catch (error) {
			await tx.rollback();
			throw error;
		} finally {
			await session.close();
		}
	}

	/**
	 * Run a batch of queries within a transaction
	 */
	public async batch(queries: Query[]): Promise<QueryResult[]> {
		if (!queries) {
			return Promise.resolve([]);
		}

		for (const query of queries) {
			this.logger.logQuery(query, undefined);
		}

		return this.transaction(async (tx) => {
			const results = await Promise.allSettled(
				queries.map((query) => tx.run(query)),
			);

			const errorResults = results
				.filter((r) => r.status === "rejected")
				.map((r) => r.reason);

			if (errorResults.length > 0) {
				for (let i = 0; i < results.length; i++) {
					const result = results[i];

					if (result.status !== "rejected") {
						continue;
					}

					this.logger.logQueryError(
						queries[i],
						undefined,
						result.reason as Error,
					);
				}

				throw new TransactionError(errorResults);
			}

			const successfulResults = results
				.filter((r) => r.status === "fulfilled")
				.map((r) => r.value);

			for (const result of successfulResults.slice(5)) {
				this.logger.logQueryResult(result);
			}

			return successfulResults;
		});
	}

	/**
	 * Close Driver
	 */
	public close(): Promise<void> {
		return this._driver.close();
	}

	/**
	 * Return a new Query Builder
	 */
	public query(): Builder {
		return new Builder(this);
	}

	/**
	 * Get a collection of nodes
	 */
	public all<T extends Record<string, unknown>>(
		label: string,
		properties: Partial<T>,
		order?:
			| (keyof T & string)
			| Record<keyof T & string, OrderDirectionEnum>,
		limit?: number,
		skip?: number,
	): Promise<Node<T>[]> {
		return this.model<T>(label).all(properties, order, limit, skip);
	}

	/**
	 * Find a Node by its label and primary key
	 *
	 * @param label
	 * @param id
	 */
	public find<T extends Record<string, unknown>>(
		label: string,
		id: string | number,
	): Promise<Node<T> | undefined> {
		return this.model<T>(label).find(id);
	}

	/**
	 * Find a Node by its internal node element ID
	 *
	 * @param label
	 * @param id
	 */
	public findById<T extends Record<string, unknown>>(
		label: string,
		id: string,
	): Promise<Node<T> | undefined> {
		return this.model<T>(label).findById(id);
	}

	/**
	 * Find a Node by properties
	 *
	 * @param label
	 * @param key Either a string for the property name or an object of values
	 * @param value Value
	 */
	public first<T extends Record<string, unknown>>(
		label: string,
		key: keyof T & string,
		value: unknown,
	): Promise<Node<T> | undefined>;
	public first<T extends Record<string, unknown>>(
		label: string,
		properties: Partial<T>,
	): Promise<Node<T> | undefined>;
	public first<T extends Record<string, unknown>>(
		label: string,
		keyOrObject: (keyof T & string) | Partial<T>,
		value?: unknown,
	) {
		return this.model<T>(label).first(keyOrObject, value);
	}

	/**
	 * Hydrate a set of nodes and return a Collection
	 *
	 * @param result Neo4j result set
	 * @param alias Alias of node to pluck
	 * @param definition Force Definition
	 */
	public hydrate<T extends Record<string, unknown>>(
		result: QueryResult,
		alias: string,
		definition?: Model<T> | string,
	): NodeCollection<T> {
		return this.factory.hydrate(result, alias, definition);
	}

	/**
	 * Hydrate the first record in a result set
	 *
	 * @param result Neo4j Result
	 * @param alias Alias of Node to pluck
	 * @param definition Expected schema of the node
	 */
	hydrateFirst<T extends Record<string, unknown>>(
		result: QueryResult,
		alias: string,
		definition?: Model<T> | string,
	) {
		return this.factory.hydrateFirst(result, alias, definition);
	}

	/**
	 * Turn an array into a Collection
	 *
	 * @param array An array
	 */
	public toCollection<T extends Record<string, unknown>>(
		array: Node<T>[],
	): NodeCollection<T> {
		return new NodeCollection(this, array);
	}
}
