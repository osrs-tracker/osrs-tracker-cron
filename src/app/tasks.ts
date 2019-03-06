import { CronJob } from 'cron';
import { OsrsProcessDbu } from './tasks/osrs-process-dbu.task';
import { OsrsQueueDbu } from './tasks/osrs-queue-dbu.task';
import { XpProcessPlayers } from './tasks/xp-process-players.task';
import { XpQueuePlayers } from './tasks/xp-queue-players.task';

export class Tasks {
  static init(): void {
    this.startJob('0 0 */2 * * *' /* Every two hours */, OsrsQueueDbu.runTask); // QUEUE ALL ITEMS FOR XP TRACKING
    this.startJob('0 0 0 * * *' /* At UTC midnight */, XpQueuePlayers.runTask); // QUEUE ALL PLAYERS FOR XP TRACKING
    this.startJob('0 * * * * *' /* Every minute */, OsrsProcessDbu.runTask); // PROCESS ALL ITEMS FOR XP TRACKING
    this.startJob('0 * * * * *' /* Every minute */, XpProcessPlayers.runTask); // PROCESS PLAYERS FOR XP DATAPOINTS
  }

  private static startJob(cron: string, task: () => void): void {
    new CronJob(cron, task, undefined, true, 'UTC');
  }
}
