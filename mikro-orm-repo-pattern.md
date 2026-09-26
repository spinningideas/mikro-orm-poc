# The Repository Pattern and Dependency Injection with MikroORM

This document explains two patterns used in this codebase - the **repository
pattern** and **dependency injection (DI)** - why they are useful, and the
design options for applying them. The running example is the geography API
in `src/app.ts`, which serves data from the `continents` and `countries`
tables.

---

## Part 1: The Repository Pattern

### 1.1 What it is

The repository pattern puts a **collection-like abstraction** between your
application code and the ORM. Application code asks the repository for
objects ("all continents", "the country with code `US`") instead of writing
ORM-specific calls (`em.find`, `em.findAndCount`, `nativeUpdate`) itself.

```
┌──────────┐     ┌──────────┐     ┌────────────┐     ┌───────────────┐     ┌──────────┐     ┌────┐
│  Routes  │ ──► │ Service  │ ──► │ Repository │ ──► │  Repository   │ ──► │   ORM    │ ──► │ DB │
│ (app.ts) │     │(Geography│     │  provider  │     │ (IBaseReposi- │     │(MikroORM)│     │    │
│          │     │DataServ.)│     │(IRepository│     │  tory port)   │     │          │     │    │
│          │     │          │     │ Provider)  │     │               │     │          │     │    │
└──────────┘     └──────────┘     └────────────┘     └───────────────┘     └──────────┘     └────┘
   HTTP            business         composition        persistence           entity
   concerns        logic            root               queries              mapping
```

The layering here:

| Layer        | File                                                                  | Responsibility                                        |
| ------------ | --------------------------------------------------------------------- | ----------------------------------------------------- |
| Route        | `src/app.ts`                                                          | params, status codes, response shape                  |
| Service      | `src/services/GeographyDataService.ts`                                | orchestration - which queries, in which order         |
| Provider     | `src/db/repositories/provider.ts`, `IRepositoryProvider.ts`           | composition root - which repo implementation per entity |
| Repository   | `src/db/repositories/MikroOrmBaseRepository.ts`, `CountryRepository.ts` | how entities are queried/persisted                    |
| ORM + models | `src/db/models/Continent.ts`, `Country.ts`                            | table ↔ object mapping                              |

Terms worth knowing:

- **Port** - `IBaseRepository<M>`: the ORM-neutral contract
  (`findAll`, `findOneWhere`, `findWherePagedSorted`, `search`,
  `createNew`, `updateWhere`, `nativeUpdateWhere`, `deleteWhere`,
  `transactional` …). Consumers depend on this interface.
- **Criteria DSL** - `CriteriaShape<M>` in `Criteria.ts`: the ORM-neutral
  filter language the port accepts (plain objects, operators like `$ilike`,
  `$gte`, `$in`, combinators `$and`/`$or`/`$not`, nested relation shapes).
  The `Criteria` class in the same file is an optional fluent builder.
- **Adapter** - `MikroOrmBaseRepository<T>`: the MikroORM implementation of
  the port (it extends `EntityRepository<T>` and adds the port methods). Its
  `toFilterQuery()` translates `CriteriaShape` into MikroORM `FilterQuery`.
- **Domain repository** - `CountryRepository`: a subclass of the adapter
  that adds queries specific to one entity (`findByContinentCode`,
  `findByCurrencyCode`, `findByMinPopulation`). This is where queries too
  specific for the generic contract live.
- **Provider** - `IRepositoryProvider`: the composition root. `repoFor(entity)`
  hands out the right repository per entity; `MikroOrmRepositoryProvider` and
  `InMemoryRepositoryProvider` are the two implementations.

### 1.2 Why it's useful

1. **One place for query logic.** Without repositories, the same
   `findOne({ continentCode })` guard and `findAndCount` paging math were
   copy-pasted across every route in `app.ts`. Now each query exists once,
   named for its intent: `getCountriesByContinentCode` reads better than
   `findAndCount({ continentId: ... }, { limit, offset, orderBy })`.

2. **A testing seam.** Routes and services can be unit-tested against an
   in-memory fake implementing `IBaseRepository` - no Postgres, no
   migrations. This codebase ships one: `InMemoryRepositoryProvider`
   interprets the same `CriteriaShape` objects with plain JS operators, and
   `setRepositoryProvider(provider)` installs it as the composition root
   (`tests/` still runs against real Postgres, which the seam makes
   optional rather than mandatory).

3. **A swap seam.** If the project ever moves to a different ORM or a
   different persistence mechanism, only the adapter changes. The port is
   fully neutral: `IBaseRepository` has zero `@mikro-orm` imports - it
   exposes `CriteriaShape` plus plain payload types (`NewEntityData`,
   `FindOneOptions`, `FindManyOptions`, `UpsertOptions`). The MikroORM
   vocabulary is quarantined in `MikroOrmBaseRepository.toFilterQuery()`,
   which translates `CriteriaShape` → `FilterQuery`. The shipped
   `InMemoryRepositoryProvider` is a working second adapter, and the
   `REPOSITORY_DRIVER` env var (`mikro` | `memory`) swaps implementations
   at the composition root - proof the seam is real.

4. **Depend on the interface, not the class.** `MikroOrmBaseRepository`
   extends `EntityRepository<T>`, so anything holding the concrete class
   can bypass the contract (`this.em`, `nativeDelete`, …). The seam only
   exists for consumers typed as `IBaseRepository<M>`.

### 1.3 The request-scoped EntityManager: the wrinkle that drives everything else

`app.ts` wraps every request in MikroORM's `RequestContext`:

```ts
app.use((req, res, next) => {
  if (db) RequestContext.create(db.em, next); else next();
});
```

Each request gets a forked EntityManager on AsyncLocalStorage - its own
identity map and transaction boundary. This has one huge consequence for
wiring:

> **Anything that captures an `em` at construction time must be built inside
> the request (or resolve the EM lazily), or it silently uses a stale
> boot-time fork.**

In this codebase that's safe by construction at two levels: `app.ts`
builds one `IRepositoryProvider` at startup (`getRepositoryProvider()`) and
injects it into each `GeographyDataService`, but the provider resolves the
ORM **lazily** - `repoFor()` calls `Database.getOrm()`/`Database.getEM()`
at call time, so the repository it returns binds `orm.em`, which delegates
each operation to the current `RequestContext` EM. A long-lived provider is
therefore correct even though the EM is per-request. `provider.transactional()`
goes further: it runs `em.transactional()` and rebinds `RequestContext` to
the transaction EM, so every `repoFor()` inside the callback resolves the
transaction-scoped manager.

---

## Part 2: Dependency Injection

### 2.1 What it is

Dependency injection means a class **receives** its collaborators instead of
**constructing** them:

```ts
// NOT injected - the service decides what it gets
class GeographyDataService {
  private countries = new CountryRepository(orm);
}

// Injected - the caller decides
class GeographyDataService {
  constructor(private countries: IBaseRepository<Country>) {}
}
```

"DI" ranges from passing a constructor argument by hand (no library) to a
full **container** that registers bindings (`IBaseRepository<Country>` →
`CountryRepository`) and resolves object graphs automatically.

### 2.2 Why it's useful, and why it's *needed* here

1. **Testability.** `new GeographyDataService(orm, { countries: fake })`
   beats `vi.mock("../db/repositories/CountryRepository")` - the fake is
   explicit, typed, and per-test.

2. **Lifetime correctness - the real reason DI matters with MikroORM.**
   Because the EM is request-scoped (§1.3), the question "who builds the
   repository, and when?" is not stylistic - it's correctness. A DI design
   must ensure repositories either (a) are built per request, (b) bind the
   context-delegating `orm.em`, or (c) resolve their EM lazily. A naive
   singleton service holding a repo built from `orm.em.fork()` at startup
   would bypass request isolation entirely.

