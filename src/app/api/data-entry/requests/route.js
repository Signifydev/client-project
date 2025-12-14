import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import { connectDB } from '@/lib/db';

// GET method to fetch requests
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const officeCategory = searchParams.get('officeCategory');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const createdBy = searchParams.get('createdBy');
    const statusFilter = searchParams.get('status') || 'Pending'; // Default to Pending
    const limit = parseInt(searchParams.get('limit')) || 50;
    const page = parseInt(searchParams.get('page')) || 1;
    const includeOverdue = searchParams.get('includeOverdue') === 'true';
    
    // Build query for requests
    let query = {};
    
    // Add status filter
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter;
    }
    
    // Add filters if provided
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    console.log('🔍 Fetching requests with query:', query);
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Get requests with population and sorting
    const requests = await Request.find(query)
      .populate('customerId', 'name phone businessName area loanNumber status')
      .populate('loanId', 'loanNumber amount emiAmount loanType status')
      .sort({ 
        priority: -1, // High priority first
        createdAt: -1  // Newest first
      })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalCount = await Request.countDocuments(query);
    
    // Get request statistics
    const stats = await Request.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          highPriority: {
            $sum: {
              $cond: [{ $in: ['$priority', ['High', 'Urgent']] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    // Get priority breakdown for pending requests
    const priorityStats = await Request.aggregate([
      {
        $match: { status: 'Pending' }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get type breakdown for pending requests
    const typeStats = await Request.aggregate([
      {
        $match: { status: 'Pending' }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Find overdue requests (older than 7 days)
    let overdueRequests = [];
    if (includeOverdue) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      overdueRequests = await Request.find({
        status: 'Pending',
        createdAt: { $lt: sevenDaysAgo }
      })
      .populate('customerId', 'name phone')
      .populate('loanId', 'loanNumber')
      .select('_id type customerName priority createdAt')
      .sort({ createdAt: 1 })
      .limit(10);
    }
    
    // Calculate request ages and add virtual fields
    const requestsWithAge = requests.map(req => {
      const requestObj = req.toObject();
      const now = new Date();
      const created = new Date(requestObj.createdAt);
      const diffTime = Math.abs(now - created);
      const ageInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Add loan selection type
      const loanSelectionType = requestObj.step2Data?.loanType === 'single' 
        ? 'Single Loan' 
        : requestObj.step2Data?.loanType === 'multiple' 
          ? 'Multiple Loans (Add Later)' 
          : 'Not Specified';
      
      return {
        ...requestObj,
        ageInDays,
        isOverdue: ageInDays > 7 && requestObj.status === 'Pending',
        formattedCreatedDate: created.toLocaleDateString('en-IN'),
        formattedCreatedTime: created.toLocaleTimeString('en-IN'),
        displayType: getDisplayType(requestObj.type),
        displayPriority: getDisplayPriority(requestObj.priority),
        loanSelectionType,
        // Add customer data for easy access
        customer: requestObj.customerId ? {
          name: requestObj.customerId.name,
          phone: requestObj.customerId.phone,
          businessName: requestObj.customerId.businessName,
          area: requestObj.customerId.area,
          loanNumber: requestObj.customerId.loanNumber,
          status: requestObj.customerId.status
        } : null,
        // Add loan data for easy access
        loan: requestObj.loanId ? {
          loanNumber: requestObj.loanId.loanNumber,
          amount: requestObj.loanId.amount,
          emiAmount: requestObj.loanId.emiAmount,
          loanType: requestObj.loanId.loanType,
          status: requestObj.loanId.status
        } : null
      };
    });
    
    // Get high priority request count for pending requests
    const highPriorityCount = priorityStats
      .filter(item => item._id === 'High' || item._id === 'Urgent')
      .reduce((total, item) => total + item.count, 0);
    
    // Calculate total pending count
    const pendingCount = await Request.countDocuments({ status: 'Pending' });
    
    const responseData = {
      success: true,
      data: {
        requests: requestsWithAge,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        },
        statistics: {
          total: totalCount,
          pending: pendingCount,
          byStatus: stats.reduce((acc, item) => {
            acc[item._id] = {
              total: item.count,
              highPriority: item.highPriority
            };
            return acc;
          }, {}),
          byType: typeStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          byPriority: priorityStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          highPriorityCount,
          overdueCount: overdueRequests.length
        },
        filters: {
          type: type || 'all',
          priority: priority || 'all',
          status: statusFilter,
          createdBy: createdBy || 'all',
          limit,
          page
        },
        overdueRequests: includeOverdue ? overdueRequests : []
      }
    };
    
    console.log(`✅ Found ${requestsWithAge.length} requests out of ${totalCount} total`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('❌ Error fetching requests:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch requests: ' + error.message 
    }, { status: 500 });
  }
}

// POST method to create new requests
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('📥 Received request body:', JSON.stringify(body, null, 2));
    
    const {
      type,
      customerId,
      customerName,
      customerNumber,
      loanId,
      loanNumber,
      step1Data, // Accept step1Data for New Customer
      step2Data, // Accept step2Data for New Customer
      step3Data, // Accept step3Data for New Customer
      requestedData,
      description,
      priority = 'Medium',
      status = 'Pending',
      createdBy,
      createdByRole = 'data_entry',
      requiresCustomerNotification = false,
      estimatedImpact = 'Medium'
    } = body;

    console.log('🟡 Creating new request:', { 
      type, 
      customerName,
      customerNumber,
      status,
      createdBy,
      hasStep1Data: !!step1Data,
      hasStep2Data: !!step2Data,
      hasStep3Data: !!step3Data,
      loanType: step2Data?.loanType,
      loanNumber: step2Data?.loanNumber
    });

    // VALIDATION FOR NEW CUSTOMER REQUESTS
    if (type === 'New Customer') {
      // For New Customer requests, we accept stepXData format
      if (!customerName || !customerName.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required field: customerName is required for New Customer requests'
          },
          { status: 400 }
        );
      }
      
      // Check if step1Data exists for New Customer
      if (!step1Data) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing step1Data: Customer details are required for New Customer requests'
          },
          { status: 400 }
        );
      }
      
      // Validate step1Data required fields
      if (!step1Data.name || !step1Data.name.trim() || 
          !step1Data.phone || !step1Data.phone.length || 
          !step1Data.customerNumber || !step1Data.customerNumber.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required customer details: name, phone, and customerNumber are required'
          },
          { status: 400 }
        );
      }
      
      // Check if step2Data exists
      if (!step2Data) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing step2Data: Loan selection details are required'
      },
      { status: 400 }
    );
  }
  
  // Validate step2Data required fields
  if (!step2Data.loanSelectionType) { // Changed from loanType
    return NextResponse.json(
      {
        success: false,
        error: 'Loan selection type (single/multiple) is required'
      },
      { status: 400 }
    );
  }
  
  // For single loans, validate loan details
  if (step2Data.loanSelectionType === 'single') {
    if (!step2Data.loanNumber || !step2Data.loanNumber.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Loan number is required for single loan'
        },
        { status: 400 }
      );
    }
    
    if (!step2Data.loanNumber.startsWith('LN')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Loan number must start with "LN" prefix (e.g., LN01, LN02)'
        },
        { status: 400 }
      );
    }
    
    if (!step2Data.loanAmount || step2Data.loanAmount <= 0 || 
        !step2Data.emiAmount || step2Data.emiAmount <= 0 || 
        !step2Data.loanType) { // Changed from loanFrequency
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required loan details: loanAmount, emiAmount, and loanType are required for single loan'
        },
        { status: 400 }
      );
    }
  }
      // For multiple loans, no loan details validation needed
      
      // Validate step3Data for login credentials
      if (!step3Data) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing step3Data: Login credentials are required for New Customer requests'
          },
          { status: 400 }
        );
      }
      
      // Validate step3Data required fields
      if (!step3Data.loginId || !step3Data.loginId.trim() || 
          !step3Data.password || !step3Data.password.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required login credentials: loginId and password are required'
          },
          { status: 400 }
        );
      }
      
    } else {
      // For other request types, validate requestedData
      if (!type || !customerName || !requestedData) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required fields: type, customerName, and requestedData are required'
          },
          { status: 400 }
        );
      }
    }

    // Validate status against enum values
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'In Review', 'On Hold'];
    if (status && !validStatuses.includes(status)) {
      console.error(`❌ Invalid status provided: '${status}'. Valid values:`, validStatuses);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status: '${status}'. Valid values are: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate type against enum values
    const validTypes = [
      'New Customer', 
      'Customer Edit', 
      'EMI Update', 
      'Loan Update', 
      'Loan Addition',
      'Document Update',
      'Status Change',
      'Other'
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type: '${type}'. Valid values are: ${validTypes.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Auto-set some values based on type
    let autoPriority = priority;
    let autoEstimatedImpact = estimatedImpact;
    let autoRequiresNotification = requiresCustomerNotification;

    if (type === 'New Customer') {
      autoPriority = 'High';
      autoEstimatedImpact = 'High';
      autoRequiresNotification = true;
    } else if (type === 'Loan Addition') {
      autoPriority = 'Medium';
      autoEstimatedImpact = 'Medium';
      autoRequiresNotification = false;
    }

    // Prepare request data object
    const requestData = {
      type,
      customerId: customerId || null,
      customerName: customerName.trim(),
      customerNumber: customerNumber || (step1Data && step1Data.customerNumber) || null,
      loanId: loanId || null,
      loanNumber: loanNumber || (step2Data && step2Data.loanNumber) || null,
      priority: autoPriority,
      status: status,
      createdBy: createdBy || 'data_entry_operator_1',
      createdByRole,
      requiresCustomerNotification: autoRequiresNotification,
      estimatedImpact: autoEstimatedImpact
    };

    // Add step data for New Customer
    if (type === 'New Customer') {
      requestData.step1Data = step1Data;
      requestData.step2Data = step2Data;
      requestData.step3Data = step3Data;
      
      // Also include in requestedData for compatibility
      requestData.requestedData = {
        ...step1Data,
        ...step2Data,
        ...step3Data,
        type: 'New Customer',
        customerName: customerName.trim(),
        customerNumber: customerNumber || step1Data.customerNumber,
        loanType: step2Data.loanType,
        loanNumber: step2Data.loanNumber
      };
    } else {
      // For other types, use requestedData
      requestData.requestedData = requestedData;
    }

    // Add description
    if (description && description.trim()) {
      requestData.description = description.trim();
    } else {
      // Auto-generate description
      if (type === 'New Customer') {
        const loanTypeDesc = step2Data?.loanType === 'single' 
          ? 'with Single Loan' 
          : 'for Multiple Loans (Add Later)';
        requestData.description = `New customer registration for ${customerName.trim()} - ${loanTypeDesc}`;
      } else {
        requestData.description = `${type} request for ${customerName.trim()}`;
      }
    }

    console.log('💾 Creating request with data:', {
      type: requestData.type,
      customerName: requestData.customerName,
      customerNumber: requestData.customerNumber,
      loanType: step2Data?.loanType,
      loanNumber: step2Data?.loanNumber,
      status: requestData.status,
      hasStep1Data: !!requestData.step1Data,
      hasStep2Data: !!requestData.step2Data,
      hasStep3Data: !!requestData.step3Data
    });

    // Create the request with validated data
    const newRequest = new Request(requestData);

    console.log('💾 Saving request to database...');
    await newRequest.save();
    console.log('✅ Request created successfully with ID:', newRequest._id);

    return NextResponse.json(
      {
        success: true,
        message: `${type} request submitted successfully! Waiting for admin approval.`,
        data: {
          requestId: newRequest._id,
          type: newRequest.type,
          customerName: newRequest.customerName,
          customerNumber: newRequest.customerNumber,
          loanType: step2Data?.loanType,
          loanNumber: step2Data?.loanNumber,
          status: newRequest.status,
          createdAt: newRequest.createdAt,
          priority: newRequest.priority
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Error creating request:', error);
    console.error('Error stack:', error.stack);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => e.message).join(', ');
      console.error('Validation errors:', validationErrors);
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${validationErrors}`
        },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: 'A similar request already exists'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create request: ' + error.message
      },
      { status: 500 }
    );
  }
}

// PUT method to update requests (optional - for admin actions)
export async function PUT(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      requestId,
      status,
      reviewedBy,
      reviewedByRole,
      reviewNotes,
      actionTaken,
      rejectionReason
    } = body;

    if (!requestId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request ID is required'
        },
        { status: 400 }
      );
    }

    console.log('🟡 Updating request:', { requestId, status });

    // Find the request
    const requestDoc = await Request.findById(requestId);
    if (!requestDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request not found'
        },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['Pending', 'Approved', 'Rejected', 'In Review', 'On Hold'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status: '${status}'. Valid values are: ${validStatuses.join(', ')}`
          },
          { status: 400 }
        );
      }
      requestDoc.status = status;
    }

    // Update other fields if provided
    if (reviewedBy) requestDoc.reviewedBy = reviewedBy;
    if (reviewedByRole) requestDoc.reviewedByRole = reviewedByRole;
    if (reviewNotes) requestDoc.reviewNotes = reviewNotes;
    if (actionTaken) requestDoc.actionTaken = actionTaken;
    if (rejectionReason) requestDoc.rejectionReason = rejectionReason;

    // Set timestamps
    if (status && status !== 'Pending') {
      requestDoc.reviewedAt = new Date();
      if (status === 'Approved' || status === 'Rejected') {
        requestDoc.completedAt = new Date();
      }
    }

    await requestDoc.save();
    console.log('✅ Request updated successfully:', requestDoc._id);

    return NextResponse.json(
      {
        success: true,
        message: 'Request updated successfully',
        data: requestDoc
      }
    );

  } catch (error) {
    console.error('❌ Error updating request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update request: ' + error.message
      },
      { status: 500 }
    );
  }
}

// Helper function to get display type
function getDisplayType(type) {
  const typeMap = {
    'New Customer': 'New Customer',
    'Customer Edit': 'Customer Edit',
    'EMI Update': 'EMI Update',
    'Loan Update': 'Loan Update',
    'Loan Addition': 'Loan Addition',
    'Document Update': 'Document Update',
    'Status Change': 'Status Change',
    'Other': 'Other'
  };
  return typeMap[type] || type;
}

// Helper function to get display priority
function getDisplayPriority(priority) {
  const priorityMap = {
    'Low': 'Low',
    'Medium': 'Medium',
    'High': 'High',
    'Urgent': 'Urgent'
  };
  return priorityMap[priority] || priority;
}