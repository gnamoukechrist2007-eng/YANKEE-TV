import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let _pool: Pool | undefined;

function pool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not set");
    _pool = new Pool({ connectionString: url, max: 5 });
  }
  return _pool;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const realDb = drizzle(pool(), { schema });
    return (realDb as unknown as Record<string | symbol, unknown>)[prop as string];
  },
});

export { schema };
