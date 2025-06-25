export class WebSearchTool {
  async search(query: string) {
    return [{ title: 'Mock Result', url: 'https://mock.com', snippet: 'Mock snippet' }];
  }
  isHealthy() { return true; }
  getStats() { return { requestCount: 0, errorCount: 0 }; }
}