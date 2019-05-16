import http from 'http';
import { HealthRepository } from '../repositories/health.repository';
import { Tasks } from '../tasks';
import { SqlUtils } from './sql-utils';

export function startHealthCheckServer(): void {
  http
    .createServer(async (req, res) => {
      if (req.url !== '/health') {
        res.writeHead(404);
        res.end();
        return;
      }
      const tasksRunning =
        Tasks.runningTasks.length === Tasks.TASKS.length && Tasks.runningTasks.reduce((a, b) => a && b.running!, true);

      await SqlUtils.getDbConnection(connection =>
        HealthRepository.checkConnection(connection).then(result => {
          const mysqlConnectionHealthy = result.success;

          if (tasksRunning && mysqlConnectionHealthy) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('HEALTHY\n');
          } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('UNHEALTHY\n');
          }
        })
      );
    })
    .listen(8080);
}
