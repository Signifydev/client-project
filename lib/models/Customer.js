import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: [{ 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Phone number must be 10 digits'
    }
  }],
  whatsappNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'WhatsApp number must be 10 digits'
    },
    default: null
  },
  businessName: { 
    type: String, 
    required: true,
    trim: true
  },
  area: { 
    type: String, 
    required: true,
    trim: true
  },
  customerNumber: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  
  // ==============================================
  // UPDATED: Document storage - DUAL STRUCTURE
  // ==============================================
  
  // OLD STRUCTURE (for backward compatibility - will be phased out)
  profilePicture: {
    type: {
      filename: { type: String, default: null },
      url: { type: String, default: null },
      originalName: { type: String, default: null },
      uploadedAt: { type: Date, default: Date.now }
    },
    default: () => ({
      filename: null,
      url: null,
      originalName: null,
      uploadedAt: new Date()
    })
  },
  fiDocuments: {
    type: {
      shop: {
        type: {
          filename: { type: String, default: null },
          url: { type: String, default: null },
          originalName: { type: String, default: null },
          uploadedAt: { type: Date, default: Date.now }
        },
        default: () => ({
          filename: null,
          url: null,
          originalName: null,
          uploadedAt: new Date()
        })
      },
      home: {
        type: {
          filename: { type: String, default: null },
          url: { type: String, default: null },
          originalName: { type: String, default: null },
          uploadedAt: { type: Date, default: Date.now }
        },
        default: () => ({
          filename: null,
          url: null,
          originalName: null,
          uploadedAt: new Date()
        })
      }
    },
    default: () => ({
      shop: {
        filename: null,
        url: null,
        originalName: null,
        uploadedAt: new Date()
      },
      home: {
        filename: null,
        url: null,
        originalName: null,
        uploadedAt: new Date()
      }
    })
  },
  
  // NEW STRUCTURE: Document references (for new documents)
  profilePictureRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  fiDocumentRefs: {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null
    },
    home: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null
    }
  },
  
  // Document metadata (keeps track of what we have)
  documentMetadata: {
    hasProfilePicture: { type: Boolean, default: false },
    hasFiDocuments: {
      shop: { type: Boolean, default: false },
      home: { type: Boolean, default: false }
    },
    lastDocumentUpdate: { type: Date, default: null },
    totalDocuments: { type: Number, default: 0 }
  },
  
  // Additional customer information
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  businessType: {
    type: String,
    trim: true,
    default: null
  },
  
  // Category & Office fields
  category: {
    type: String,
    enum: ['A', 'B', 'C'],
    required: true,
    default: 'A'
  },
  officeCategory: {
    type: String,
    enum: ['Office 1', 'Office 2'],
    required: true,
    default: 'Office 1'
  },
  
  // Status fields
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'pending', 'rejected'], 
    default: 'pending' 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Login credentials for customer portal
  loginId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },

  isFirstLogin: {
    type: Boolean,
    default: true
  },
  otp: {
    type: String,
    default: null
  },
  otpExpiresAt: {
    type: Date,
    default: null
  },
  
  // Metadata
  createdBy: { 
    type: String, 
    required: true 
  },
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// ==============================================
// INDEXES FOR BETTER QUERY PERFORMANCE
// ==============================================
customerSchema.index({ phone: 1 });
customerSchema.index({ customerNumber: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ area: 1 });
customerSchema.index({ category: 1 });
customerSchema.index({ officeCategory: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ whatsappNumber: 1 });
customerSchema.index({ loginId: 1 });
customerSchema.index({ businessName: 'text' });
customerSchema.index({ name: 'text' });
// NEW: Index for document references
customerSchema.index({ 'profilePictureRef': 1 });
customerSchema.index({ 'fiDocumentRefs.shop': 1 });
customerSchema.index({ 'fiDocumentRefs.home': 1 });

// ==============================================
// VIRTUAL PROPERTIES (UPDATED)
// ==============================================

// Virtual for full customer info
customerSchema.virtual('fullInfo').get(function() {
  return `${this.name} - ${this.phone.join(', ')} - ${this.businessName} (${this.area})`;
});

// Virtual for primary phone number
customerSchema.virtual('primaryPhone').get(function() {
  return this.phone.length > 0 ? this.phone[0] : null;
});

// Virtual for formatted phone numbers
customerSchema.virtual('formattedPhones').get(function() {
  return this.phone.join(', ');
});

// ==============================================
// NEW: VIRTUAL FOR DOCUMENT ACCESS (BACKWARD COMPATIBLE)
// ==============================================

