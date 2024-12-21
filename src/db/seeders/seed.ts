import Database from "db/Database";
import runSeeders from "./runSeeders";

async function seed(): Promise<boolean> {
  try {
    const db = await Database.init();
    let seedersRunSuccessfully = false;
    console.log(`Running database seeding`);
    seedersRunSuccessfully = await runSeeders(db);
    console.log("Database seeding setup ok?:", seedersRunSuccessfully);
    return Promise.resolve(seedersRunSuccessfully);
  } catch (err) {
    console.error("Error seeding up the database", err);
    return Promise.resolve(false);
  }
}

seed().then((result) => {
  console.log("Database seeding ok?:", result);
});
