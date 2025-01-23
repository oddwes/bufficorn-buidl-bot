export class PerformanceTracker {
  private startTime: number;

  constructor() {
      this.startTime = performance.now();
  }

  getExecutionTime(): number {
      const endTime = performance.now();
      return (endTime - this.startTime) / 1000;
  }

  logExecution(operation: string, success: boolean = true) {
      const executionTime = this.getExecutionTime();
      const status = success ? 'completed' : 'failed';
      console.log(`${operation} ${status} in ${executionTime.toFixed(2)} seconds`);
  }
}