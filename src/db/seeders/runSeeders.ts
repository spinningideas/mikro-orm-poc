// data
import continentData from "@/db/seeders/data/continentData";
import countryData from "@/db/seeders/data/countryData";
// models
import { Continent } from "@/db/models/Continent";
import { Country } from "@/db/models/Country";
// Database ORM specific feature to persist data
import { MikroORM, EntityManager } from "@mikro-orm/core";

const seedContinents = async (em: EntityManager) => {
  const count = await em.count(Continent);
  if (count > 0) {
    console.log("Continents already seeded, skipping");
    return;
  }
  console.log("Running seeding of continents");
  const data = continentData;
  for (let i = 0; i < data.length; i++) {
    const continent = data[i] as Continent;
    console.log(`Seeding continent: ${continent.continentName}`);

    em.persist(
      new Continent(
        continent.continentId,
        continent.continentCode,
        continent.continentName
      )
    );
  }
  await em.flush();
};

const seedCountries = async (em: EntityManager) => {
  const count = await em.count(Country);
  if (count > 0) {
    console.log("Countries already seeded, skipping");
    return;
  }
  console.log("Running seeding of countries");
  const data = countryData;
  for (let i = 0; i < data.length; i++) {
    const country = data[i];
    console.log(`Seeding country: ${country.countryName}`);

    const newCountry = new Country(
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
      country.currencyCode,
      country.currencyName,
      country.languages
    );
    newCountry.continent = em.getReference(Continent, country.continentId);
    em.persist(newCountry);

    console.log(`Seeded country: ${country.countryName}`);
  }
  await em.flush();
};

const runSeeders = async (orm: MikroORM): Promise<boolean> => {
  try {
    console.log("Running seeders in database");
    const em = orm.em.fork();
    await seedContinents(em);
    await seedCountries(em);
    console.log("Completed running seeders in database");
    return true;
  } catch (e) {
    console.log("ERROR: could not run seeders in database:");
    console.log(e);
    return false;
  }
};

export default runSeeders;
