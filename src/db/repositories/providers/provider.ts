import type { IRepositoryProvider } from "@/db/repositories/providers/IRepositoryProvider";
import { MikroOrmRepositoryProvider } from "@/db/repositories/mikro-orm/MikroOrmRepositoryProvider";
import { InMemoryRepositoryProvider } from "@/db/repositories/providers/InMemoryRepositoryProvider";

export type RepositoryDriver = "mikro" | "drizzle" | "memory";

let override: IRepositoryProvider | null = null;
let resolved: IRepositoryProvider | null = null;

const driver = (): RepositoryDriver => {
  const d = (process.env.REPOSITORY_DRIVER ?? "mikro").toLowerCase();
  if (d === "drizzle" || d === "memory" || d === "mikro") {
    return d;
  }
  throw new Error(`Unknown REPOSITORY_DRIVER: ${d}`);
};

const createProvider = (d: RepositoryDriver): IRepositoryProvider => {
  switch (d) {
    // case "drizzle": return new DrizzleRepositoryProvider();
    case "memory":
      return new InMemoryRepositoryProvider();
    default:
      return new MikroOrmRepositoryProvider();
  }
};

/**
 * Resolves the active repository provider. Lazy — resolves (and caches) on
 * first call so tests can swap via setRepositoryProvider regardless of
 * import order. Call inside methods; do not cache the result in long-lived
 * module state.
 */
export const getRepositoryProvider = (): IRepositoryProvider =>
  override ?? (resolved ??= createProvider(driver()));

/**
 * Test hook: swap the whole persistence layer. Pass null to reset.
 */
export const setRepositoryProvider = (p: IRepositoryProvider | null): void => {
  override = p;
};
