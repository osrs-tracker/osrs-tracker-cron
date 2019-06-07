export class ArrayUtils {
  static chunk<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];

    let index = 0;
    while (index < array.length) {
      chunks.push(array.slice(index, index + chunkSize));
      index += chunkSize;
    }
    return chunks;
  }
}
