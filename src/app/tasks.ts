import { CronJob } from 'cron';
import { OsrsDbuTask } from './tasks/osrs-dbu.task';
import { XpProcessPlayers } from './tasks/xp-process-players.task';
import { XpQueuePlayers } from './tasks/xp-queue-players.task';

export class Tasks {
  static init(): void {
    this.startJob('0 0 0 * * *', XpQueuePlayers.runTask); // QUEUE ALL PLAYERS FOR XP TRACKING
    this.startJob('0 * * * * *', XpProcessPlayers.runTask); // PROCESS PLAYERS FOR XP DATAPOINTS
    this.startJob('0 0 * * * *', OsrsDbuTask.runTask);
  }

  private static startJob(cron: string, task: () => void): void {
    new CronJob(cron, task, undefined, true, 'UTC');
  }
}
