import { MikroORM, RequestContext } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import Database from "@/db/Database";
import type { IBaseRepository } from "@/db/repositories/IBaseRepository";
import MikroOrmBaseRepository from "@/db/repositories/mikro-orm/MikroOrmBaseRepository";
import CountryRepository from "@/db/repositories/CountryRepository";
import Country from "@/db/models/Country";
import type {
  EntityRef,
  IRepositoryProvider,
} from "@/db/repositories/providers/IRepositoryProvider";

type DomainRepoFactory = (
  orm: MikroORM<PostgreSqlDriver>
) => IBaseRepository<any>;

/**
 * Entity → domain-repository registry. Entities listed here get their
 * domain repository (with custom query methods) from repoFor; everything
 * else gets a plain MikroOrmBaseRepository.
 */
const DEFAULT_DOMAIN_REPOS: Map<EntityRef<any>, DomainRepoFactory> = new Map([
  [Country, (orm) => new CountryRepository(orm)],
]);

/**
 * MikroORM adapter for IRepositoryProvider. Resolves the ORM (and its
 * global EntityManager, which delegates to the current RequestContext EM)
 * at call time, so repos always bind the request/transaction-scoped
 * EntityManager rather than a stale boot-time fork.
 */
export class MikroOrmRepositoryProvider implements IRepositoryProvider {
  constructor(
    private readonly domainRepos: Map<
      EntityRef<any>,
      DomainRepoFactory
    > = DEFAULT_DOMAIN_REPOS
  ) {}

  repoFor<T extends object>(entity: EntityRef<T>): IBaseRepository<T> {
    const orm = Database.getOrm();
    const factory = this.domainRepos.get(entity);
    return factory
      ? (factory(orm) as IBaseRepository<T>)
      : new MikroOrmBaseRepository(orm, entity);
  }

  queryRaw<R = unknown>(sql: string, params: unknown[] = []): Promise<R[]> {
    return Database.getEM()
      .getConnection()
      .execute(sql, params as any[]) as Promise<R[]>;
  }

  /**
   * Runs `work` inside a DB transaction. The transactional EM is bound to
   * the ambient RequestContext so every repoFor() call inside `work` shares
   * the transaction.
   */
  transactional<R>(work: () => Promise<R>): Promise<R> {
    return Database.getEM().transactional((txEm) =>
      RequestContext.create(txEm, () => work())
    );
  }
}

export default MikroOrmRepositoryProvider;
