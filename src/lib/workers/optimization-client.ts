import {
  OptimizationRequest,
  OptimizationResult,
  ProgressUpdate
} from './color-optimization.worker';

export interface OptimizationClientConfig {
  max_concurrent_workers: number;
  worker_timeout_ms: number;
  retry_attempts: number;
  enable_progress_updates: boolean;
}

export interface WorkerInstance {
  id: string;
  worker: Worker;
  busy: boolean;
  current_request_id: string | null;
  created_at: number;
  last_used: number;
}

export type OptimizationEventType =
  | 'started'
  | 'progress'
  | 'completed'
  | 'error'
  | 'stopped'
  | 'timeout';

export interface OptimizationEvent {
  type: OptimizationEventType;
  request_id: string;
  data?: any;
  timestamp: number;
}

export type OptimizationEventHandler = (event: OptimizationEvent) => void;

export class OptimizationClient {
  private config: OptimizationClientConfig;
  private workers: Map<string, WorkerInstance> = new Map();
  private pendingRequests: Map<string, {
    resolve: (result: OptimizationResult) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
    retry_count: number;
  }> = new Map();
  private eventHandlers: Map<string, OptimizationEventHandler[]> = new Map();
  private requestQueue: OptimizationRequest[] = [];
  private isProcessingQueue: boolean = false;

  constructor(config: Partial<OptimizationClientConfig> = {}) {
    this.config = {
      max_concurrent_workers: 4,
      worker_timeout_ms: 300000, // 5 minutes
      retry_attempts: 2,
      enable_progress_updates: true,
      ...config
    };

    this.initializeWorkerPool();
  }

  private initializeWorkerPool(): void {
    for (let i = 0; i < Math.min(2, this.config.max_concurrent_workers); i++) {
      this.createWorker();
    }
  }

  private createWorker(): WorkerInstance {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const worker = new Worker(
      new URL('./color-optimization.worker.ts', import.meta.url),
      { type: 'module' }
    );

    const workerInstance: WorkerInstance = {
      id: workerId,
      worker,
      busy: false,
      current_request_id: null,
      created_at: Date.now(),
      last_used: Date.now()
    };

    worker.onmessage = (event) => this.handleWorkerMessage(workerId, event);
    worker.onerror = (error) => this.handleWorkerError(workerId, error);

    this.workers.set(workerId, workerInstance);
    return workerInstance;
  }

  private handleWorkerMessage(workerId: string, event: MessageEvent): void {
    const { type, data } = event.data;
    const workerInstance = this.workers.get(workerId);

    if (!workerInstance) return;

    switch (type) {
      case 'STARTED':
        this.emitEvent('started', data.request_id, data);
        break;

      case 'PROGRESS':
        if (this.config.enable_progress_updates) {
          this.emitEvent('progress', data.request_id, data);
        }
        break;

      case 'COMPLETED':
        this.handleRequestCompletion(workerId, data);
        break;

      case 'ERROR':
        this.handleRequestError(workerId, data);
        break;

      case 'STOPPED':
        this.handleRequestStopped(workerId, data);
        break;

      case 'PONG':
        // Worker health check response
        break;

      default:
        console.warn(`Unknown worker message type: ${type}`);
    }
  }

  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    const workerInstance = this.workers.get(workerId);
    if (!workerInstance || !workerInstance.current_request_id) return;

    const requestId = workerInstance.current_request_id;
    const pendingRequest = this.pendingRequests.get(requestId);

    if (pendingRequest && pendingRequest.retry_count < this.config.retry_attempts) {
      console.warn(`Worker ${workerId} error, retrying request ${requestId}`);
      this.retryRequest(requestId);
    } else {
      this.handleRequestError(workerId, {
        request_id: requestId,
        error: error.message || 'Worker error'
      });
    }

