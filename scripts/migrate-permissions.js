import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for ES modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect directly to MongoDB (bypassing Next.js aliases)
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://SignifyRise:Shiva2025@cluster0.7p8eaqn.mongodb.net/loan_management_system?retryWrites=true&w=majority&appName=Cluster0';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

async function migratePermissions() {
  try {
    console.log('Starting permissions migration...');
    await connectDB();
    
    const db = mongoose.connection.db;
    const teamMembersCollection = db.collection('team_members');
    
    // Get all team members
    const allMembers = await teamMembersCollection.find({}).toArray();
    console.log(`Found ${allMembers.length} team members`);
    
    let dataEntryUpdated = 0;
    let recoverySkipped = 0;
    
    for (const member of allMembers) {
      console.log(`Processing: ${member.name} (${member.role})`);
      
      if (member.role === 'Data Entry Operator') {
        // Check if permissions field already exists
        if (!member.permissions) {
          await teamMembersCollection.updateOne(
            { _id: member._id },
            { $set: { permissions: 'only_data_entry' } }
          );
          dataEntryUpdated++;
          console.log(`  ✅ Set permissions: 'only_data_entry'`);
        } else {
          console.log(`  ⏭️ Already has permissions: '${member.permissions}'`);
        }
      } else if (member.role === 'Recovery Team') {
        recoverySkipped++;
        console.log(`  ⏭️ Skipped (Recovery Team doesn't need permissions)`);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`=================================`);
    console.log(`✅ Data Entry Operators updated: ${dataEntryUpdated}`);
    console.log(`⏭️ Recovery Team members skipped: ${recoverySkipped}`);
    console.log(`📝 Total records processed: ${allMembers.length}`);
    console.log(`=================================\n`);
    
    console.log('🎉 Migration completed successfully!');
    
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePermissions();