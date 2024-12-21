import * as dotenv from "dotenv";
dotenv.config();
import express, { Express, Request, Response } from "express";
import cors from "cors";
// database setup/mgmt
import { MikroORM } from "@mikro-orm/core";
import Database from "./db/Database";
import runMigrations from "./db/migrations/runMigrations";
import runSeeders from "./db/seeders/runSeeders";
import MikroOrmBaseRepository from "./db/repositories/MikroOrmBaseRepository";
// db models
import Continent from "./db/models/Continent";
import Country from "./db/models/Country";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";

const app: Express = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "localhost";

// Setup app
app.use(cors());

let db: MikroORM<PostgreSqlDriver>;

// Setup routes
//==continents=======================
app.get("/continents", async (req: Request, res: Response) => {
  const repo = new MikroOrmBaseRepository<Continent>(db);
  return await repo.findAll().then((continents) => {
    res.json(continents);
  });
});
//==countries==============================
app.get("/countries/:continentCode", async (req: Request, res: Response) => {
  let continentCode = req.params.continentCode;
  const repoContinents = new MikroOrmBaseRepository<Continent>(db);
  const repoCountries = new MikroOrmBaseRepository<Country>(db);

  const continent = await repoContinents.findOneWhere({
    continentCode: continentCode,
  });
  if (!continent) {
    res.status(404).json({
      message: "Continent not found with continentCode: " + continentCode,
    });
  }

  return await repoCountries
    .findWhere({
      continentId: continent.continentId,
    })
    .then((results) => {
      if (!results) {
        res.status(404).json({
          message: "Countries not found with continentCode: " + continentCode,
        });
      } else {
        res.json(results);
      }
    });
});

app.get(
  "/countries/:continentCode/:pageNumber/:pageSize/:orderBy/:orderDesc",
  async (req: Request, res: Response) => {
    const { continentCode } = req.params;
    const { pageNumber } = req.params;
    const { pageSize } = req.params;
    const { orderBy } = req.params;
    const { orderDesc } = req.params;

    const repoContinents = new MikroOrmBaseRepository<Continent>(db);
    const repoCountries = new MikroOrmBaseRepository<Country>(db);

    const continent = await repoContinents.findOneWhere({
      continentCode: continentCode,
    });

    const currentPageNumber = pageNumber as unknown as number;
    const currentPageSize = pageSize as unknown as number;

    return await repoCountries
      .findWherePagedSorted(
        { continentId: continent.continentId },
        currentPageNumber,
        currentPageSize,
        orderBy as keyof Country,
        orderDesc
      )
      .then((results) => {
        if (!results) {
          res.status(404).json({
            message: "No countries found with continentCode: " + continentCode,
          });
        } else {
          res.json(results);
        }
      });
  }
);

app.get("/country/:countryCode", async (req: Request, res: Response) => {
  let countryCode = req.params.countryCode;
  const repoCountry = new MikroOrmBaseRepository<Country>(db);
  return await repoCountry
    .findOneWhere({ countryCode: countryCode })
    .then((results) => {
      if (!results) {
        res.status(404).json({
          message: "country not found with countryCode: " + countryCode,
        });
      } else {
        res.json(results);
      }
    });
});

//==app start AFTER DB setup==============================
async function configureDatabase() {
  try {
    let seedersRunSuccessfully = false;
    console.log(`Initializing database`);
    db = await Database.init();
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

configureDatabase().then((result) => {
  app.listen(PORT, () => {
    console.log("db setup ok?:", result);

    console.log(`Server running at ${HOST}:${PORT} `);
  });
});