    this.recycleWorker(workerId);
  }

  private handleRequestCompletion(workerId: string, result: OptimizationResult): void {
    const workerInstance = this.workers.get(workerId);
    if (!workerInstance) return;

    const requestId = result.request_id;
    const pendingRequest = this.pendingRequests.get(requestId);

    if (pendingRequest) {
      this.clearRequestTimeout(requestId);
      pendingRequest.resolve(result);
      this.pendingRequests.delete(requestId);
    }

    this.releaseWorker(workerId);
    this.emitEvent('completed', requestId, result);
    this.processQueue();
  }

  private handleRequestError(workerId: string, errorData: { request_id: string; error: string }): void {
    const requestId = errorData.request_id;
    const pendingRequest = this.pendingRequests.get(requestId);

    if (pendingRequest) {
      this.clearRequestTimeout(requestId);
      pendingRequest.reject(new Error(errorData.error));
      this.pendingRequests.delete(requestId);
    }

    this.releaseWorker(workerId);
    this.emitEvent('error', requestId, errorData);
    this.processQueue();
  }

  private handleRequestStopped(workerId: string, data: { request_id: string; message: string }): void {
    const requestId = data.request_id;
    const pendingRequest = this.pendingRequests.get(requestId);

    if (pendingRequest) {
      this.clearRequestTimeout(requestId);
      pendingRequest.reject(new Error(`Optimization stopped: ${data.message}`));
      this.pendingRequests.delete(requestId);
    }

    this.releaseWorker(workerId);
    this.emitEvent('stopped', requestId, data);
    this.processQueue();
  }

  async optimize(request: OptimizationRequest): Promise<OptimizationResult> {
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.request_id, {
        resolve,
        reject,
        retry_count: 0
      });

      const availableWorker = this.getAvailableWorker();
      if (availableWorker) {
        this.assignRequestToWorker(request, availableWorker);
      } else {
        this.requestQueue.push(request);
        this.processQueue();
      }
    });
  }

  private getAvailableWorker(): WorkerInstance | null {
    for (const worker of this.workers.values()) {
      if (!worker.busy) {
        return worker;
      }
    }

    if (this.workers.size < this.config.max_concurrent_workers) {
      return this.createWorker();
    }

    return null;
  }

  private assignRequestToWorker(request: OptimizationRequest, workerInstance: WorkerInstance): void {
    workerInstance.busy = true;
    workerInstance.current_request_id = request.request_id;
    workerInstance.last_used = Date.now();

    const timeout = setTimeout(() => {
      this.handleRequestTimeout(request.request_id);
    }, this.config.worker_timeout_ms);

    const pendingRequest = this.pendingRequests.get(request.request_id);
    if (pendingRequest) {
      pendingRequest.timeout = timeout;
    }

    workerInstance.worker.postMessage({
      type: 'OPTIMIZE',
      data: request
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const availableWorker = this.getAvailableWorker();
      if (!availableWorker) break;

      const request = this.requestQueue.shift()!;
      this.assignRequestToWorker(request, availableWorker);
    }

    this.isProcessingQueue = false;
  }

  private handleRequestTimeout(requestId: string): void {
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) return;

    if (pendingRequest.retry_count < this.config.retry_attempts) {
      this.retryRequest(requestId);
    } else {
      pendingRequest.reject(new Error('Optimization timeout'));
      this.pendingRequests.delete(requestId);
      this.emitEvent('timeout', requestId, { message: 'Optimization timed out' });
    }

    this.releaseWorkerByRequestId(requestId);
  }

  private retryRequest(requestId: string): void {
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) return;

    pendingRequest.retry_count++;
    this.clearRequestTimeout(requestId);

    // Find the original request in pending or recreate it
    // For now, we'll reject as retrying would require storing the original request
    pendingRequest.reject(new Error(`Optimization failed after ${pendingRequest.retry_count} attempts`));
    this.pendingRequests.delete(requestId);
  }

  private clearRequestTimeout(requestId: string): void {
    const pendingRequest = this.pendingRequests.get(requestId);
    if (pendingRequest?.timeout) {
      clearTimeout(pendingRequest.timeout);
      delete pendingRequest.timeout;
    }
  }

  private releaseWorker(workerId: string): void {
    const workerInstance = this.workers.get(workerId);
    if (workerInstance) {
      workerInstance.busy = false;
      workerInstance.current_request_id = null;
      workerInstance.last_used = Date.now();
    }
  }

  private releaseWorkerByRequestId(requestId: string): void {
    for (const [workerId, worker] of this.workers.entries()) {
      if (worker.current_request_id === requestId) {
        this.releaseWorker(workerId);
        break;
      }
    }
  }

  private recycleWorker(workerId: string): void {
    const workerInstance = this.workers.get(workerId);
    if (workerInstance) {
      workerInstance.worker.terminate();
      this.workers.delete(workerId);

      // Create a replacement worker
      if (this.workers.size < this.config.max_concurrent_workers) {
        this.createWorker();
      }
    }
  }

  stopOptimization(requestId: string): boolean {
    const workerInstance = this.findWorkerByRequestId(requestId);
    if (!workerInstance) return false;

    workerInstance.worker.postMessage({
      type: 'STOP',
      data: { request_id: requestId }
    });

    return true;
  }

  private findWorkerByRequestId(requestId: string): WorkerInstance | null {
    for (const worker of this.workers.values()) {
      if (worker.current_request_id === requestId) {
        return worker;
      }
    }
    return null;
  }

  addEventListener(eventType: OptimizationEventType, handler: OptimizationEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  removeEventListener(eventType: OptimizationEventType, handler: OptimizationEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  private emitEvent(type: OptimizationEventType, requestId: string, data?: any): void {
    const event: OptimizationEvent = {
      type,
      request_id: requestId,
      data,
      timestamp: Date.now()
    };

    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in optimization event handler:', error);
        }
      });
    }
  }

  getWorkerStats(): {
    total_workers: number;
    busy_workers: number;
    idle_workers: number;
    pending_requests: number;
    queue_length: number;
  } {
    const busyWorkers = Array.from(this.workers.values()).filter(w => w.busy).length;

    return {
      total_workers: this.workers.size,
      busy_workers: busyWorkers,
      idle_workers: this.workers.size - busyWorkers,
      pending_requests: this.pendingRequests.size,
      queue_length: this.requestQueue.length
    };
  }

  async healthCheck(): Promise<{ healthy_workers: number; total_workers: number }> {
    const healthPromises = Array.from(this.workers.entries()).map(async ([workerId, workerInstance]) => {
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 1000);

        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'PONG') {
            clearTimeout(timeout);
            workerInstance.worker.removeEventListener('message', messageHandler);
            resolve(true);
          }
        };

        workerInstance.worker.addEventListener('message', messageHandler);
        workerInstance.worker.postMessage({ type: 'PING' });
      });
    });

    const results = await Promise.all(healthPromises);
    const healthyCount = results.filter(Boolean).length;

    return {
      healthy_workers: healthyCount,
      total_workers: this.workers.size
    };
  }

  cleanup(): void {
    this.requestQueue = [];
    this.pendingRequests.clear();
    this.eventHandlers.clear();

    for (const workerInstance of this.workers.values()) {
      workerInstance.worker.terminate();
    }
    this.workers.clear();
  }
}

// Singleton instance for global use
let globalOptimizationClient: OptimizationClient | null = null;

export const getOptimizationClient = (config?: Partial<OptimizationClientConfig>): OptimizationClient => {
  if (!globalOptimizationClient) {
    globalOptimizationClient = new OptimizationClient(config);
  }
  return globalOptimizationClient;
};

export const createOptimizationRequest = (
  requestId: string,
  targetColor: any,
  availablePaints: any[],
  options: Partial<OptimizationRequest> = {}
): OptimizationRequest => {
  return {
    request_id: requestId,
    target_color: targetColor,
    available_paints: availablePaints,
    volume_constraints: {
      min_total_volume: 5.0,
      max_total_volume: 500.0,
      min_paint_volume: 0.1,
      max_paint_volume: 450.0,
      precision: 0.1,
      asymmetric_ratios: true
    },
    availability_constraints: [],
    optimization_config: {
      algorithm: 'auto',
      max_iterations: 1000,
      target_delta_e: 2.0,
      time_limit_ms: 60000,
      population_size: 50,
      convergence_threshold: 0.001
    },
    preferences: {
      prioritize_accuracy: true,
      prioritize_cost: false,
      prioritize_speed: false,
      allow_asymmetric_ratios: true
    },
    ...options
  };
};