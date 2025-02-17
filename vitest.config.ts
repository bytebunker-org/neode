import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		fileParallelism: false,
		maxConcurrency: 1,
		minWorkers: 1,
		maxWorkers: 1,
		root: "./",
		coverage: {
			provider: "v8",
			exclude: [
				"coverage/**",
				"dist/**",
				"packages/*/test?(s)/**",
				"**/*.d.ts",
				"**/virtual:*",
				"**/__x00__*",
				"**/\x00*",
				"cypress/**",
				"test?(s)/**",
				"test?(-*).?(c|m)[jt]s?(x)",
				"**/*{.,-}{test,spec}.?(c|m)[jt]s?(x)",
				"**/__tests__/**",
				"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
				"**/vitest.{workspace,projects}.[jt]s?(on)",
				"**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}",
			],
		},
	},
});
