import type { SqliteExecutor } from "./sqlite-executor.js";

export interface SqliteDatabase extends SqliteExecutor {
  transaction<T>(
    work: (transaction: SqliteExecutor) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}
