import * as dotenv from "dotenv";
dotenv.config();
import express, { Express, Request, Response } from "express";
import cors from "cors";
// database setup/mgmt
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import Database from "@/db/Database";
import runMigrations from "@/db/migrations/runMigrations";
import runSeeders from "@/db/seeders/runSeeders";
import { getRepositoryProvider } from "@/db/repositories/providers/provider";
import type { IRepositoryProvider } from "@/db/repositories/providers/IRepositoryProvider";
// services
import GeographyDataService from "@/services/GeographyDataService";
// db models
import Country from "@/db/models/Country";
// service models
import type ApiSearchRequest from "@/types/ApiSearchRequest";

const app: Express = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "localhost";

// Setup app
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (db) {
    RequestContext.create(db.em, next);
  } else {
    next();
  }
});

let db: MikroORM<PostgreSqlDriver>;
let repositoryProvider: IRepositoryProvider;

// Setup routes
//==continents=======================
app.get("/continents", async (req: Request, res: Response) => {
  const geographyDataService = new GeographyDataService(repositoryProvider);
  const continents = await geographyDataService.getContinents();
  res.json(continents);
});
//==countries==============================
app.get("/countries/:continentCode", async (req: Request, res: Response) => {
  const continentCode = req.params.continentCode as string;
  const geographyDataService = new GeographyDataService(repositoryProvider);
  const countries = await geographyDataService.getCountriesByContinentCode(
    continentCode
  );

  if (!countries) {
    return res.status(404).json({
      message: "Continent not found with continentCode: " + continentCode,
    });
  }
  return res.json(countries);
});

app.get(
  "/countries/:continentCode/:pageNumber/:pageSize/:orderBy/:orderDesc",
  async (req: Request, res: Response) => {
    const continentCode = req.params.continentCode as string;
    const { pageNumber } = req.params;
    const { pageSize } = req.params;
    const { orderBy } = req.params;
    const { orderDesc } = req.params;

    const geographyDataService = new GeographyDataService(repositoryProvider);
    const currentPageNumber = pageNumber as unknown as number;
    const currentPageSize = pageSize as unknown as number;

    const results =
      await geographyDataService.getCountriesByContinentCodePaged(
        continentCode,
        currentPageNumber,
        currentPageSize,
        orderBy as keyof Country,
        orderDesc as string
      );

    if (!results) {
      return res.status(404).json({
        message: "Continent not found with continentCode: " + continentCode,
      });
    }
    return res.json(results);
  }
);

app.post("/countries/search", async (req: Request, res: Response) => {
  const searchRequest = req.body as ApiSearchRequest;

  if (!searchRequest.searchTerm) {
    return res.status(400).json({
      message: "searchTerm is required in the request body",
    });
  }

  const geographyDataService = new GeographyDataService(repositoryProvider);
  const results = await geographyDataService.searchCountries(searchRequest);
  return res.json(results);
});

app.get("/country/:countryCode", async (req: Request, res: Response) => {
  const countryCode = req.params.countryCode as string;
  const geographyDataService = new GeographyDataService(repositoryProvider);
  const country = await geographyDataService.getCountryByCode(countryCode);

  if (!country) {
    return res.status(404).json({
      message: "country not found with countryCode: " + countryCode,
    });
  }
  return res.json(country);
});

//==app start AFTER DB setup==============================
async function configureDatabase() {
  try {
    let seedersRunSuccessfully = false;
    console.log(`Initializing database`);
    db = await Database.init();
    repositoryProvider = getRepositoryProvider();
    console.log(`Database initialized. Running database migrations`);
    const migrationsRun = await runMigrations(db);
    console.log("database migrations setup ok?:", migrationsRun);
    if (migrationsRun) {
      console.log(`Running database seeding`);
      seedersRunSuccessfully = await runSeeders(db);
      console.log("Database seeding setup ok?:", seedersRunSuccessfully);
    }
    return Promise.resolve(migrationsRun && seedersRunSuccessfully);
  } catch (err) {
    console.error("Error setting up the database", err);
    return Promise.resolve(false);
  }
}

if (process.env.NODE_ENV !== "test") {
  configureDatabase().then((result) => {
    app.listen(PORT, () => {
      console.log("db setup ok?:", result);

      console.log(`Server running at ${HOST}:${PORT} `);
    });
  });
}

export { app, configureDatabase };
export default app;
