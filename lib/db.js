import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongooseConnection) => {
      // CRITICAL: Import all models to register them with Mongoose
      // This prevents "MissingSchemaError" when populating references
      import('@/lib/models/Customer');
      import('@/lib/models/Loan');
      import('@/lib/models/Request');
      import('@/lib/models/User');
      import('@/lib/models/EMIPayment');
      
      console.log('✅ MongoDB connected successfully');
      console.log('📦 Models registered: Customer, Loan, Request, User, EMIPayment');
      
      return mongooseConnection;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error);
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

export { connectDB };