// Virtual to get profile picture URL (checks both old and new structure)
customerSchema.virtual('profilePictureUrl').get(function() {
  if (this.profilePictureRef && typeof this.profilePictureRef === 'object') {
    // If populated, get from Document
    return this.profilePictureRef.url;
  } else if (this.profilePicture?.url) {
    // Fallback to old structure
    return this.profilePicture.url;
  }
  return null;
});

// Virtual to get FI document URLs
customerSchema.virtual('fiDocumentUrls').get(function() {
  const result = { shop: null, home: null };
  
  // Check shop document
  if (this.fiDocumentRefs?.shop && typeof this.fiDocumentRefs.shop === 'object') {
    result.shop = this.fiDocumentRefs.shop.url;
  } else if (this.fiDocuments?.shop?.url) {
    result.shop = this.fiDocuments.shop.url;
  }
  
  // Check home document
  if (this.fiDocumentRefs?.home && typeof this.fiDocumentRefs.home === 'object') {
    result.home = this.fiDocumentRefs.home.url;
  } else if (this.fiDocuments?.home?.url) {
    result.home = this.fiDocuments.home.url;
  }
  
  return result;
});

// Virtual to get all documents (for easy access)
customerSchema.virtual('allDocuments').get(function() {
  const documents = [];
  
  if (this.profilePictureRef && typeof this.profilePictureRef === 'object') {
    documents.push({
      type: 'profile_picture',
      document: this.profilePictureRef,
      source: 'new'
    });
  } else if (this.profilePicture?.url) {
    documents.push({
      type: 'profile_picture',
      url: this.profilePicture.url,
      originalName: this.profilePicture.originalName,
      source: 'legacy'
    });
  }
  
  // Add FI documents
  ['shop', 'home'].forEach(docType => {
    const ref = this.fiDocumentRefs?.[docType];
    const legacy = this.fiDocuments?.[docType];
    
    if (ref && typeof ref === 'object') {
      documents.push({
        type: `fi_document_${docType}`,
        document: ref,
        source: 'new'
      });
    } else if (legacy?.url) {
      documents.push({
        type: `fi_document_${docType}`,
        url: legacy.url,
        originalName: legacy.originalName,
        source: 'legacy'
      });
    }
  });
  
  return documents;
});

// ==============================================
// METHODS (UPDATED)
// ==============================================

// Method to check if customer has documents (checks both old and new)
customerSchema.methods.hasDocuments = function() {
  return !!(
    this.profilePictureUrl ||
    this.fiDocumentUrls.shop ||
    this.fiDocumentUrls.home
  );
};

// Method to check if customer has WhatsApp number
customerSchema.methods.hasWhatsApp = function() {
  return !!this.whatsappNumber;
};

// Method to add a new phone number
customerSchema.methods.addPhone = function(phoneNumber) {
  if (/^\d{10}$/.test(phoneNumber) && !this.phone.includes(phoneNumber)) {
    this.phone.push(phoneNumber);
    return true;
  }
  return false;
};

// Method to remove a phone number
customerSchema.methods.removePhone = function(phoneNumber) {
  const index = this.phone.indexOf(phoneNumber);
  if (index > -1) {
    this.phone.splice(index, 1);
    return true;
  }
  return false;
};

// ==============================================
// NEW METHODS FOR DOCUMENT MANAGEMENT
// ==============================================

// Method to add a document reference
customerSchema.methods.addDocument = function(documentId, documentType) {
  switch(documentType) {
    case 'profile_picture':
      this.profilePictureRef = documentId;
      this.documentMetadata.hasProfilePicture = true;
      break;
    case 'fi_document_shop':
      this.fiDocumentRefs.shop = documentId;
      this.documentMetadata.hasFiDocuments.shop = true;
      break;
    case 'fi_document_home':
      this.fiDocumentRefs.home = documentId;
      this.documentMetadata.hasFiDocuments.home = true;
      break;
    default:
      return false;
  }
  
  this.documentMetadata.totalDocuments = this.allDocuments.length;
  this.documentMetadata.lastDocumentUpdate = new Date();
  return true;
};

// Method to remove a document reference
customerSchema.methods.removeDocument = function(documentType) {
  switch(documentType) {
    case 'profile_picture':
      this.profilePictureRef = null;
      this.documentMetadata.hasProfilePicture = false;
      break;
    case 'fi_document_shop':
      this.fiDocumentRefs.shop = null;
      this.documentMetadata.hasFiDocuments.shop = false;
      break;
    case 'fi_document_home':
      this.fiDocumentRefs.home = null;
      this.documentMetadata.hasFiDocuments.home = false;
      break;
    default:
      return false;
  }
  
  this.documentMetadata.totalDocuments = this.allDocuments.length;
  this.documentMetadata.lastDocumentUpdate = new Date();
  return true;
};

