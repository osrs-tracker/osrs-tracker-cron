export class ArrayUtils {
  static chunk<T>(array: T[], chunkLength: number): T[][] {
    // splits array into chunks of certain size
    const chunks = [];
    const arrayLength = array.length;

    let i = 0;
    while (i < arrayLength) chunks.push(array.slice(i, (i += chunkLength)));

    return chunks;
  }
}
