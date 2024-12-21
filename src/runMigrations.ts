import { Sequelize } from "sequelize-typescript";
import { Umzug, SequelizeStorage } from "umzug";
import sequelize from "./Database";

// Inspiration: https://github.com/sequelize/umzug/tree/main/examples/1.sequelize-typescript

// NOTE: Umzug used to go directly into migrations and bypass sequelize cli which
// itself uses Umzug but has some additional complexities and is not typescript friendly

// NOTE: setup Umzug so can export types for use in the migrations .ts files
// and make the migrator instance usable below
let migrator = new Umzug({
  migrations: {
    glob: ["migrations/*.ts", { cwd: __dirname }],
  },
  context: sequelize,
  storage: new SequelizeStorage({
    sequelize,
  }),
  logger: console,
});

// needed to power .ts based migrations in those /migrations/*.ts files
export type Migration = typeof migrator._types.migration;

const runMigrations = async (sequelize?: Sequelize): Promise<boolean> => {
  // NOTE: one could take sequelize as a parameter
  // and setup the Umzug instance using it as well...
  try {
    console.log(`Running migrations in folder`);
    await migrator.up().then(function (migrations) {
      migrations.forEach(function (e: any) {
        console.log(`Running migration: ${e.name}`);
      });
    });

    return Promise.resolve(true);
  } catch (e) {
    console.log(e);
    return Promise.resolve(false);
  }
};

export default runMigrations;
