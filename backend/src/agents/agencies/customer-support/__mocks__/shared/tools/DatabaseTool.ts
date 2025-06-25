export class DatabaseTool {
  async query(sql: string) { return []; }
  async insert(table: string, data: any) { return { id: 'mock-id' }; }
  async update(table: string, data: any) { return { affectedRows: 1 }; }
  async delete(table: string, id: string) { return { affectedRows: 1 }; }
  isHealthy() { return true; }
  getStats() { return { queryCount: 0, errorCount: 0 }; }
}