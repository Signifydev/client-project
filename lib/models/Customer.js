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
  // TEAM MEMBER ASSIGNMENT FIELDS
  // ==============================================
  teamMemberNumber: {
    type: String,
    trim: true,
    default: null
  },
  
  assignmentHistory: [{
    action: {
      type: String,
      enum: ['ASSIGNED', 'REMOVED', 'CHANGED'],
      required: true
    },
    teamMemberNumber: {
      type: String,
      trim: true
    },
    previousTeamMemberNumber: {
      type: String,
      trim: true
    },
    assignedBy: {
      type: String,
      trim: true
    },
    removedBy: {
      type: String,
      trim: true
    },
    assignedAt: {
      type: Date
    },
    removedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ==============================================
  // DOCUMENT STORAGE - DUAL STRUCTURE
  // ==============================================
  
  // OLD STRUCTURE (for backward compatibility)
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
  
  // NEW STRUCTURE: Document references
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
  
  // Document metadata
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
// INDEXES
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
customerSchema.index({ 'profilePictureRef': 1 });
customerSchema.index({ 'fiDocumentRefs.shop': 1 });
customerSchema.index({ 'fiDocumentRefs.home': 1 });
customerSchema.index({ teamMemberNumber: 1 });
customerSchema.index({ officeCategory: 1, teamMemberNumber: 1 });
// NEW INDEXES FOR ASSIGNMENT HISTORY
customerSchema.index({ 'assignmentHistory.timestamp': -1 });
customerSchema.index({ 'assignmentHistory.teamMemberNumber': 1 });

// ==============================================
// VIRTUAL PROPERTIES
// ==============================================
customerSchema.virtual('fullInfo').get(function() {
  return `${this.name} - ${this.phone.join(', ')} - ${this.businessName} (${this.area})`;
});

customerSchema.virtual('primaryPhone').get(function() {
  return this.phone.length > 0 ? this.phone[0] : null;
});

customerSchema.virtual('formattedPhones').get(function() {
  return this.phone.join(', ');
});

customerSchema.virtual('isAssignedToTeam').get(function() {
  return !!this.teamMemberNumber && this.teamMemberNumber.trim() !== '';
});

customerSchema.virtual('profilePictureUrl').get(function() {
  if (this.profilePictureRef && typeof this.profilePictureRef === 'object') {
    return this.profilePictureRef.url;
  } else if (this.profilePicture?.url) {
    return this.profilePicture.url;
  }
  return null;
});

customerSchema.virtual('fiDocumentUrls').get(function() {
  const result = { shop: null, home: null };
  
  if (this.fiDocumentRefs?.shop && typeof this.fiDocumentRefs.shop === 'object') {
    result.shop = this.fiDocumentRefs.shop.url;
  } else if (this.fiDocuments?.shop?.url) {
    result.shop = this.fiDocuments.shop.url;
  }
  
  if (this.fiDocumentRefs?.home && typeof this.fiDocumentRefs.home === 'object') {
    result.home = this.fiDocumentRefs.home.url;
  } else if (this.fiDocuments?.home?.url) {
    result.home = this.fiDocuments.home.url;
  }
  
  return result;
});

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
// METHODS
// ==============================================
customerSchema.methods.hasDocuments = function() {
  return !!(
    this.profilePictureUrl ||
    this.fiDocumentUrls.shop ||
    this.fiDocumentUrls.home
  );
};

customerSchema.methods.hasWhatsApp = function() {
  return !!this.whatsappNumber;
};

customerSchema.methods.addPhone = function(phoneNumber) {
  if (/^\d{10}$/.test(phoneNumber) && !this.phone.includes(phoneNumber)) {
    this.phone.push(phoneNumber);
    return true;
  }
  return false;
};

customerSchema.methods.removePhone = function(phoneNumber) {
  const index = this.phone.indexOf(phoneNumber);
  if (index > -1) {
    this.phone.splice(index, 1);
    return true;
  }
  return false;
};

customerSchema.methods.assignTeamMember = function(teamMemberNumber, assignedBy, notes) {
  const previousTeamMemberNumber = this.teamMemberNumber;
  this.teamMemberNumber = teamMemberNumber ? teamMemberNumber.trim() : null;
  
  // Add to assignment history
  if (this.teamMemberNumber) {
    this.assignmentHistory.push({
      action: previousTeamMemberNumber ? 'CHANGED' : 'ASSIGNED',
      teamMemberNumber: this.teamMemberNumber,
      previousTeamMemberNumber: previousTeamMemberNumber,
      assignedBy: assignedBy,
      assignedAt: new Date(),
      notes: notes || `Assigned by ${assignedBy}`,
      timestamp: new Date()
    });
  }
  
  return this.teamMemberNumber;
};

customerSchema.methods.removeTeamMember = function(removedBy, notes) {
  const previousTeamMemberNumber = this.teamMemberNumber;
  this.teamMemberNumber = null;
  
  // Add to assignment history
  this.assignmentHistory.push({
    action: 'REMOVED',
    previousTeamMemberNumber: previousTeamMemberNumber,
    removedBy: removedBy,
    removedAt: new Date(),
    notes: notes || `Removed by ${removedBy}`,
    timestamp: new Date()
  });
  
  return true;
};

customerSchema.methods.isAssignedTo = function(teamMemberNumber) {
  return this.teamMemberNumber === teamMemberNumber;
};

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

customerSchema.methods.migrateLegacyDocuments = async function() {
  const migrated = [];
  
  if (this.profilePicture?.url && !this.profilePictureRef) {
    this.documentMetadata.hasProfilePicture = true;
    migrated.push('profile_picture');
  }
  
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
  this.updatedAt = new Date();
  
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
  const hasDocuments = doc.hasDocuments();
  if (hasDocuments && !doc.documentMetadata.lastDocumentUpdate) {
    doc.documentMetadata.lastDocumentUpdate = new Date();
    doc.save();
  }
});

// ==============================================
// STATIC METHODS
// ==============================================
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

customerSchema.statics.findByTeamMember = function(teamMemberNumber) {
  return this.find({
    teamMemberNumber: teamMemberNumber,
    status: 'active',
    isActive: true
  });
};

customerSchema.statics.findUnassigned = function(officeCategory) {
  const query = {
    $or: [
      { teamMemberNumber: { $exists: false } },
      { teamMemberNumber: null },
      { teamMemberNumber: '' }
    ],
    status: 'active',
    isActive: true
  };
  
  if (officeCategory) {
    query.officeCategory = officeCategory;
  }
  
  return this.find(query);
};

customerSchema.statics.findByOfficeCategory = function(officeCategory, options = {}) {
  const query = {
    officeCategory: officeCategory,
    status: 'active',
    isActive: true
  };
  
  if (options.teamMemberNumber) {
    query.teamMemberNumber = options.teamMemberNumber;
  }
  
  if (options.excludeTeamMemberNumber) {
    query.teamMemberNumber = { $ne: options.excludeTeamMemberNumber };
  }
  
  return this.find(query);
};

customerSchema.statics.bulkAssignTeamMember = async function(customerIds, teamMemberNumber) {
  return this.updateMany(
    { _id: { $in: customerIds } },
    { $set: { teamMemberNumber: teamMemberNumber } }
  );
};

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

customerSchema.statics.getTeamAssignmentStats = async function(officeCategory) {
  const matchStage = { 
    status: 'active',
    isActive: true 
  };
  
  if (officeCategory) {
    matchStage.officeCategory = officeCategory;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$teamMemberNumber',
        count: { $sum: 1 },
        totalLoanAmount: { $sum: '$loanAmount' }
      }
    },
    {
      $project: {
        teamMemberNumber: { $ifNull: ['$_id', 'Unassigned'] },
        count: 1,
        totalLoanAmount: { $ifNull: ['$totalLoanAmount', 0] },
        _id: 0
      }
    },
    { $sort: { teamMemberNumber: 1 } }
  ]);
  
  return stats;
};

// ==============================================
// TRANSFORM OUTPUT
// ==============================================
customerSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    ret.profilePictureUrl = doc.profilePictureUrl;
    ret.fiDocumentUrls = doc.fiDocumentUrls;
    ret.isAssignedToTeam = doc.isAssignedToTeam;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

customerSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    ret.profilePictureUrl = doc.profilePictureUrl;
    ret.fiDocumentUrls = doc.fiDocumentUrls;
    ret.isAssignedToTeam = doc.isAssignedToTeam;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

// ==============================================
// MODEL EXPORT
// ==============================================
export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);