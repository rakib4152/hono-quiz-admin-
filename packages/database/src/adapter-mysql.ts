/**
 * @prisma/adapter-mysql
 * MySQL2 Driver Adapter for Prisma Client on Cloudflare Workers and Serverless runtimes.
 *
 * Implements Prisma's DriverAdapter interface using `mysql2/promise` over
 * Cloudflare Workers TCP sockets (`nodejs_compat` net.Socket) and Hyperdrive pooling.
 */

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection } from 'mysql2/promise';

export const ColumnTypeEnum = {
  Int32: 0,
  Int64: 1,
  Float: 2,
  Double: 3,
  Numeric: 4,
  Boolean: 5,
  Character: 6,
  Text: 7,
  Date: 8,
  Time: 9,
  DateTime: 10,
  Json: 11,
  Enum: 12,
  Bytes: 13,
  Set: 14,
  Uuid: 15,
  Unknown: 128,
} as const;

export type ColumnType = (typeof ColumnTypeEnum)[keyof typeof ColumnTypeEnum];

// Map mysql2 column types to Prisma ColumnTypeEnum
function mapMysqlTypeToColumnType(columnType?: number): ColumnType {
  switch (columnType) {
    case 1: // TINY
    case 2: // SHORT
    case 3: // LONG
    case 9: // INT24
    case 16: // BIT
      return ColumnTypeEnum.Int32;
    case 8: // LONGLONG
      return ColumnTypeEnum.Int64;
    case 4: // FLOAT
      return ColumnTypeEnum.Float;
    case 5: // DOUBLE
      return ColumnTypeEnum.Double;
    case 0: // DECIMAL
    case 246: // NEWDECIMAL
      return ColumnTypeEnum.Numeric;
    case 10: // DATE
    case 14: // NEWDATE
      return ColumnTypeEnum.Date;
    case 11: // TIME
      return ColumnTypeEnum.Time;
    case 7: // TIMESTAMP
    case 12: // DATETIME
      return ColumnTypeEnum.DateTime;
    case 245: // JSON
      return ColumnTypeEnum.Json;
    case 249: // TINY_BLOB
    case 250: // MEDIUM_BLOB
    case 251: // LONG_BLOB
    case 252: // BLOB
      return ColumnTypeEnum.Bytes;
    case 247: // ENUM
      return ColumnTypeEnum.Enum;
    case 248: // SET
      return ColumnTypeEnum.Set;
    case 15: // VARCHAR
    case 253: // VAR_STRING
    case 254: // STRING
    default:
      return ColumnTypeEnum.Text;
  }
}

export interface Query {
  sql: string;
  args: Array<unknown>;
}

export interface ResultSet {
  columnNames: Array<string>;
  columnTypes: Array<ColumnType>;
  rows: Array<Array<unknown>>;
  lastInsertId?: string;
}

export interface ResultOk<T> {
  ok: true;
  value: T;
}

export interface ResultErr {
  ok: false;
  error: {
    kind: string;
    id?: string;
    message: string;
    code?: string;
  };
}

export type Result<T> = ResultOk<T> | ResultErr;

export class PrismaMysql {
  readonly provider = 'mysql' as const;
  readonly adapterName = '@prisma/adapter-mysql';
  readonly pool: Pool;

  constructor(poolOrConfig: Pool | string | mysql.PoolOptions) {
    if (typeof poolOrConfig === 'string') {
      this.pool = mysql.createPool(poolOrConfig);
    } else if (typeof (poolOrConfig as Pool).query === 'function') {
      this.pool = poolOrConfig as Pool;
    } else {
      this.pool = mysql.createPool(poolOrConfig as mysql.PoolOptions);
    }
  }

