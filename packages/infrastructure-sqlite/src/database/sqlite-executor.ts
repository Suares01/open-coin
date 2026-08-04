import type {
  SqliteExecutionResult,
  SqliteParameters,
} from "./sqlite-value.js";

export interface SqliteExecutor {
  execute(
    sql: string,
    parameters?: SqliteParameters,
  ): Promise<SqliteExecutionResult>;
  query<Row extends Record<string, unknown>>(
    sql: string,
    parameters?: SqliteParameters,
  ): Promise<Row[]>;
  executeBatch(sql: string): Promise<void>;
}
