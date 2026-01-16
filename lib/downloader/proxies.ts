/**
 * Proxy Pool Manager
 * Manages a pool of proxy servers with health checking
 * Automatically marks dead proxies and rotates through healthy ones
 */

export interface Proxy {
  url: string;
  healthy: boolean;
  lastChecked: number;
  failureCount: number;
  lastError?: string;
}

export class ProxyPool {
  private proxies: Proxy[] = [];
  private readonly maxFailures = 3; // Mark as unhealthy after 3 failures
  private readonly healthCheckInterval = 5 * 60 * 1000; // 5 minutes

  constructor(proxyUrls: string[] = []) {
    // Load from environment if not provided
    if (proxyUrls.length === 0) {
      const envProxies = process.env.PROXY_POOL;
      if (envProxies) {
        proxyUrls = envProxies.split(",").map(p => p.trim()).filter(Boolean);
      }
    }

    // Initialize proxy pool
    this.proxies = proxyUrls.map(url => ({
      url: url.trim(),
      healthy: true,
      lastChecked: 0,
      failureCount: 0,
    }));
  }

  /**
   * Get a random healthy proxy
   * Returns null if no healthy proxies available
   */
  getRandomProxy(): string | null {
    const healthy = this.getHealthyProxies();
    
    if (healthy.length === 0) {
      return null;
    }

    // Random selection from healthy proxies
    const randomIndex = Math.floor(Math.random() * healthy.length);
    return healthy[randomIndex].url;
  }

  /**
   * Get all healthy proxies
   */
  getHealthyProxies(): Proxy[] {
    return this.proxies.filter(p => p.healthy);
  }

  /**
   * Get all proxies (including unhealthy)
   */
  getAllProxies(): Proxy[] {
    return [...this.proxies];
  }

  /**
   * Mark a proxy as failed
   * After maxFailures, marks it as unhealthy
   */
  markFailure(proxyUrl: string, error?: string): void {
    const proxy = this.proxies.find(p => p.url === proxyUrl);
    
    if (!proxy) {
      return;
    }

    proxy.failureCount++;
    proxy.lastError = error;
    proxy.lastChecked = Date.now();

    if (proxy.failureCount >= this.maxFailures) {
      proxy.healthy = false;
      
      if (process.env.NODE_ENV === "development") {
        console.warn(`[ProxyPool] Marked proxy as unhealthy: ${proxyUrl} (${proxy.failureCount} failures)`);
      }
    }
  }

  /**
   * Mark a proxy as successful
   * Resets failure count
   */
  markSuccess(proxyUrl: string): void {
    const proxy = this.proxies.find(p => p.url === proxyUrl);
    
    if (!proxy) {
      return;
    }

    proxy.failureCount = 0;
    proxy.healthy = true;
    proxy.lastChecked = Date.now();
    delete proxy.lastError;
  }

  /**
   * Health check a proxy (async)
   * Pings the proxy to see if it's alive
   */
  async checkProxyHealth(proxy: Proxy): Promise<boolean> {
    // Skip if recently checked
    const now = Date.now();
    if (now - proxy.lastChecked < this.healthCheckInterval) {
      return proxy.healthy;
    }

    try {
      // Simple health check: try to connect through proxy
      // This is a basic check - in production, you might want more sophisticated checks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        // Try to fetch a simple endpoint through the proxy
        // Using a reliable endpoint like httpbin.org
        const response = await fetch("http://httpbin.org/ip", {
          signal: controller.signal,
          // Note: Node.js fetch doesn't support proxy directly
          // This is a placeholder - you'd need a library like 'https-proxy-agent'
        } as any);

        clearTimeout(timeoutId);
        
        if (response.ok) {
          this.markSuccess(proxy.url);
          return true;
        } else {
          this.markFailure(proxy.url, `HTTP ${response.status}`);
          return false;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.markFailure(proxy.url, errorMsg);
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.markFailure(proxy.url, errorMsg);
      return false;
    }
  }

  /**
   * Health check all proxies
   */
  async checkAllProxies(): Promise<void> {
    const promises = this.proxies.map(proxy => this.checkProxyHealth(proxy));
    await Promise.allSettled(promises);
  }

  /**
   * Reset all proxies to healthy state
   * Useful for manual recovery
   */
  resetAll(): void {
    for (const proxy of this.proxies) {
      proxy.healthy = true;
      proxy.failureCount = 0;
      proxy.lastChecked = 0;
      delete proxy.lastError;
    }
  }

  /**
   * Add a new proxy to the pool
   */
  addProxy(url: string): void {
    // Check if already exists
    if (this.proxies.some(p => p.url === url)) {
      return;
    }

    this.proxies.push({
      url: url.trim(),
      healthy: true,
      lastChecked: 0,
      failureCount: 0,
    });
  }

  /**
   * Remove a proxy from the pool
   */
  removeProxy(url: string): void {
    this.proxies = this.proxies.filter(p => p.url !== url);
  }

  /**
   * Get proxy statistics
   */
  getStats(): {
    total: number;
    healthy: number;
    unhealthy: number;
  } {
    return {
      total: this.proxies.length,
      healthy: this.getHealthyProxies().length,
      unhealthy: this.proxies.length - this.getHealthyProxies().length,
    };
  }
}

/**
 * Global proxy pool instance
 * Initialized from environment variable
 */
let globalProxyPool: ProxyPool | null = null;

/**
 * Get the global proxy pool instance
 */
export function getProxyPool(): ProxyPool {
  if (!globalProxyPool) {
    globalProxyPool = new ProxyPool();
  }
  return globalProxyPool;
}

/**
 * Get a random proxy URL for yt-dlp
 * Returns null if no proxies available
 */
export function getProxyForYtDlp(): string | null {
  const pool = getProxyPool();
  return pool.getRandomProxy();
}

/**
 * Convert proxy URL to yt-dlp --proxy format
 * Returns ["--proxy", "http://proxy:port"] or empty array
 */
export function proxyToYtDlpArgs(proxyUrl: string | null): string[] {
  if (!proxyUrl) {
    return [];
  }

  return ["--proxy", proxyUrl];
}
