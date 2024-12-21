import { Options } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import dotenv from "dotenv";

dotenv.config();

const config: Options<PostgreSqlDriver> = {
  driver: PostgreSqlDriver,
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  dbName: process.env.DB_NAME || "mikro_orm_poc",
  entities: ["./dist/models"], // path to our JS entities (dist), relative to `baseDir`
  entitiesTs: ["./src/models"], // path to our TS entities (src), relative to `baseDir`
  debug: process.env.NODE_ENV !== "production",
  metadataProvider: TsMorphMetadataProvider,
  migrations: {
    path: "./dist/migrations",
    pathTs: "./src/migrations",
  },
  seeder: {
    path: "./dist/seeders",
    pathTs: "./src/seeders",
    defaultSeeder: "DatabaseSeeder",
    glob: "!(*.d).{js,ts}",
    emit: "ts",
    fileName: (className: string) => className,
  },
};

export default config;
