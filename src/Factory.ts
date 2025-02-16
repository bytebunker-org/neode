import neo4j, { type QueryResult } from "neo4j-driver";
import type { Model } from "./Model.js";
import type { Neode } from "./Neode.js";
import { Node } from "./Node.js";
import { NodeCollection } from "./NodeCollection.js";
import { EAGER_ID, EAGER_LABELS, EAGER_TYPE } from "./Query/EagerUtils.js";
import { Relationship } from "./Relationship.js";
import { RelationshipCollection } from "./RelationshipCollection.js";
import {
	RelationshipDirectionEnum,
	type RelationshipType,
} from "./RelationshipType.js";
import type { EntityPropertyMap } from "./types.js";
import { hasOwn } from "./util/util.js";

interface HydratedDataRecord extends Record<string, unknown> {
	[EAGER_ID]: neo4j.Integer;
	[EAGER_LABELS]?: string[];
	[EAGER_TYPE]?: string;
}

export class Factory {
	constructor(private readonly neode: Neode) {}

	/**
	 * Hydrate the first record in a result set
	 *
	 * @param result Neo4j Result
	 * @param alias Alias of Node to pluck
	 * @param definition
	 */
	hydrateFirst<T extends Record<string, unknown>>(
		result: QueryResult | undefined,
		alias: string,
		definition?: Model<T> | string,
	): Node<T> | undefined {
		const firstResult: Record<string, unknown> | undefined =
			result?.records?.[0]?.get(alias);

		if (!firstResult) {
			return;
		}

		return this.hydrateNode(firstResult, definition);
	}

	/**
	 * Hydrate a set of nodes and return a Collection
	 *
	 * @param result Neo4j result set
	 * @param alias Alias of node to pluck
	 * @param definition Force Definition
	 */
	public hydrate<T extends Record<string, unknown>>(
		result: QueryResult | undefined,
		alias: string,
		definition?: Model<T> | string,
	): NodeCollection<T> {
		let nodes: Node<T>[] = [];

		if (result?.records?.length) {
			nodes = result.records.map((row) =>
				this.hydrateNode(row.get(alias), definition),
			);
		}

		return new NodeCollection(this.neode, nodes);
	}

	/**
	 * Get the definition by a set of labels
	 *
	 * @param labels
	 */
	private getDefinition<T extends Record<string, unknown>>(
		labels: string[],
	): Model<T> | undefined {
		return this.neode.models.getByLabels(labels);
	}

	/**
	 * Take a result object and convert it into a Model
	 */
	private hydrateNode<T extends Record<string, unknown>>(
		record: Record<string, unknown>,
		definitionOrString?: Model<T> | string,
	): Node<T> {
		if (!hasOwn(record, "identity") || !neo4j.isInt(record.identity)) {
			throw new Error(
				`No node identity found in record ${JSON.stringify(record)}`,
			);
		}

		const identity = record.identity as neo4j.Integer;

		let hydratedData: HydratedDataRecord = {
			...(record["properties"] && typeof record["properties"] === "object"
				? record["properties"]
				: {}),
			[EAGER_ID]: identity,
		};

		// TODO: Are labels also required?
		if (hasOwn(record, "labels") && Array.isArray(record.labels)) {
			hydratedData = {
				...hydratedData,
				[EAGER_LABELS]: record.labels as string[],
			};
		}

		// Get Internals
		const labels = hydratedData[EAGER_LABELS];

		let definition: Model<T> | undefined;

		if (!definitionOrString && labels) {
			definition = this.getDefinition(labels);
		} else if (typeof definitionOrString === "string") {
			definition = this.neode.models.get(definitionOrString) as Model<T>;
		} else {
			definition = definitionOrString;
		}

		// Helpful error message if nothing could be found
		if (!definition) {
			throw new Error(
				`No model definition found for labels ${JSON.stringify(labels)}`,
			);
		}

		// Get Properties
		const properties = new Map() as EntityPropertyMap<T>;

		for (const key of definition.properties.keys()) {
			if (hasOwn(hydratedData, key)) {
				properties.set(key, hydratedData[key]);
			}
		}

		// Create Node Instance
		const node = new Node<T>(
			this.neode,
			definition,
			identity,
			labels ?? [],
			properties,
		);

		// Add eagerly loaded props
		for (const eager of definition.eager) {
			const name = eager.name;

			// TODO: Are the eagerly loaded props on hydratedData (so in record.properties) or actually in record?
			if (!record[name]) {
				throw new Error(
					`Could not find eager property ${name} on ${JSON.stringify(record)}`,
				);
			}

			if (eager.type === "node") {
				node.setEager(
					name,
					this.hydrateNode(record[name] as Record<string, unknown>),
				);
			} else if (eager.type === "nodes") {
				node.setEager(
					name,
					new NodeCollection(
						this.neode,
						(record[name] as Record<string, unknown>[]).map(
							(value) => this.hydrateNode(value),
						),
					),
				);
			} else if (eager.type === "relationship") {
				node.setEager(
					name,
					this.hydrateRelationship(eager, record[name], node),
				);
			} else if (eager.type === "relationships") {
				node.setEager(
					name,
					new RelationshipCollection(
						this.neode,
						(record[name] as Record<string, unknown>[]).map(
							(value) =>
								this.hydrateRelationship(eager, value, node),
						),
					),
				);
			}
		}

		return node;
	}

	/**
	 * Take a result object and convert it into a Relationship
	 *
	 * @param definition  Relationship type
	 * @param record      Record object
	 * @param thisNode   'This' node in the current  context
	 * @return {Relationship}
	 */
	public hydrateRelationship<
		T extends Record<string, unknown>,
		S extends Record<string, unknown>,
		E extends Record<string, unknown>,
	>(
		definition: RelationshipType<T>,
		record: HydratedDataRecord,
		thisNode: Node<S>,
	): Relationship<T, S | E, S | E> {
		// Get Internals
		const identity = record[EAGER_ID];
		const type = record[EAGER_TYPE]!;

		// Get Definition from
		// const definition = this.getDefinition(labels);

		// Get Properties
		const properties = new Map() as EntityPropertyMap<T>;

		for (const [key] of definition.properties.entries()) {
			if (hasOwn(record, key)) {
				properties.set(key, record[key]);
			}
		}

		// Start & End Nodes
		const otherNode = this.hydrateNode<E>(
			record[definition.nodeAlias] as E,
		);

		// Calculate Start & End Nodes
		const startNode =
			definition.direction === RelationshipDirectionEnum.IN
				? (otherNode as Node<S | E>)
				: (thisNode as Node<S | E>);

		const endNode =
			definition.direction === RelationshipDirectionEnum.IN
				? (thisNode as Node<S | E>)
				: (otherNode as Node<S | E>);

		return new Relationship(
			this.neode,
			definition,
			identity,
			type,
			properties,
			startNode,
			endNode,
		);
	}
}
