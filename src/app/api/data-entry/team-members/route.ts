import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const officeCategory = searchParams.get('officeCategory');
    
    console.log('🔍 Team Members API called for office:', officeCategory);
    
    await connectDB();
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    const db = mongoose.connection.db;
    
    // DEBUG: Check total team members count
    const totalCount = await db.collection('team_members').countDocuments();
    console.log('📊 Total team members in DB:', totalCount);
    
    // Check all team members
    const allTeamMembers = await db.collection('team_members')
      .find({})
      .project({ name: 1, teamMemberNumber: 1, officeCategory: 1, role: 1, status: 1 })
      .toArray();
    
    console.log('📋 All team members:', allTeamMembers);
    
    // Your original query
    const query = {
      role: 'Recovery Team',
      officeCategory: officeCategory || 'Office 1',
      status: 'active'
    };
    
    console.log('🔍 Query being used:', query);
    
    const teamMembers = await db.collection('team_members')
      .find(query)
      .project({ 
        _id: 1,
        name: 1,
        phone: 1,
        whatsappNumber: 1,
        address: 1,
        teamMemberNumber: 1,
        loginId: 1,
        role: 1,
        status: 1,
        officeCategory: 1,
        joinDate: 1
      })
      .sort({ teamMemberNumber: 1 })
      .toArray();

    console.log(`✅ Found ${teamMembers.length} team members matching query`);
    console.log('📋 Found team members:', teamMembers);

    return NextResponse.json({
      success: true,
      data: teamMembers,
      count: teamMembers.length,
      debug: {
        totalInDB: totalCount,
        allTeamMembers: allTeamMembers,
        queryUsed: query
      }
    });

  } catch (error: any) {
    console.error('❌ Team Members API error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      debug: { error: error.message }
    });
  }
}