// Method to migrate legacy documents to new structure
customerSchema.methods.migrateLegacyDocuments = async function() {
  const migrated = [];
  
  // Migrate profile picture
  if (this.profilePicture?.url && !this.profilePictureRef) {
    // In a real implementation, you would create a Document record here
    // For now, we'll just mark it as migrated
    this.documentMetadata.hasProfilePicture = true;
    migrated.push('profile_picture');
  }
  
  // Migrate FI documents
  if (this.fiDocuments?.shop?.url && !this.fiDocumentRefs.shop) {
    this.documentMetadata.hasFiDocuments.shop = true;
    migrated.push('fi_document_shop');
  }
  
  if (this.fiDocuments?.home?.url && !this.fiDocumentRefs.home) {
    this.documentMetadata.hasFiDocuments.home = true;
    migrated.push('fi_document_home');
  }
  
  this.documentMetadata.totalDocuments = this.allDocuments.length;
  this.documentMetadata.lastDocumentUpdate = new Date();
  
  return migrated;
};

// ==============================================
// PRE-SAVE MIDDLEWARE
// ==============================================
customerSchema.pre('save', function(next) {
  // Update timestamps
  this.updatedAt = new Date();
  
  // Sync document metadata
  this.documentMetadata.hasProfilePicture = !!(
    this.profilePictureRef || this.profilePicture?.url
  );
  
  this.documentMetadata.hasFiDocuments = {
    shop: !!(this.fiDocumentRefs?.shop || this.fiDocuments?.shop?.url),
    home: !!(this.fiDocumentRefs?.home || this.fiDocuments?.home?.url)
  };
  
  this.documentMetadata.totalDocuments = (
    (this.profilePictureRef || this.profilePicture?.url ? 1 : 0) +
    (this.fiDocumentRefs?.shop || this.fiDocuments?.shop?.url ? 1 : 0) +
    (this.fiDocumentRefs?.home || this.fiDocuments?.home?.url ? 1 : 0)
  );
  
  next();
});

// ==============================================
// POST-SAVE MIDDLEWARE
// ==============================================
customerSchema.post('save', function(doc) {
  // Update lastDocumentUpdate if documents changed
  const hasDocuments = doc.hasDocuments();
  if (hasDocuments && !doc.documentMetadata.lastDocumentUpdate) {
    doc.documentMetadata.lastDocumentUpdate = new Date();
    doc.save(); // No await to prevent blocking
  }
});

// ==============================================
// STATIC METHODS (NEW)
// ==============================================

// Find customers with documents
customerSchema.statics.findWithDocuments = function() {
  return this.find({
    $or: [
      { 'profilePicture.url': { $exists: true, $ne: null } },
      { 'profilePictureRef': { $exists: true, $ne: null } },
      { 'fiDocuments.shop.url': { $exists: true, $ne: null } },
      { 'fiDocumentRefs.shop': { $exists: true, $ne: null } },
      { 'fiDocuments.home.url': { $exists: true, $ne: null } },
      { 'fiDocumentRefs.home': { $exists: true, $ne: null } }
    ]
  });
};

// Get customer document statistics
customerSchema.statics.getDocumentStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        customersWithProfilePicture: {
          $sum: {
            $cond: [
              { $or: [
                { $ne: ['$profilePicture.url', null] },
                { $ne: ['$profilePictureRef', null] }
              ]},
              1,
              0
            ]
          }
        },
        customersWithFiDocuments: {
          $sum: {
            $cond: [
              { $or: [
                { $ne: ['$fiDocuments.shop.url', null] },
                { $ne: ['$fiDocuments.home.url', null] },
                { $ne: ['$fiDocumentRefs.shop', null] },
                { $ne: ['$fiDocumentRefs.home', null] }
              ]},
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalCustomers: 0,
    customersWithProfilePicture: 0,
    customersWithFiDocuments: 0
  };
};

// ==============================================
// TRANSFORM OUTPUT TO INCLUDE VIRTUALS
// ==============================================
customerSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Add document URLs for easy access
    ret.profilePictureUrl = doc.profilePictureUrl;
    ret.fiDocumentUrls = doc.fiDocumentUrls;
    
    // Remove internal fields if needed
    delete ret.password;
    delete ret.__v;
    
    return ret;
  }
});

customerSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Add document URLs for easy access
    ret.profilePictureUrl = doc.profilePictureUrl;
    ret.fiDocumentUrls = doc.fiDocumentUrls;
    
    // Remove internal fields if needed
    delete ret.password;
    delete ret.__v;
    
    return ret;
  }
});

// ==============================================
// MODEL EXPORT
// ==============================================
export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);