3. **One swap point.** If dependencies enter through a constructor or a
   registry, changing "which repository implementation" is a wiring change,
   not a code change.

4. **Honest dependencies.** Constructor parameters declare what a class
   needs; a service that secretly imports `Database` hides that coupling.

### 2.3 Do you need a DI *library*?

No - DI the *pattern* is free. A library buys you:

- **Automatic graph resolution** (service → repos → EM without hand-wiring)
- **Lifetimes** (`SINGLETON`/`SCOPED`/`TRANSIENT` - `SCOPED` maps exactly
  onto the request-scoped EM)
- **A single composition root** to swap implementations

A library costs you: call sites become `container.resolve(...)` instead of
`new Service(...)`, plus decorators/string tokens depending on the library.

At this codebase's scale (2 entities, 1 service, 5 routes), hand-wired DI
delivers most of the benefit. The options below show the full spectrum.

---

## Part 3: Options for wiring repositories into services

Use these when deciding how much DI machinery a MikroORM service needs.
They are ordered least → most machinery; each keeps the request-scoped-EM
invariant in a different way.

### Option A: Service owns repositories built from `orm.em` *(superseded - see C)*

The service takes the `MikroORM` instance and constructs its repos; routes
construct the service per request.

```ts
export class GeographyDataService {
  private readonly continents: MikroOrmBaseRepository<Continent>;
  private readonly countries: CountryRepository;

  constructor(orm: MikroORM<PostgreSqlDriver>) {
    this.continents = new MikroOrmBaseRepository<Continent>(orm, Continent);
    this.countries = new CountryRepository(orm);
  }
}

// app.ts
app.get("/countries/:continentCode", async (req, res) => {
  const service = new GeographyDataService(db);
  const countries = await service.getCountriesByContinentCode(
    req.params.continentCode as string
  );
  return countries ? res.json(countries)
                   : res.status(404).json({ message: "..." });
});
```

- **EM safety:** repos bind `orm.em`, which resolves the `RequestContext` EM
  per operation - correct even if the service outlived a request.
- **Pros:** minimal code; no mocking needed beyond module mocks; matches
  existing style.
- **Cons:** service still imports ORM + entities; DB-free unit tests need
  `vi.mock`, not a passed-in fake.
- **Choose when:** the codebase is small and tests can hit a real (or
  containerized) database. This codebase started here and moved to C when
  the provider abstraction was introduced.

### Option B: Constructor injection of repositories

The service takes `IBaseRepository` deps with a default that builds the
Mikro wiring - `new GeographyDataService(db)` keeps compiling, tests pass
fakes.

```ts
export interface GeographyServiceDeps {
  continents: IBaseRepository<Continent>;
  countries: IBaseRepository<Country>;
}

export default class GeographyDataService {
  private readonly repos: GeographyServiceDeps;

  constructor(orm: MikroORM<PostgreSqlDriver>, deps?: GeographyServiceDeps) {
    this.repos = deps ?? {
      continents: new MikroOrmBaseRepository<Continent>(orm, Continent),
      countries: new CountryRepository(orm),
    };
  }
}
```

- **EM safety:** same as A for the default path. If the service ever becomes
  long-lived *and* repos were built from a fork (not `orm.em`), switch to
  `() => IBaseRepository` factories so resolution happens per call.
- **Pros:** real dependency inversion; `new GeographyDataService(orm, {
  continents: fake, countries: fake })` - no DB, no module mocking.
- **Cons:** two injection mechanisms in one constructor; repeated per
  service.
- **Choose when:** you want unit tests without Postgres but aren't ready for
  a provider/container. This is the usual next step after A.

### Option C: Repository provider (gateway) *(current)*

One port hands out repositories per entity; services depend only on it.
Swapping persistence becomes a one-line change at the composition root.
This is what the codebase implements today:

