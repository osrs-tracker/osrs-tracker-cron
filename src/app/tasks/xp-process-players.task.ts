import { Agent, AgentOptions } from 'https';
import moment from 'moment';
import fetch from 'node-fetch';
import { API } from '../../config/api';
import { config } from '../../config/config';
import { Logger } from '../common/logger';
import { XpDatapoint } from '../data/xp-datapoint';
import { XpRepository } from '../repositories/xp.repository';

interface QueuedPlayer {
  _id: string; // message ID
  id: number;
  username: string;
}

export class XpProcessPlayers {
  private static PROCESSING_AGENT = new Agent({
    maxSockets: 50,
    keepAlive: true,
    maxFreeSockets: 10,
    timeout: 30000,
  } as AgentOptions);

  private readonly OSRS_HISCORE_URL = 'https://services.runescape.com/m=hiscore_oldschool/index_lite.ws?player=';

  private readonly REQUEST_DELAY = 500;

  private startTime: number = -1;

  static runTask(): Promise<void> {
    return new XpProcessPlayers().runTask();
  }

  async runTask(): Promise<void> {
    this.startTime = Date.now();

    const players = await this.popPlayers();

    if (players.length === 0) return;

    await this.processPlayers(players);
  }

  async processPlayers(players: QueuedPlayer[]): Promise<void> {
    Logger.logTask('PROCESS_XP_TRACKER', `${players.length} PLAYERS WAITING TO BE PROCESSED`);

    const lookupPromises: Promise<XpDatapoint | undefined>[] = [];

    for (let i = 0; i < players.length; i++) {
      lookupPromises.push(
        new Promise<XpDatapoint | undefined>(resolve => setTimeout(() => resolve(), i * this.REQUEST_DELAY)).then(() =>
          this.lookupDbPlayer(players[i])
        )
      );
    }

    let datapoints: XpDatapoint[] = [];
    await Promise.all(lookupPromises).then(
      responses => (datapoints = responses.filter(datapoint => datapoint !== undefined) as XpDatapoint[])
    );

    Logger.logTask('PROCESS_XP_TRACKER', `INSERTING ${datapoints.length} OF ${players.length} DATAPOINTS`);
    await API.getDbConnection(connection => XpRepository.insertXpDataPoints(datapoints, connection));
    await this.ackPlayers(players, datapoints);

    Logger.logTask(
      'PROCESS_XP_TRACKER',
      `FINISHED TASK IN ${Math.round((Date.now() - this.startTime) / 1000)} SECONDS`
    );
  }

  private async ackPlayers(players: QueuedPlayer[], datapoints: XpDatapoint[]): Promise<void> {
    const retrievedIds = datapoints.map(datapoint => datapoint.playerId);
    const messageIds = players.filter(player => retrievedIds.includes(player.id)).map(player => player._id);

    await fetch(`${config.toxMqUrl}-xp/ack`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(messageIds),
    });
  }

  private async popPlayers(): Promise<QueuedPlayer[]> {
    const res = await fetch(`${config.toxMqUrl}-xp/pop/100`, { method: 'POST' });

    if (res.status === 204) return [];
    const players = await res.json();

    return players.map((player: { _id: string; payload: any }) => ({ ...player.payload, _id: player._id }));
  }

  private async lookupDbPlayer(player: QueuedPlayer): Promise<XpDatapoint | undefined> {
    const fetchedXp = await fetch(this.OSRS_HISCORE_URL + player.username, {
      agent: XpProcessPlayers.PROCESSING_AGENT,
    })
      .then(res => (res.ok ? res.text() : Promise.reject()))
      .catch(() => {
        Logger.logTask('PROCESS_XP_TRACKER', `FAILED TO LOOKUP ${player.username}`);
        return undefined;
      });

    if (fetchedXp && fetchedXp.length < 1024) {
      return {
        playerId: player.id,
        date: moment()
          .utc()
          .startOf('day')
          .toDate(),
        xpString: fetchedXp,
      };
    }
  }
}
