export class CachingService<T> {
  private cache: T | null = null;
  private expiry: number | null = null;
  private readonly cacheDuration: number;
  private readonly name: string;

  constructor(name: string, cacheDurationMs = 5 * 60 * 1000) {
    this.cacheDuration = cacheDurationMs;
    this.name = name;
  }

  async getWithCache(fetchFn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();

    try {
      if (this.cache && this.expiry && Date.now() < this.expiry) {
        const endTime = performance.now();
        console.log(
          `${this.name} fetched from cache in ${(
            (endTime - startTime) /
            1000
          ).toFixed(2)} seconds`
        );
        if (process.env.DEBUG === "true") {
          console.log(this.cache);
        }
        return this.cache;
      }

      const result = await fetchFn();

      this.cache = result;
      this.expiry = Date.now() + this.cacheDuration;

      const endTime = performance.now();
      console.log(
        `${this.name} fetched from source in ${(
          (endTime - startTime) /
          1000
        ).toFixed(2)} seconds`
      );

      if (process.env.DEBUG_ === "true") {
        console.log(result);
      }
      return result;
    } catch (error) {
      console.error(`Error fetching ${this.name}:`, error);
      throw error;
    }
  }
}
