import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator, TSMigrationGenerator } from "@mikro-orm/migrations";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import dotenv from "dotenv";
// db models
import Continent from "@/db/models/Continent";
import Country from "@/db/models/Country";

dotenv.config();

export default defineConfig({
  forceUtcTimezone: true,
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  dbName: process.env.DB_NAME || "mikro_orm_poc",
  entities: [Continent, Country],
  allowGlobalContext: true,
  debug: process.env.NODE_ENV !== "production",
  metadataProvider: TsMorphMetadataProvider,
  migrations: {
    tableName: "_migrations", // name of database table with log of executed transactions
    path: "./migrations", // path to the folder with migrations
    pathTs: "src/db/migrations", // path to the folder with TS migrations (if used, you should put path to compiled files in `path`)
    glob: "!(*.d|runMigrations).{js,ts}", // how to match migration files (all .js and .ts files, but not .d.ts)
    transactional: true, // wrap each migration in a transaction
    disableForeignKeys: true, // wrap statements with `set foreign_key_checks = 0` or equivalent
    allOrNothing: true, // wrap all migrations in master transaction
    dropTables: false, // allow to disable table dropping
    safe: false, // allow to disable table and column dropping
    snapshot: true, // save snapshot when creating new migrations
    emit: "ts", // migration generation mode
    generator: TSMigrationGenerator, // migration generator, e.g. to allow custom formatting
  },
  extensions: [Migrator],
});
