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
	mode: "CREATE" | "DROP" = "CREATE",
): string {
	return `${mode} INDEX FOR (model:${label}) ON (model.${property})`;
}

async function runAsync(session: Session, queries: string[]): Promise<void> {
	try {
		for (const query of queries) {
			await session.run(query);
		}
	} finally {
		await session.close();
	}
}

function InstallSchema(neode: Neode): Promise<QueryResult[]> {
	const queries: string[] = [];

	for (const [label, model] of neode.models.entries()) {
		for (const property of model.properties.values()) {
			// Constraints
			if (property.primary || property.unique) {
				queries.push(UniqueConstraintCypher(label, property.name));
			}

			if (neode.enterprise && property.required) {
				queries.push(ExistsConstraintCypher(label, property.name));
			}

			// Indexes
			if (property.indexed) {
				queries.push(IndexCypher(label, property.name));
			}
		}
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
			}

			if (neode.enterprise && property.required) {
				queries.push(
					ExistsConstraintCypher(label, property.name, "DROP"),
				);
			}

			// Indexes
			if (property.indexed) {
				queries.push(IndexCypher(label, property.name, "DROP"));
			}
		}
	}

	await runAsync(neode.writeSession(), queries);
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
