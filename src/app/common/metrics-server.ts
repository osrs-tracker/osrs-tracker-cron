import http from 'http';
import { AggregatorRegistry } from 'prom-client';

export function startMetricsServer(): void {
  const aggregatorRegistry = new AggregatorRegistry();

  http
    .createServer(async (req, res) => {
      aggregatorRegistry.clusterMetrics((err, metrics) => {
        if (req.url !== '/metrics') {
          res.writeHead(404);
          res.end();
          return;
        }
        if (err) console.log(err);
        res.writeHead(200, { 'Content-Type': aggregatorRegistry.contentType });
        res.end(metrics);
      });
    })
    .listen(8088);
}
