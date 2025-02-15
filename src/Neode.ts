import { config as dotenvConfig } from "dotenv";
import neo4j, {
	type Driver,
	type QueryResult,
	type Session,
	type Transaction,
} from "neo4j-driver";
import { Factory } from "./Factory.js";
import { Model } from "./Model.js";
import { ModelMap } from "./ModelMap.js";
import type { Node } from "./Node.js";
import { NodeCollection } from "./NodeCollection.js";
import { Builder, QueryMode } from "./Query/Builder.js";
import { Schema } from "./Schema.js";
import type { Query, QueryParams, SchemaObject } from "./types.js";
import { QueryError } from "./util/QueryError.js";
import { TransactionError } from "./util/TransactionError.js";

interface NeodeOptions {
	connection_string: string;
	username?: string;
	password?: string;
	enterprise: boolean;
	database?: string;
	driverConfig: Record<string, unknown>;
}

export class Neode {
	private readonly _schema: Schema;
	private readonly _driver: Driver;
	private readonly _models: ModelMap;
	private factory: Factory;
	private database?: string;
	private _enterprise: boolean;

	constructor(options: NeodeOptions) {
		const auth =
			options.username && options.password
				? neo4j.auth.basic(options.username, options.password)
				: undefined;
		this._driver = neo4j.driver(
			options.connection_string,
			auth,
			options.driverConfig ?? {},
		);

		this._models = new ModelMap(this);
		this._schema = new Schema(this);
		this.factory = new Factory(this);

		this.database = options.database;

		this._enterprise = options.enterprise;
		this.setEnterprise(options.enterprise);
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

	/**
	 * @static
	 * Generate Neode instance using .env configuration
	 *
	 * @return {Neode}
	 */
	public static async fromEnv(): Promise<Neode> {
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
			connection_string,
			username,
			password,
			enterprise,
			database,
			driverConfig,
		});
	}

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

	public get models(): ModelMap {
		return this._models;
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
		properties: T,
	): Promise<Node<T>> {
		return this.model<T>(model).create(properties);
	}

	/**
	 * Merge a node based on the defined indexes
	 */
	public merge<T extends Record<string, unknown>>(
		model: string,
		properties: Record<string, unknown>,
	): Promise<Node<T>> {
		return this.model<T>(model).merge(properties);
	}

	/**
	 * Merge a node based on the supplied properties
	 *
	 * @param model
	 * @param match Specific properties to merge on
	 * @param set   Properties to set
	 */
	public mergeOn<T extends Record<string, unknown>>(
		model: string,
		match: Record<string, unknown>,
		set: Record<string, unknown>,
	): Promise<Node<T>> {
		return this.model<T>(model).mergeOn<T>(match, set);
	}

	/**
	 * Delete a Node from the graph
	 *
	 * @param node The node to delete
	 * @param toDepth Depth to delete to (Defaults to 10)
	 */
	delete<T>(node: Node<T>, toDepth = 10): Promise<Node<T>> {
		return node.delete(toDepth);
	}

	/**
	 * Delete all node labels
	 */
	public deleteAll(label: string | string[]) {
		return this._models.getByLabels(label)?.deleteAll();
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
	relate<T, U>(
		from: Node<T>,
		to: Node<U>,
		type: string,
		properties: Record<string, unknown>,
		forceCreate = false,
	) {
		return from.relateTo(to, type, properties, forceCreate);
	}

	/**
	 * Run an explicitly defined Read query
	 */
	readCypher(query: Query, params: QueryParams = {}): Promise<QueryResult> {
		const session = this.readSession();

		return this.cypher(query, params, session);
	}

	/**
	 * Run an explicitly defined Write query
	 */
	public writeCypher(
		query: Query,
		params: QueryParams = {},
	): Promise<QueryResult> {
		const session = this.writeSession();

		return this.cypher(query, params, session);
	}

	/**
	 * Run a Cypher query
	 */
	public async cypher(
		query: string | { text: string; parameters?: Record<string, unknown> },
		params?: Record<string, unknown>,
		runInSession?: Session,
	) {
		// If single run, open a new session
		const session = runInSession ?? this.session();
		try {
			return await session.run(query, params);
		} catch (error) {
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
	 *
	 * @return {Transaction}
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
	 *
	 * @type {Array}
	 * @return {Promise}
	 */
	public async batch(queries: Query[]): Promise<QueryResult[]> {
		return this.transaction(async (tx) => {
			try {
				return await Promise.all(queries.map((query) => tx.run(query)));
			} catch (error) {
				// TODO: How can I get the errors? Maybe Promise.settled?
				throw new TransactionError([error]);
			}
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
	public all(
		label: string,
		properties?: Record<string, unknown>,
		order?: string[] | unknown[] | Record<string, unknown>,
		limit?: number,
		skip?: number,
	) {
		return this.model(label).all(properties, order, limit, skip);
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
	): Promise<Node<T>> {
		return this.model<T>(label).find(id);
	}

	/**
	 * Find a Node by its internal node ID
	 *
	 * @param label
	 * @param id
	 */
	public findById<T extends Record<string, unknown>>(
		label: string,
		id: number,
	) {
		return this.model(label).findById(id);
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
		key: string | Partial<T>,
		value: unknown,
	) {
		return this.model<T>(label).first(key, value);
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
		definition?: Model<T>,
	): NodeCollection<T> {
		return this.factory.hydrate(result, alias, definition);
	}

	/**
	 * Hydrate the first record in a result set
	 *
	 * @param result    Neo4j Result
	 * @param alias  Alias of Node to pluck
	 */
	hydrateFirst(result: QueryResult, alias: string, definition) {
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

module.exports = Neode;
