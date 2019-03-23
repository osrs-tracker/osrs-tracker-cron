import { CronJob } from 'cron';
import { OsrsProcessDbu } from './tasks/osrs-process-dbu.task';
import { OsrsQueueDbu } from './tasks/osrs-queue-dbu.task';
import { XpProcessPlayers } from './tasks/xp-process-players.task';
import { XpQueuePlayers } from './tasks/xp-queue-players.task';

export class Tasks {
  static readonly TASK_COUNT = 4;
  static runningTasks: CronJob[] = [];

  static start(stopOld: boolean = true): void {
    if (stopOld) {
      this.runningTasks.forEach(task => task.stop());
      this.runningTasks = [];
    }

    this.initJobs();
  }

  private static initJobs(): void {
    this.startJob('0 0 */2 * * *' /* Every two hours */, OsrsQueueDbu.runTask); // QUEUE ALL ITEMS FOR PRICE TRACKING
    this.startJob('0 0 0 * * *' /* At UTC midnight */, XpQueuePlayers.runTask); // QUEUE ALL PLAYERS FOR XP TRACKING
    this.startJob('0 * * * * *' /* Every minute */, OsrsProcessDbu.runTask); // PROCESS ALL ITEMS FOR PRICE TRACKING
    this.startJob('0 * * * * *' /* Every minute */, XpProcessPlayers.runTask); // PROCESS PLAYERS FOR XP DATAPOINTS
  }

  private static startJob(cron: string, task: () => void): void {
    this.runningTasks.push(new CronJob(cron, task, undefined, true, 'UTC'));
  }
}
