import { PoolConnection } from 'mysql';
import { DbPlayer } from '../data/player';

export class PlayerRepository {
  static getPlayers(connection: PoolConnection): Promise<{ statusCode: number; players?: DbPlayer[] }> {
    return new Promise(resolve =>
      connection.query('SELECT p.id, p.username FROM Player p', (outerError, results: DbPlayer[]) => {
        if (outerError) {
          resolve({ statusCode: 500 });
        } else if (results && results.length > 0) {
          resolve({ statusCode: 200, players: results });
        } else {
          resolve({ statusCode: 204 });
        }
      })
    );
  }

  static deletePlayers(ids: number[], connection: PoolConnection): Promise<{ success: boolean }> {
    return new Promise(resolve =>
      connection.query('DELETE FROM Player WHERE id IN (?)', [ids], (outerError, result) =>
        resolve({ success: !outerError && result && result.affectedRows > 0 })
      )
    );
  }
}
