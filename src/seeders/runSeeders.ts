import { Database } from '../Database';
import { Continent } from '../models/Continent';
import { Country } from '../models/Country';

const seedContinents = async () => {
  const em = Database.getFork();
  
  const continents = [
    new Continent('NA', 'North America'),
    new Continent('SA', 'South America'),
    new Continent('EU', 'Europe'),
    new Continent('AS', 'Asia'),
    new Continent('AF', 'Africa'),
    new Continent('OC', 'Oceania'),
    new Continent('AN', 'Antarctica')
  ];

  await em.persistAndFlush(continents);
  return continents;
};

const seedCountries = async (continents: Continent[]) => {
  const em = Database.getFork();
  
  const northAmerica = continents.find(c => c.continentCode === 'NA');
  const europe = continents.find(c => c.continentCode === 'EU');

  if (!northAmerica || !europe) {
    throw new Error('Required continents not found');
  }

  const countries = [
    new Country('US', 'USA', 'United States', northAmerica.continentId),
    new Country('CA', 'CAN', 'Canada', northAmerica.continentId),
    new Country('GB', 'GBR', 'United Kingdom', europe.continentId),
    new Country('FR', 'FRA', 'France', europe.continentId)
  ];

  await em.persistAndFlush(countries);
};

const runSeeders = async (): Promise<boolean> => {
  try {
    await Database.init();
    const continents = await seedContinents();
    await seedCountries(continents);
    await Database.close();
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
};

export default runSeeders;
