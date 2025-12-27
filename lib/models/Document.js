import mongoose from 'mongoose';

// ==============================================
// DOCUMENT ID GENERATOR
// ==============================================
const generateDocumentId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 6);
  return `DOC_${timestamp}_${random}`.toUpperCase();
};

// ==============================================
// DOCUMENT SCHEMA
// ==============================================
const documentSchema = new mongoose.Schema({
  // Core Identification
  documentId: { 
    type: String, 
    required: true, 
    unique: true,
    default: generateDocumentId
  },
  
  // Document Type (maps to your current structure)
  documentType: { 
    type: String, 
    required: true,
    enum: [
      'profile_picture', 
      'fi_document_shop', 
      'fi_document_home',
      'kyc', 
      'identity', 
      'business_document',
      'other'
    ]
  },
  
  // Source Information
  source: { 
    type: String, 
    enum: ['cloudinary', 'local', 's3', 'external'],
    default: 'cloudinary',
    required: true
  },
  sourceId: { 
    type: String, 
    required: true // Cloudinary public_id, etc.
  },
  
  // Original File Information (for backward compatibility)
  filename: { 
    type: String, 
    default: null 
  },
  url: { 
    type: String, 
    required: true 
  },
  originalName: { 
    type: String, 
    required: true 
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Cloudinary Specific Fields (for your current implementation)
  secure_url: { 
    type: String, 
    default: null 
  },
  public_id: { 
    type: String, 
    default: null 
  },
  format: { 
    type: String, 
    default: null // jpg, pdf, etc.
  },
  bytes: { 
    type: Number, 
    default: null // File size in bytes
  },
  width: { 
    type: Number, 
    default: null // For images
  },
  height: { 
    type: Number, 
    default: null // For images
  },
  
  // Thumbnail & Optimized URLs (for performance)
  thumbnailUrl: { 
    type: String, 
    default: null 
  },
  optimizedUrl: { 
    type: String, 
    default: null 
  },
  
  // References
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer',
    default: null
  },
  requestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Request',
    default: null
  },
  
  // Uploader Information
  uploadedBy: { 
    type: String, 
    required: true 
  },
  uploadedByRole: { 
    type: String, 
    enum: ['data_entry', 'admin', 'customer', 'system'],
    default: 'data_entry'
  },
  
  // Status & Verification
  status: { 
    type: String, 
    enum: ['active', 'pending', 'archived', 'deleted'],
    default: 'active'
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verifiedBy: { 
    type: String, 
    default: null 
  },
  verifiedAt: { 
    type: Date, 
    default: null 
  },
  
  // Security & Access
  accessLevel: { 
    type: String, 
    enum: ['public', 'private', 'restricted'],
    default: 'private'
  },
  
  // Metadata (for backward compatibility)
  hasProfilePicture: { 
    type: Boolean, 
    default: false 
  },
  hasFiDocuments: {
    shop: { 
      type: Boolean, 
      default: false 
    },
    home: { 
      type: Boolean, 
      default: false 
    }
  },
  
  // Version Control
  version: { 
    type: Number, 
    default: 1 
  },
  previousVersionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document',
    default: null
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastAccessed: { 
    type: Date, 
    default: null 
  }
}, {
  // Enable timestamps
  timestamps: true
});

// ==============================================
// INDEXES FOR PERFORMANCE
// ==============================================
documentSchema.index({ documentId: 1 });
documentSchema.index({ documentType: 1 });
documentSchema.index({ customerId: 1 });
documentSchema.index({ requestId: 1 });
documentSchema.index({ sourceId: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ documentType: 1, customerId: 1 });

// ==============================================
// VIRTUAL PROPERTIES (for backward compatibility)
// ==============================================

// Virtual to match your current Customer schema structure
documentSchema.virtual('legacyFormat').get(function() {
  return {
    filename: this.filename,
    url: this.url,
    originalName: this.originalName,
    uploadedAt: this.uploadedAt,
    // For Cloudinary compatibility
    secure_url: this.secure_url,
    public_id: this.public_id
  };
});

// Virtual for display name
documentSchema.virtual('displayName').get(function() {
  return this.originalName || this.filename || 'Document';
});

