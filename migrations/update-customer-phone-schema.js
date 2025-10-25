import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Construct absolute paths using file:// protocol
const projectRoot = join(__dirname, '..');
const libPath = join(projectRoot, 'src', 'lib');

// Use proper ES module dynamic imports with file:// protocol
const dbModule = await import(new URL(join(libPath, 'db.js'), import.meta.url));
const { connectDB } = dbModule;

const customerModule = await import(new URL(join(libPath, 'models', 'Customer.js'), import.meta.url));
const Customer = customerModule.default;

async function migrateCustomerPhoneSchema() {
  try {
    console.log('🟡 Starting customer phone schema migration...');
    
    await connectDB();
    
    // Get all customers with phone as string
    const customers = await Customer.find({});
    console.log(`📊 Found ${customers.length} customers to migrate`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const customer of customers) {
      try {
        // Check if phone is already an array (already migrated)
        if (Array.isArray(customer.phone)) {
          console.log(`ℹ️ Customer ${customer._id} already has array phone, skipping`);
          continue;
        }
        
        // Convert string phone to array
        let phoneArray = [];
        
        if (typeof customer.phone === 'string') {
          // Handle different formats: comma-separated, single number, etc.
          const phones = customer.phone.split(',').map(p => p.trim()).filter(p => p);
          if (phones.length > 0) {
            phoneArray = phones;
          } else if (customer.phone.trim()) {
            phoneArray = [customer.phone.trim()];
          }
        } else if (customer.phone) {
          // If it's already a single value (not string or array)
          phoneArray = [String(customer.phone)];
        }
        
        // Validate phone numbers (keep only valid 10-digit numbers)
        const validPhones = phoneArray.filter(phone => /^\d{10}$/.test(phone));
        
        if (validPhones.length > 0) {
          // Update the customer with array phone
          await Customer.findByIdAndUpdate(
            customer._id,
            { 
              phone: validPhones,
              updatedAt: new Date()
            }
          );
          updatedCount++;
          console.log(`✅ Migrated customer ${customer._id}: ${customer.phone} -> [${validPhones.join(', ')}]`);
        } else {
          console.log(`⚠️ No valid phone numbers found for customer ${customer._id}, keeping original`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error migrating customer ${customer._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`🎉 Migration completed!`);
    console.log(`✅ Updated: ${updatedCount} customers`);
    console.log(`❌ Errors: ${errorCount} customers`);
    console.log(`📊 Total processed: ${customers.length} customers`);
    
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run migration if called directly
migrateCustomerPhoneSchema();