  async queryRaw(query: Query): Promise<Result<ResultSet>> {
    try {
      const [rows, fields] = await this.pool.query({
        sql: query.sql,
        values: query.args,
        rowsAsArray: true,
      });

      const columnNames = Array.isArray(fields) ? fields.map((f: any) => f.name) : [];
      const columnTypes = Array.isArray(fields)
        ? fields.map((f: any) => mapMysqlTypeToColumnType(f.columnType))
        : [];

      const rawRows = Array.isArray(rows) ? (rows as unknown[][]) : [];

      return {
        ok: true,
        value: {
          columnNames,
          columnTypes,
          rows: rawRows,
        },
      };
    } catch (err: any) {
      return {
        ok: false,
        error: {
          kind: 'GenericJs',
          id: err?.code || 'ERR_QUERY_FAILED',
          message: err?.message || String(err),
          code: err?.code,
        },
      };
    }
  }

  async executeRaw(query: Query): Promise<Result<number>> {
    try {
      const [result] = await this.pool.execute({
        sql: query.sql,
        values: query.args,
      });

      const affected = (result as any)?.affectedRows ?? 0;
      return {
        ok: true,
        value: affected,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: {
          kind: 'GenericJs',
          id: err?.code || 'ERR_EXECUTE_FAILED',
          message: err?.message || String(err),
          code: err?.code,
        },
      };
    }
  }

  async transactionContext(): Promise<Result<any>> {
    try {
      const connection: PoolConnection = await this.pool.getConnection();
      await connection.beginTransaction();

      return {
        ok: true,
        value: {
          provider: 'mysql',
          adapterName: '@prisma/adapter-mysql',
          queryRaw: async (query: Query): Promise<Result<ResultSet>> => {
            try {
              const [rows, fields] = await connection.query({
                sql: query.sql,
                values: query.args,
                rowsAsArray: true,
              });

              const columnNames = Array.isArray(fields) ? fields.map((f: any) => f.name) : [];
              const columnTypes = Array.isArray(fields)
                ? fields.map((f: any) => mapMysqlTypeToColumnType(f.columnType))
                : [];

              return {
                ok: true,
                value: {
                  columnNames,
                  columnTypes,
                  rows: Array.isArray(rows) ? (rows as unknown[][]) : [],
                },
              };
            } catch (err: any) {
              return {
                ok: false,
                error: {
                  kind: 'GenericJs',
                  id: err?.code || 'ERR_TX_QUERY_FAILED',
                  message: err?.message || String(err),
                },
              };
            }
          },
          executeRaw: async (query: Query): Promise<Result<number>> => {
            try {
              const [result] = await connection.execute({
                sql: query.sql,
                values: query.args,
              });
              return { ok: true, value: (result as any)?.affectedRows ?? 0 };
            } catch (err: any) {
              return {
                ok: false,
                error: {
                  kind: 'GenericJs',
                  id: err?.code || 'ERR_TX_EXECUTE_FAILED',
                  message: err?.message || String(err),
                },
              };
            }
          },
          commit: async (): Promise<Result<void>> => {
            try {
              await connection.commit();
              connection.release();
              return { ok: true, value: undefined };
            } catch (err: any) {
              connection.release();
              return {
                ok: false,
                error: { kind: 'GenericJs', message: err?.message || String(err) },
              };
            }
          },
          rollback: async (): Promise<Result<void>> => {
            try {
              await connection.rollback();
              connection.release();
              return { ok: true, value: undefined };
            } catch (err: any) {
              connection.release();
              return {
                ok: false,
                error: { kind: 'GenericJs', message: err?.message || String(err) },
              };
            }
          },
        },
      };
    } catch (err: any) {
      return {
        ok: false,
        error: {
          kind: 'GenericJs',
          id: err?.code || 'ERR_TRANSACTION_FAILED',
          message: err?.message || String(err),
        },
      };
    }
  }

  getConnectionInfo(): Result<{ maxBindValues: number }> {
    return {
      ok: true,
      value: {
        maxBindValues: 65535,
      },
    };
  }
}

export default PrismaMysql;
