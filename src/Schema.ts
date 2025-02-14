import type { Session } from "neo4j-driver";
import type { Neode } from "./Neode.js";

function UniqueConstraintCypher(
	label: string,
	property: string,
	mode = "CREATE",
): string {
	return `${mode} CONSTRAINT ON (model:${label}) ASSERT model.${property} IS UNIQUE`;
}

function ExistsConstraintCypher(
	label: string,
	property: string,
	mode = "CREATE",
): string {
	return `${mode} CONSTRAINT ON (model:${label}) ASSERT EXISTS(model.${property})`;
}

function IndexCypher(label: string, property: string, mode = "CREATE") {
	return `${mode} INDEX ON :${label}(${property})`;
}

async function runAsync(
	session: Session,
	queries: string[],
): Promise<void> {
	const next = queries.pop();

	try {
		for (const query of queries) {
			await session.run(query);
		}
	} finally {
		await session.close();
	}
}

function InstallSchema(neode: Neode) {
	const queries: string[] = [];

	neode.models.forEach((model, label) => {
		model.properties().forEach((property) => {
			// Constraints
			if (property.primary() || property.unique()) {
				queries.push(UniqueConstraintCypher(label, property.name()));
			}

			if (neode.enterprise() && property.required()) {
				queries.push(ExistsConstraintCypher(label, property.name()));
			}

			// Indexes
			if (property.indexed()) {
				queries.push(IndexCypher(label, property.name()));
			}
		});
	});

	return neode.batch(queries);
}

function DropSchema(neode) {
	const queries: string[] = [];


	neode.models.forEach((model, label) => {
		model.properties().forEach((property) => {
			// Constraints
			if (property.unique()) {
				queries.push(
					UniqueConstraintCypher(label, property.name(), "DROP"),
				);
			}

			if (neode.enterprise() && property.required()) {
				queries.push(
					ExistsConstraintCypher(label, property.name(), "DROP"),
				);
			}

			// Indexes
			if (property.indexed()) {
				queries.push(IndexCypher(label, property.name(), "DROP"));
			}
		});
	});

	const session = neode.writeSession();

	await runAsync(session, queries);
}

export class Schema {
	constructor(neode) {
		this.neode = neode;
	}

	install() {
		return InstallSchema(this.neode);
	}

	drop() {
		return DropSchema(this.neode);
	}
}
