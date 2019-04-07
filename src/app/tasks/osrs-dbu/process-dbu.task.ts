import fetch from 'node-fetch';
import { API } from '../../../config/api';
import { config } from '../../../config/config';
import { Logger } from '../../common/logger';
import { Item } from '../../data/item';
import { ItemRepository } from '../../repositories/item.repository';

interface QueuedCategoryPage {
  _id: string; // message ID
  letter: string;
  page: number;
}

interface FetchCategoryPageResponse {
  categoryPage: QueuedCategoryPage;
  items?: Item[];
}

export class OsrsProcessDbu {
  private readonly REQUEST_DELAY = 6500; // OSRS API limit = 10 per minute/ 1 per 6 seconds
  private readonly OSRS_ITEM_API_BASE = 'http://services.runescape.com/m=itemdb_oldschool/api/catalogue/items.json';

  private startTime: number = -1;

  static runTask(): Promise<void> {
    return new OsrsProcessDbu().runTask();
  }

  async runTask(): Promise<void> {
    this.startTime = Date.now();

    const categoryPages = await this.popCategoryPages();

    if (categoryPages.length === 0) return;

    await this.processCategoryPages(categoryPages);
  }

  private async popCategoryPages(): Promise<QueuedCategoryPage[]> {
    const res = await fetch(`${config.toxMqUrl}-dbu/pop/9`, { method: 'POST' });

    if (res.status === 204) return [];
    const response = await res.json();

    return response.map((msg: { payload: QueuedCategoryPage; _id: string }) => ({
      _id: msg._id,
      ...msg.payload,
    }));
  }

  private async processCategoryPages(categoryPages: QueuedCategoryPage[]): Promise<void> {
    Logger.logTask('PROCESS_OSRS_DBU', `${categoryPages.length} PAGES WAITING TO BE PROCESSED`);

    const fetchPromises: Promise<FetchCategoryPageResponse>[] = [];

    for (let i = 0; i < categoryPages.length; i++) {
      fetchPromises.push(
        new Promise<FetchCategoryPageResponse>(resolve => setTimeout(() => resolve(), i * this.REQUEST_DELAY))
          .then(() => this.getPageItems(categoryPages[i]))
          .then(items => ({
            categoryPage: categoryPages[i],
            items: items,
          }))
      );
    }

    const responses = await Promise.all(fetchPromises);
    const succeededResponses = responses.filter(res => res.items !== undefined) as FetchCategoryPageResponse[];

    const items = succeededResponses.reduce((a: Item[], b) => [...a, ...b.items!], []);

    Logger.logTask('PROCESS_OSRS_DBU', `INSERTING ${items.length} ITEMS FROM ${succeededResponses.length} PAGES`);

    await API.getDbConnection(connection => ItemRepository.insertItems(items, connection));
    await this.ackPlayers(succeededResponses);

    Logger.logTask('PROCESS_OSRS_DBU', `FINISHED TASK IN ${Math.round((Date.now() - this.startTime) / 1000)} SECONDS`);
  }

  private async getPageItems(categoryPage: QueuedCategoryPage): Promise<Item[] | undefined> {
    const response = await fetch(
      this.OSRS_ITEM_API_BASE + `?category=1&alpha=${encodeURIComponent(categoryPage.letter)}&page=${categoryPage.page}`
    )
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .catch(() => {
        Logger.logTask('PROCESS_OSRS_DBU', `FAILED TO LOOKUP LETTER ${categoryPage.letter} PAGE ${categoryPage.page}.`);
        return undefined;
      });

    if (response) {
      return response.items.map(
        (item: any) => new Item(item.id, item.name, item.description, item.current.price, item.today.price)
      );
    }
  }

  private async ackPlayers(succeededResponses: FetchCategoryPageResponse[]): Promise<void> {
    const messageIds = succeededResponses.map(res => res.categoryPage._id);

    await fetch(`${config.toxMqUrl}-dbu/ack`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(messageIds),
    });
  }
}
