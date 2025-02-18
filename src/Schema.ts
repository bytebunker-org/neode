import { toSnakeCase } from "js-convert-case";
import type { QueryResult, Session } from "neo4j-driver";
import type { Neode } from "./Neode.js";

function UniqueConstraintCypher(
	label: string,
	property: string,
	mode: "CREATE" | "DROP" = "CREATE",
): string {
	return `${mode} CONSTRAINT FOR (model:${label}) REQUIRE model.${property} IS UNIQUE`;
}

function ExistsConstraintCypher(
	label: string,
	property: string,
	mode: "CREATE" | "DROP" = "CREATE",
): string {
	return `${mode} CONSTRAINT FOR (model:${label}) REQUIRE EXISTS(model.${property})`;
}

function IndexCypher(
	label: string,
	property: string,
	mode: "create" | "drop" = "create",
): string {
	const indexName = `${toSnakeCase(label)}_${toSnakeCase(property)}_index`;

	if (mode === "create") {
		return `CREATE INDEX ${indexName} FOR (model:${label}) ON (model.${property})`;
	} else {
		return `DROP INDEX ${indexName} IF EXISTS`;
	}
}

async function runAsync(
	neode: Neode,
	session: Session,
	queries: string[],
): Promise<void> {
	try {
		for (const query of queries) {
			try {
				await session.run(query);

				neode.logger.logQuery(query, undefined);
			} catch (error) {
				neode.logger.logQueryError(query, undefined, error as Error);

				throw error;
			}
		}
	} finally {
		await session.close();
	}
}

function InstallSchema(neode: Neode): Promise<QueryResult[]> {
	const queries: string[] = [];

	neode.logger.logDebug(`Installing schema for ${neode.models.size} models`);

	for (const [label, model] of neode.models.entries()) {
		const previousQueryCount = queries.length;

		for (const property of model.properties.values()) {
			// Constraints
			if (property.primary || property.unique) {
				queries.push(UniqueConstraintCypher(label, property.name));

				neode.logger.logDebug(
					`Creating primary/unique constraint on property ${label}:${property.name}`,
				);
			}

			if (neode.enterprise && property.required) {
				queries.push(ExistsConstraintCypher(label, property.name));

				neode.logger.logDebug(
					`Creating required constraint on property ${label}:${property.name}`,
				);
			}

			// Indexes
			if (property.indexed) {
				queries.push(IndexCypher(label, property.name));

				neode.logger.logDebug(
					`Creating index on property ${label}:${property.name}`,
				);
			}
		}

		const modelQueryCount = queries.length - previousQueryCount;
		neode.logger.logSchema(
			`Found model ${label} with ${model.properties.size} properties, creating ${modelQueryCount} constraints on its properties`,
		);
	}

	return neode.batch(queries);
}

async function DropSchema(neode: Neode): Promise<void> {
	const queries: string[] = [];

	for (const [label, model] of neode.models.entries()) {
		for (const property of model.properties.values()) {
			// Constraints
			if (property.unique) {
				queries.push(
					UniqueConstraintCypher(label, property.name, "DROP"),
				);

				neode.logger.logDebug(
					`Dropping unique constraint on property ${label}:${property.name}`,
				);
			}

			if (neode.enterprise && property.required) {
				queries.push(
					ExistsConstraintCypher(label, property.name, "DROP"),
				);

				neode.logger.logDebug(
					`Dropping required constraint on property ${label}:${property.name}`,
				);
			}

			// Indexes
			if (property.indexed) {
				queries.push(IndexCypher(label, property.name, "drop"));

				neode.logger.logDebug(
					`Dropping index on property ${label}:${property.name}`,
				);
			}
		}
	}

	await runAsync(neode, neode.writeSession(), queries);
}

export class Schema {
	constructor(private readonly neode: Neode) {}

	public install(): Promise<QueryResult[]> {
		return InstallSchema(this.neode);
	}

	public drop(): Promise<void> {
		return DropSchema(this.neode);
	}
}
