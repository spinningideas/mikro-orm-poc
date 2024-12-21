// data
import continentData from "./data/continentData";
import countryData from "./data/countryData";
// models
import { Continent } from "../models/Continent";
import { Country } from "../models/Country";
// Database ORM specific feature to persist data
import { MikroORM } from "@mikro-orm/core";

const seedContinents = async (orm: MikroORM) => {
  console.log("Running seeding of continents");
  const data = continentData;
  for (let i = 0; i < data.length; i++) {
    const continent = data[i] as Continent;
    console.log(`Seeding continent: ${continent.continentName}`);

    await orm.em.persistAndFlush(
      new Continent(
        continent.continentId,
        continent.continentCode,
        continent.continentName
      )
    );
  }
};

const seedCountries = async (orm: MikroORM) => {
  console.log("Running seeding of countries");
  const data = countryData;
  for (let i = 0; i < data.length; i++) {
    const country = data[i];
    console.log(`Seeding country: ${country.countryName}`);

    await orm.em.persistAndFlush(
      new Country(
        country.countryId,
        country.countryCode,
        country.countryCode3,
        country.countryName,
        country.continentId,
        country.capital,
        country.area,
        country.population,
        country.latitude,
        country.longitude,
        country.currencyCode
      )
    );

    console.log(`Seeded country: ${country.countryName}`);
  }
};

const runSeeders = async (orm: MikroORM): Promise<boolean> => {
  try {
    console.log("Running seeders in database");
    await seedContinents(orm);
    await seedCountries(orm);
    console.log("Completed running seeders in database");
    return Promise.resolve(true);
  } catch (e) {
    console.log("ERROR: could not run seeders in database:");
    console.log(e);
    return Promise.resolve(false);
  }
};

export default runSeeders;
