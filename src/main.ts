import cluster from 'cluster';
import { collectDefaultMetrics } from 'prom-client';
import { startHealthCheckServer } from './app/common/health-server';
import { Logger } from './app/common/logger';
import { startMetricsServer } from './app/common/metrics-server';
import { Tasks } from './app/tasks';

if (cluster.isMaster) {
  Logger.log('SERVER ACTIVE - FORKING WORKER');
  cluster.fork();

  startMetricsServer();

  cluster.on('exit', (worker: cluster.Worker) => {
    Logger.log(`WORKER ${worker.id} DIED - CREATING NEW WORKER`);
    cluster.fork();
  });
} else {
  collectDefaultMetrics();

  Logger.log(`WORKER ${cluster.worker.id} CREATED - INITIALISING TASKS`);
  Tasks.start();
  startHealthCheckServer();
}
