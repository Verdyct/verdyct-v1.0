import { defineConfig } from "drizzle-kit";

if (!process.env["SUPABASE_DB_URL"]) {
  throw new Error("SUPABASE_DB_URL is not set");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env["SUPABASE_DB_URL"],
  },
});
