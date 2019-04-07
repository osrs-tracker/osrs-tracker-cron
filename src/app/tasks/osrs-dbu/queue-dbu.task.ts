import moment from 'moment';
import fetch from 'node-fetch';
import { MD5 } from 'object-hash';
import { config } from '../../../config/config';
import { Logger } from '../../common/logger';

export class OsrsQueueDbu {
  private readonly OSRSRS_ITEM_API_BASE = 'http://services.runescape.com/m=itemdb_oldschool/api/catalogue';

  static runTask(): Promise<void> {
    return new OsrsQueueDbu().runTask();
  }

  async runTask(): Promise<void> {
    this.queueCategories();
  }

  private async queueCategories(): Promise<void> {
    const categoriesResponse = await fetch(`${this.OSRSRS_ITEM_API_BASE}/category.json?category=1`).then(res =>
      res.json()
    );

    const categoryPages = categoriesResponse.alpha
      .map((category: any) => {
        const pages = 1 + (category.items - (category.items % 12)) / 12;

        const categoryPages = [...new Array(pages)].map((_, index) => ({
          letter: category.letter,
          page: pages - index,
        }));

        return categoryPages;
      })
      .reduce((a: [], b: []) => [...a, ...b], []);

    await this.queueInsert(categoryPages);

    Logger.logTask('QUEUE_OSRS_DBU', 'FINISHED TASK');
  }

  private async queueInsert(payload: any): Promise<void> {
    const utcToday = moment()
      .utc()
      .startOf('hour')
      .toDate();

    return await fetch(`${config.toxMqUrl}-dbu/push?hashCode=${MD5({ utcToday, payload })}&expiresIn=3600`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(() => undefined);
  }
}