// Virtual for file size in readable format
documentSchema.virtual('fileSizeReadable').get(function() {
  if (!this.bytes) return 'N/A';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.bytes) / Math.log(1024));
  return parseFloat((this.bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for thumbnail or main URL
documentSchema.virtual('displayUrl').get(function() {
  return this.thumbnailUrl || this.optimizedUrl || this.url;
});

// ==============================================
// METHODS
// ==============================================

// Method to check if document is an image
documentSchema.methods.isImage = function() {
  const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  return imageFormats.includes(this.format?.toLowerCase());
};

// Method to check if document is PDF
documentSchema.methods.isPDF = function() {
  return this.format?.toLowerCase() === 'pdf';
};

// Method to mark as verified
documentSchema.methods.markAsVerified = function(verifiedBy) {
  this.isVerified = true;
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  return this.save();
};

// Method to archive document
documentSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Method to create new version
documentSchema.methods.createNewVersion = function(newDocumentData, uploadedBy) {
  const newVersion = this.toObject();
  delete newVersion._id;
  delete newVersion.__v;
  
  newVersion.version = this.version + 1;
  newVersion.previousVersionId = this._id;
  newVersion.uploadedBy = uploadedBy;
  newVersion.createdAt = new Date();
  newVersion.updatedAt = new Date();
  
  // Update with new data
  Object.assign(newVersion, newDocumentData);
  
  return newVersion;
};

// ==============================================
// STATIC METHODS
// ==============================================

// Find documents by customer
documentSchema.statics.findByCustomer = function(customerId, options = {}) {
  const query = { customerId };
  
  if (options.documentType) {
    query.documentType = options.documentType;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Find documents by request
documentSchema.statics.findByRequest = function(requestId) {
  return this.find({ requestId }).sort({ createdAt: -1 });
};

// Find active documents
documentSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

// Find documents by type
documentSchema.statics.findByType = function(documentType) {
  return this.find({ documentType }).sort({ createdAt: -1 });
};

// Get document statistics
documentSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: {
          documentType: '$documentType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalSize: { $sum: '$bytes' }
      }
    },
    {
      $group: {
        _id: '$_id.documentType',
        total: { $sum: '$count' },
        byStatus: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        }
      }
    }
  ]);
  
  const totalDocuments = await this.countDocuments();
  const totalSize = await this.aggregate([
    { $group: { _id: null, total: { $sum: '$bytes' } } }
  ]);
  
  return {
    totalDocuments,
    totalSize: totalSize[0]?.total || 0,
    byType: stats
  };
};

// ==============================================
// PRE-SAVE MIDDLEWARE
// ==============================================
documentSchema.pre('save', function(next) {
  // Ensure uploadedAt is set
  if (!this.uploadedAt) {
    this.uploadedAt = new Date();
  }
  
  // Set hasProfilePicture and hasFiDocuments for backward compatibility
  if (this.documentType === 'profile_picture') {
    this.hasProfilePicture = !!this.url;
  } else if (this.documentType === 'fi_document_shop') {
    this.hasFiDocuments = { ...this.hasFiDocuments, shop: !!this.url };
  } else if (this.documentType === 'fi_document_home') {
    this.hasFiDocuments = { ...this.hasFiDocuments, home: !!this.url };
  }
  
  // Update timestamp
  this.updatedAt = new Date();
  
  next();
});

// ==============================================
// TRANSFORM FOR OUTPUT
// ==============================================
documentSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive/internal fields
    delete ret.__v;
    delete ret.previousVersionId;
    delete ret.accessLevel;
    
    // Add backward compatible structure
    ret.legacyFormat = doc.legacyFormat;
    
    return ret;
  }
});

documentSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive/internal fields
    delete ret.__v;
    delete ret.previousVersionId;
    delete ret.accessLevel;
    
    // Add backward compatible structure
    ret.legacyFormat = doc.legacyFormat;
    
    return ret;
  }
});

// ==============================================
// MODEL EXPORT
// ==============================================
export default mongoose.models.Document || mongoose.model('Document', documentSchema);