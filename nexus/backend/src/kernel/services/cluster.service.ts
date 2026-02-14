import { Injectable, Logger } from '@nestjs/common';
import * as clusterLib from 'cluster';
import * as os from 'os';

const cluster = (clusterLib as any).default || clusterLib;

@Injectable()
export class ClusterService {
  private static readonly logger = new Logger('ClusterService');

  static clusterize(callback: Function): void {
    const isPrimary = (cluster as any).isPrimary || (cluster as any).isMaster;
    if (isPrimary) {
      const numCPUs = os.cpus().length;
      this.logger.log(`MASTER: High-Scale Engine starting. Spawning ${numCPUs} workers...`);

      for (let i = 0; i < numCPUs; i++) {
        (cluster as any).fork();
      }

      (cluster as any).on('exit', (worker: any, code: any, signal: any) => {
        this.logger.warn(`WORKER: ${worker.process.pid} died. Reviving...`);
        (cluster as any).fork();
      });
    } else {
      callback();
    }
  }
}