```ts
// IRepositoryProvider.ts - services see only this
export interface IRepositoryProvider {
  repoFor<M extends object>(entity: EntityRef<M>): IBaseRepository<M>;
  queryRaw<R = unknown>(sql: string, params?: unknown[]): Promise<R[]>;
  transactional(work: (p: IRepositoryProvider) => Promise<void>): Promise<void>;
}

// MikroOrmRepositoryProvider.ts - a registry maps entities with domain
// repos to their factory; everything else gets MikroOrmBaseRepository
const domainRepos = new Map<EntityRef<any>, DomainRepoFactory>([
  [Country, (orm) => new CountryRepository(orm)],
]);
```

```ts
// provider.ts - the composition root / service locator
export function getRepositoryProvider(): IRepositoryProvider {
  // resolves REPOSITORY_DRIVER env var: "mikro" (default) | "memory"
  // lazily constructs MikroOrmRepositoryProvider or InMemoryRepositoryProvider
}
export function setRepositoryProvider(provider: IRepositoryProvider): void; // test hook
```

```ts
// GeographyDataService.ts - MikroORM-free
export default class GeographyDataService {
  constructor(private readonly provider?: IRepositoryProvider) {}
  getCountryByCode = (code: string) =>
    this.providerOrDefault().repoFor(Country).findOneWhere({ countryCode: code });
}

// app.ts - provider set up once at startup, injected per request
repositoryProvider = getRepositoryProvider();   // inside configureDatabase()
const service = new GeographyDataService(repositoryProvider);
```

- **EM safety:** `repoFor()` calls `Database.getOrm()` lazily per call and
  binds `orm.em` (the context-delegating EM), so a singleton provider stays
  request-safe. `transactional()` wraps `em.transactional()` and rebinds
  `RequestContext` so inner `repoFor()` calls hit the transaction EM.
- **Pros:** services stop importing MikroORM entirely - the cleanest seam;
  `InMemoryRepositoryProvider` ships as the working proof, swapped via
  `REPOSITORY_DRIVER=memory` or `setRepositoryProvider()` in tests; the
  domain registry keeps `CountryRepository`'s bespoke queries reachable.
- **Cons:** extra machinery (port + provider interface + two
  implementations + registry) that one service alone wouldn't justify - it
  pays for itself as the demonstration of the neutral port.
- **Choose when:** you want the ORM-swap/test seams to be real today, or a
  second/third service makes per-service wiring repeat.

### Option D: DI container

A container centralizes "who builds what, with which lifetime". The `SCOPED`
lifetime is the interesting one: it maps onto the request-scoped EM.
`tsconfig.json` already enables `experimentalDecorators`/
`emitDecoratorMetadata`, and the container scope middleware would be
registered **after** `RequestContext.create` in `app.ts`.

#### D1. Hand-rolled registry (zero dependencies)

```ts
// src/services/repos.ts - a shared module with a test override hook
let factory = (orm: MikroORM) => ({
  continents: () => new MikroOrmBaseRepository<Continent>(orm, Continent),
  countries: () => new CountryRepository(orm),
});
export const repos = (orm) => factory(orm);
export const useRepositoryFactory = (f) => (factory = f);   // tests swap here
```

Simplest possible "container" - a service locator. Zero deps; dependencies
stay implicit. **This is effectively what `provider.ts` implements:**
`getRepositoryProvider()` lazily memoizes the driver-selected provider,
and `setRepositoryProvider()` is the test override hook. The difference is
that the registry hands out a whole `IRepositoryProvider` rather than
per-repository factories, which is what makes `REPOSITORY_DRIVER=memory` a
one-line swap.

#### D2. Awilix: no decorators *(best library fit)*

```ts
import { createContainer, asClass, asFunction, Lifetime } from "awilix";
const container = createContainer({ injectionMode: "CLASSIC" });
container.register({
  geographyDataService: asClass(GeographyDataService, { lifetime: Lifetime.SCOPED }),
});
// app.ts, AFTER the RequestContext middleware:
app.use((req, _res, next) => { req.scope = container.createScope(); next(); });
const svc = req.scope.resolve<GeographyDataService>("geographyDataService");
```

