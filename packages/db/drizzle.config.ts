import { defineConfig } from "drizzle-kit";
import path from "path";

import fs from "fs";

if (!process.env.DATABASE_URL) {
  try {
    const rootEnv = path.resolve(__dirname, "../../.env");
    if (fs.existsSync(rootEnv)) {
      const envContent = fs.readFileSync(rootEnv, "utf-8");
      for (const line of envContent.split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value;
        }
      }
    }
  } catch (e) {}
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
