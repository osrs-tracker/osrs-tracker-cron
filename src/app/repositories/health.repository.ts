import { PoolConnection } from 'mysql';

export class HealthRepository {
  static checkConnection(connection: PoolConnection): Promise<{ success: boolean }> {
    return new Promise(resolve => connection.query('show tables', outerError => resolve({ success: !outerError })));
  }
}
