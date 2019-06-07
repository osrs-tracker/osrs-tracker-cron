import { createPool, PoolConnection } from 'mysql';
import { config } from '../../../config/config';
import { Logger } from '../logger';

export class SqlUtils {
  private static readonly DB_POOL = createPool({
    ...config.poolConfig,
    connectionLimit: 20,
    timezone: 'Z',
  });

  private static setupDbConnection(): Promise<PoolConnection> {
    return new Promise<PoolConnection>((resolve, reject) => {
      const MAX_RETRY_COUNT = 3;
      let retryCount = 0;

      const getConnection = () =>
        this.DB_POOL.getConnection((err, connection) => {
          retryCount++;

          if (retryCount < MAX_RETRY_COUNT && (err || !connection)) {
            Logger.log('FAILED TO CONNECT WITH DATABASE - RETRYING IN 1 SECOND.', err);
            setTimeout(() => getConnection(), 1000);
          } else if (retryCount >= MAX_RETRY_COUNT) {
            reject();
          } else resolve(connection);
        });
      getConnection();
    });
  }

  static async getDbConnection(dbConnectionLogic: (connection: PoolConnection) => Promise<any>): Promise<void> {
    let connection: PoolConnection | null = null;
    try {
      connection = await SqlUtils.setupDbConnection();
    } catch (e) {
      Logger.log('FAILED TO SETUP DATABASE CONNECTION.', e);
    }

    if (!connection) return;

    try {
      await dbConnectionLogic(connection);
    } catch (e) {
      Logger.log('UNEXPECTED ERROR OCCURED.', e);
    }

    try {
      connection.release();
    } catch (e) {
      Logger.log('FAILED TO RELEASE CONNECTION, COULD BE RELEASED ALREADY.', e);
    }
  }
}
