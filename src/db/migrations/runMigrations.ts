// Database ORM specific feature to persist data
import { MikroORM } from "@mikro-orm/core";

const runMigrations = async (orm?: MikroORM): Promise<boolean> => {
  try {
    console.log(`Running migrations in folder`);

    await orm.getMigrator().up();

    return Promise.resolve(true);
  } catch (e) {
    console.log(e);
    return Promise.resolve(false);
  }
};

export default runMigrations;