`createScope()` gives a fresh object graph per request - native fit for the
scoped EM. Trade-offs: name-based resolution is stringly-typed in CLASSIC
mode, and every `new Service(...)` call site becomes `req.scope.resolve(...)`.

#### D3. tsyringe: decorators + `reflect-metadata`

`@injectable()` + `@inject(Symbol)` on constructor params (interfaces erase
at runtime, hence tokens), `container.createChildContainer()` per request.
Idiomatic-looking injection, but adds decorator boilerplate and breaks
`new GeographyDataService(db)` call sites.

#### D4. InversifyJS: full-featured, heaviest

Explicit `bind<T>(T).to(Impl)` modules, interceptors, contextual binding.
Worth it only for dozens of collaborators; otherwise D2/D3 give the same
seam with less ceremony.

#### D5. node-dependency-injection: Symfony-style compiled container

`ContainerBuilder` + `Definition`s + `compile()`, YAML config, `ndi` CLI,
and **conditional registration** (`Condition.envEquals("ORM", "drizzle")`)
which is a genuinely neat fit for the ORM-swap goal. But: no request scope
(`shared` is the only lifetime - everything downstream of a request EM must
be `shared = false`, easy to forget) and a small community (~300 stars).

#### Comparison

|                              | Deps                  | Decorators | Request scope                       | Effort here |
| ---------------------------- | --------------------- | ---------- | ----------------------------------- | ----------- |
| D1 registry                  | none                  | no         | via `orm.em` context resolution    | lowest      |
| D2 awilix                    | 1                     | no         | `createScope()` - native fit      | medium      |
| D3 tsyringe                  | 2 (+reflect-metadata) | yes        | `createChildContainer()`            | medium-high |
| D4 inversify                 | 2+                    | yes        | custom scope mgmt                   | highest     |
| D5 node-dependency-injection | 1 (+express pkg)      | no         | none - `shared:false` + factories | medium-high |

**The one rule for any container:** the EM must enter the graph lazily -
repos registered `SCOPED`/factory-resolved inside the `RequestContext`, or
built from `orm.em` (which resolves the contextual EM per call). Never
register a `SINGLETON` repo built from `orm.em.fork()` - it captures a
boot-time fork and silently bypasses request isolation.

---

## Part 4: How to choose

| Situation                                             | Recommended option |
| ----------------------------------------------------- | ------------------ |
| Small service count, tests hit real DB                | **A**              |
| Want DB-free unit tests for services                  | **B**              |
| Multiple services; real intention to swap ORM/adapter | **C** (this codebase - port is neutral, in-memory adapter ships) |
| Growing service graph; want lifetimes/scoping         | **D2 (awilix)** - D1 if you want zero deps |
| Large team wanting compile-time-inspectable wiring    | D5; D3/D4 rarely earn their ceremony here |

**Adopting a DI library is optional and orthogonal to the repository
pattern.** The repository pattern is what buys the seam; DI is about *who
wires it*. In a MikroORM app the deciding factor is almost always the
request-scoped `EntityManager`: whichever option you pick, verify that
repositories resolve the contextual EM per request rather than caching a
fork. Everything else is ergonomics.

**Current trajectory for this codebase:** it now runs **C on a D1-style
registry** - `getRepositoryProvider()` is the composition root,
`REPOSITORY_DRIVER` selects the adapter (`mikro`/`memory`), and
`setRepositoryProvider()` is the test seam. The port neutralization that
used to gate this is done (`CriteriaShape` + neutral payload types, with
`toFilterQuery()` quarantining MikroORM in the adapter). Reach for a real
container (D2) only when hand-wiring itself becomes the problem - e.g. a
growing service graph that wants scoped lifetimes or automatic graph
resolution.
