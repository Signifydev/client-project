// pages/api/debug-database.js
import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  try {
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const databaseName = db.databaseName;
    
    // Count customers in the database
    const customersCount = await db.collection('customers').countDocuments();
    
    // List all collections
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    res.status(200).json({
      success: true,
      environment: process.env.NODE_ENV,
      databaseName: databaseName,
      customersCount: customersCount,
      collections: collections.map(c => c.name),
      connection: 'successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      environment: process.env.NODE_ENV,
      connection: 'failed'
    });
  }
}