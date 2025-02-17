import { PersonSchema } from "./Person.js";
import { exampleNeodeInstance } from "./neode.js";

async function main() {
	/**
	 * Define a Person
	 */
	exampleNeodeInstance.model("Person", PersonSchema);

	try {
		/**
		 * Create a couple of People nodes
		 */
		const [adam, joe] = await Promise.all([
			exampleNeodeInstance.create("Person", { name: "Adam" }),
			exampleNeodeInstance.create("Person", { name: "Joe" }),
		]);

		if (!adam || !joe) {
			throw new Error("Failed to create nodes");
		}

		/**
		 * Log out some details and relate the two together
		 */
		console.log("adam", adam.id, adam.get("person_id"), adam.get("name"));
		console.log("joe", joe.id, joe.get("person_id"), joe.get("name"));

		const relation = await adam.relateTo(joe, "knows", {
			since: new Date("2017-01-02 12:34:56"),
		});
		/**
		 * Log out relationship details
		 */
		console.log("rel", relation.id, relation.get("since"));
		/**
		 * Delete the two nodes
		 */
		await Promise.all([
			relation.startNode.delete(),
			relation.endNode.delete(),
		]);
	} catch (error) {
		console.error("An error occurred during the example", error);
	} finally {
		/**
		 * Close Driver
		 */
		await exampleNeodeInstance.close();
	}
}

main();
