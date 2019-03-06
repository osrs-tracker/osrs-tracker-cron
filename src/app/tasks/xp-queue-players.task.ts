import * as moment from 'moment';
import fetch from 'node-fetch';
import { MD5 } from 'object-hash';
import { API } from '../../config/api';
import { config } from '../../config/config';
import { ArrayUtils } from '../common/array-utils';
import { Logger } from '../common/logger';
import { PlayerRepository } from '../repositories/player.repository';

export class XpQueuePlayers {
  static runTask(): Promise<void> {
    return new XpQueuePlayers().runTask();
  }

  async runTask(): Promise<void> {
    await this.queuePlayers();
  }

  private async queuePlayers(): Promise<void> {
    return API.getDbConnection(async connection => {
      const { statusCode, players } = await PlayerRepository.getPlayers(connection);

      if (statusCode === 500) {
        Logger.logTask('QUEUE_XP_TRACKER', 'FAILED TO RETRIEVE PLAYERS - RESTARTING IN 5 MINUTES');
        setTimeout(() => this.runTask(), 5 * 60 * 1000);
        return;
      }

      ArrayUtils.chunk(players!, 500).forEach(async chunk => await this.queueInsert(chunk));

      Logger.logTask('QUEUE_XP_TRACKER', 'FINISHED TASK');
    });
  }

  private async queueInsert(payload: any): Promise<void> {
    const utcToday = moment()
      .utc()
      .startOf('day')
      .toDate();

    return await fetch(`${config.toxMqUrl}-xp/push?hashCode=${MD5({ utcToday, payload })}&expiresIn=3600`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(() => undefined);
  }
}
