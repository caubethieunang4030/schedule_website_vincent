import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "bundle",
  external: [
    "firebase-functions",
    "firebase-admin",
    "pg",
    "pino",
    "pino-pretty",
    "thread-stream",
  ],
  banner: {
    js: `import { createRequire } from "node:module"; const require = createRequire(import.meta.url);`,
  },
  alias: {
    "@workspace/db": path.resolve(root, "../packages/db/src/index.ts"),
    "@workspace/api-zod": path.resolve(root, "../packages/api-zod/src/index.ts"),
  },
  logLevel: "info",
};

await build({
  ...shared,
  entryPoints: [path.join(root, "src/index.ts")],
  outfile: path.join(root, "index.mjs"),
});

await build({
  ...shared,
  entryPoints: [path.join(root, "src/server.ts")],
  outfile: path.join(root, "server.mjs"),
});
