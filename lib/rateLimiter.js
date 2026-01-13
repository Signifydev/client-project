/**
 * Simple in-memory rate limiter for M0 tier protection
 * Prevents connection pool exhaustion from too many API calls
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.max = options.max || 100; // Max requests per window
    this.message = options.message || 'Too many requests, please try again later.';
    
    // Store request counts per IP
    this.requests = new Map();
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
    
    console.log(`🛡️ Rate limiter initialized: ${this.max} requests per ${this.windowMs/60000} minutes`);
  }
  
  /**
   * Check if request is allowed for given identifier (IP)
   */
  check(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create request record
    let record = this.requests.get(identifier);
    if (!record) {
      record = { count: 0, resetTime: now + this.windowMs };
      this.requests.set(identifier, record);
    }
    
    // Remove old entries (if reset time has passed)
    if (record.resetTime < now) {
      record.count = 0;
      record.resetTime = now + this.windowMs;
    }
    
    // Check limit
    if (record.count >= this.max) {
      console.log(`⛔ Rate limit exceeded for ${identifier}: ${record.count}/${this.max} requests`);
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        message: this.message
      };
    }
    
    // Increment counter
    record.count++;
    
    // Log first request and when approaching limit
    if (record.count === 1) {
      console.log(`🟢 First request from ${identifier}`);
    } else if (record.count >= this.max * 0.8) {
      console.log(`⚠️  ${identifier} approaching limit: ${record.count}/${this.max}`);
    }
    
    return {
      allowed: true,
      remaining: this.max - record.count,
      resetTime: record.resetTime
    };
  }
  
  /**
   * Clean up old entries (runs automatically every minute)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [identifier, record] of this.requests.entries()) {
      if (record.resetTime < now) {
        this.requests.delete(identifier);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old rate limit records`);
    }
  }
  
  /**
   * Get statistics (for monitoring)
   */
  getStats() {
    const now = Date.now();
    const activeRequests = Array.from(this.requests.entries())
      .filter(([_, record]) => record.resetTime > now)
      .map(([identifier, record]) => ({
        identifier: identifier.substring(0, 15) + '...', // Truncate for privacy
        count: record.count,
        resetIn: Math.ceil((record.resetTime - now) / 60000), // minutes
        resetTime: new Date(record.resetTime).toISOString()
      }));
    
    return {
      totalActive: activeRequests.length,
      windowMinutes: Math.round(this.windowMs / 60000),
      maxPerWindow: this.max,
      requests: activeRequests
    };
  }
  
  /**
   * Reset all limits (for testing)
   */
  reset() {
    this.requests.clear();
    console.log('🔄 Rate limiter reset');
  }
}

// Create singleton instance for payment API
const paymentRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 payment requests per 15 minutes per IP
  message: 'Too many payment requests. Please try again later.'
});

// Export both the class and singleton instance
export { RateLimiter, paymentRateLimiter };
export default paymentRateLimiter;