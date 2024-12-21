import { MikroORM, EntityManager } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import config from "../mikro-orm.config";

export class Database {
  protected static orm: MikroORM<PostgreSqlDriver>;

  static async init(): Promise<MikroORM<PostgreSqlDriver>> {
    if (!this.orm) {
      try {
        this.orm = await MikroORM.init<PostgreSqlDriver>(config);
        await this.orm.discoverEntities();
      } catch (err: any) {
        console.log("Error initializing database: ", err.message);
        throw err;
      }
    }
    return this.orm;
  }

  async close(): Promise<void> {
    if (Database.orm) {
      await Database.orm.close();
    }
  }

  getOrm(): MikroORM<PostgreSqlDriver> {
    return Database.orm;
  }

  getEM(): EntityManager {
    return Database.orm.em;
  }

  getFork(): EntityManager {
    return Database.orm.em.fork();
  }
}

export default Database;
