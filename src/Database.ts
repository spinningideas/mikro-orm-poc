import { MikroORM, RequestContext } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import config from './mikro-orm.config';

export class Database {
  private static instance: MikroORM;

  static async init(): Promise<MikroORM> {
    if (!Database.instance) {
      Database.instance = await MikroORM.init<PostgreSqlDriver>(config);
      await Database.instance.discoverEntities();
    }
    return Database.instance;
  }

  static async close(): Promise<void> {
    if (Database.instance) {
      await Database.instance.close();
    }
  }

  static getEM() {
    return Database.instance.em;
  }

  static getFork() {
    return Database.instance.em.fork();
  }
}

export const setupRequestContext = async (req: any, res: any, next: (...args: any[]) => unknown) => {
  const orm = await Database.init();
  RequestContext.create(orm.em, next);
};

export default Database;
