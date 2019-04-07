import { CronJob } from 'cron';
import { OsrsProcessDbu } from './tasks/osrs-dbu/process-dbu.task';
import { OsrsQueueDbu } from './tasks/osrs-dbu/queue-dbu.task';
import { XpCleanDead } from './tasks/xp/clean-dead.task';
import { XpProcessPlayers } from './tasks/xp/process-players.task';
import { XpQueuePlayers } from './tasks/xp/queue-players.task';

export class Tasks {
  static readonly TASKS = [
    { cron: '0 0 * * * *' /* Every hour */, function: XpCleanDead.runTask }, // CLEAD DEAD PLAYERS FROM XP TRACKING
    { cron: '0 0 */2 * * *' /* Every two hours */, function: OsrsQueueDbu.runTask }, // QUEUE ALL ITEMS FOR PRICE TRACKING
    { cron: '0 0 0 * * *' /* At UTC midnight */, function: XpQueuePlayers.runTask }, // QUEUE ALL PLAYERS FOR XP TRACKING
    { cron: '0 * * * * *' /* Every minute */, function: OsrsProcessDbu.runTask }, // PROCESS ALL ITEMS FOR PRICE TRACKING
    { cron: '0 * * * * *' /* Every minute */, function: XpProcessPlayers.runTask }, // PROCESS PLAYERS FOR XP DATAPOINTS
  ];
  static runningTasks: CronJob[] = [];

  static start(stopOld: boolean = true): void {
    if (stopOld) {
      this.runningTasks.forEach(task => task.stop());
      this.runningTasks = [];
    }

    this.TASKS.forEach(task => this.startJob(task.cron, task.function));
  }

  private static startJob(cron: string, task: () => void): void {
    this.runningTasks.push(new CronJob(cron, task, undefined, true, 'UTC'));
  }
}
