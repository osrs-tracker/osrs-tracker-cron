import fetch from 'node-fetch';
import { API } from '../../../config/api';
import { config } from '../../../config/config';
import { Logger } from '../../common/logger';
import { PlayerRepository } from '../../repositories/player.repository';

interface DeadXp {
  _id: string;
  payload: { id: number; username: string };
  attempts: number;
}

export class XpCleanDead {
  static runTask(): Promise<void> {
    return new XpCleanDead().runTask();
  }

  async runTask(): Promise<void> {
    const dead = await this.fetchDead();
    const deadIds = dead.map(item => item.payload.id);

    await API.getDbConnection(async connection => {
      const { success } = await PlayerRepository.deletePlayers(deadIds, connection);
      if (success) await this.ackDead(dead);
    });

    Logger.logTask('CLEAD_DEAD_XP_TRACKER', 'FINISHED TASK');
  }

  private async ackDead(dead: DeadXp[]): Promise<void> {
    await fetch(`${config.toxMqUrl}-xp-dead/ack`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(dead.map(item => item._id)),
    });
  }
  private async fetchDead(): Promise<DeadXp[]> {
    const response = await fetch(`${config.toxMqUrl}-xp-dead/peek?filter={"attempts":{"$gte":3}}`);

    if (response.status !== 200) return [];

    return response.json();
  }
}
