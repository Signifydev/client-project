import mongoose from 'mongoose';
import SafeSession from './safeSession';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not defined in environment variables');
  }

  // If already connected, return existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // If no existing connection promise, create one
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI)
      .then(async (mongooseConnection) => {

        // 🔐 Register all models safely
        await import('@/lib/models/Customer');
        await import('@/lib/models/Loan');
        await import('@/lib/models/Request');
        await import('@/lib/models/User');
        await import('@/lib/models/EMIPayment');

        console.log('✅ MongoDB connected successfully');
        console.log('📦 Models registered: Customer, Loan, Request, User, EMIPayment');

        return mongooseConnection;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        cached.promise = null; // reset on failure
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

// ✅ Keep BOTH exports (no functionality change)
export default connectDB;
export { connectDB, SafeSession };
