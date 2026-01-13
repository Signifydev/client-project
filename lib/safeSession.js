import mongoose from 'mongoose';

/**
 * SAFE TRANSACTION MANAGER FOR MONGODB M0 TIER
 * Prevents connection pool exhaustion with timeouts and retries
 */

const MAX_RETRIES = 3;
const SESSION_TIMEOUT = 10000; // 10 seconds
const RETRY_DELAY_BASE = 100; // Base delay in ms

// Track active connections
const connectionStats = {
  activeSessions: 0,
  successfulTransactions: 0,
  failedTransactions: 0,
  timeouts: 0
};

/**
 * Safe transaction wrapper with timeout and retry logic
 */
class SafeSession {
  /**
   * Execute a transaction with automatic retry and timeout
   * @param {string} operationName - Name for logging
   * @param {Function} callback - Function to execute within transaction
   * @returns {Promise<any>} Result of callback
   */
  static async withTransaction(operationName, callback) {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      let session = null;
      
      try {
        // Check connection pool health (M0 has max 10 connections)
        if (connectionStats.activeSessions >= 5) {
          throw new Error(`Connection pool busy: ${connectionStats.activeSessions}/5 active`);
        }
        
        // Create session
        session = await mongoose.startSession();
        connectionStats.activeSessions++;
        
        session.startTransaction();
        
        console.log(`🟡 [${operationName}] Attempt ${retries + 1}/${MAX_RETRIES}, Active: ${connectionStats.activeSessions}`);
        
        // Create timeout promise (prevent hanging connections)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            connectionStats.timeouts++;
            reject(new Error(`Transaction timeout after ${SESSION_TIMEOUT}ms`));
          }, SESSION_TIMEOUT);
        });
        
        // Execute with timeout
        const result = await Promise.race([
          callback(session),
          timeoutPromise
        ]);
        
        // Commit if successful
        await session.commitTransaction();
        connectionStats.successfulTransactions++;
        
        console.log(`✅ [${operationName}] Completed successfully`);
        return result;
        
      } catch (error) {
        connectionStats.failedTransactions++;
        
        // Always attempt to abort transaction
        if (session && session.inTransaction()) {
          try {
            await session.abortTransaction();
          } catch (abortError) {
            console.warn(`⚠️ Failed to abort transaction:`, abortError.message);
          }
        }
        
        // Check if we should retry (network errors, timeouts)
        const isRetryable = this.isRetryableError(error);
        
        if (isRetryable && retries < MAX_RETRIES - 1) {
          retries++;
          const delay = RETRY_DELAY_BASE * Math.pow(2, retries); // Exponential backoff
          
          console.warn(`⚠️ [${operationName}] Retry ${retries}/${MAX_RETRIES} after ${delay}ms:`, error.message);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Final error
        console.error(`❌ [${operationName}] Failed after ${retries + 1} attempts:`, error.message);
        throw new Error(`${operationName} failed: ${error.message}`);
        
      } finally {
        // ALWAYS clean up session to prevent leaks
        if (session) {
          try {
            session.endSession();
            connectionStats.activeSessions = Math.max(0, connectionStats.activeSessions - 1);
          } catch (endError) {
            console.warn(`⚠️ Error ending session:`, endError.message);
          }
        }
      }
    }
  }
  
  /**
   * Check if error is retryable (network issues, timeouts)
   */
  static isRetryableError(error) {
    const retryableMessages = [
      'timeout',
      'pool',
      'connection',
      'network',
      'ECONNRESET',
      'ETIMEDOUT',
      'socket',
      'write conflict',
      'transaction'
    ];
    
    const message = error.message.toLowerCase();
    return retryableMessages.some(keyword => message.includes(keyword));
  }
  
  /**
   * Execute without transaction (for simple read operations)
   */
  static async withoutTransaction(operationName, callback) {
    try {
      console.log(`🟡 [${operationName}] Starting non-transactional operation`);
      const result = await callback();
      console.log(`✅ [${operationName}] Completed`);
      return result;
    } catch (error) {
      console.error(`❌ [${operationName}] Failed:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get connection statistics (for monitoring)
   */
  static getStats() {
    return {
      ...connectionStats,
      timestamp: new Date().toISOString(),
      successRate: connectionStats.successfulTransactions / 
                  (connectionStats.successfulTransactions + connectionStats.failedTransactions) || 0
    };
  }
  
  /**
   * Reset statistics (for testing only)
   */
  static resetStats() {
    connectionStats.activeSessions = 0;
    connectionStats.successfulTransactions = 0;
    connectionStats.failedTransactions = 0;
    connectionStats.timeouts = 0;
  }
}

export default SafeSession;