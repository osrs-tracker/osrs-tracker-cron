import { PoolConfig } from 'mysql';

export interface IConfig {
  poolConfig: PoolConfig;
  toxMqUrl: string;
}
