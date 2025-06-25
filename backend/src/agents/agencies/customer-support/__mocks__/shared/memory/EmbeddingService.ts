export class EmbeddingService {
  static getInstance() {
    return {
      generateEmbedding: async (text: string) => [0.1, 0.2, 0.3],
      generateEmbeddings: async (texts: string[]) => [[0.1, 0.2, 0.3]],
      isHealthy: () => true,
      getStats: () => ({ requestCount: 0, errorCount: 0 })
    };
  }
}