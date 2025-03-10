import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import { getCurrentUser } from '@/lib/auth';
import { updateRegistrySubscriptions } from '@/lib/registry-utils';

// GET all subscriptions for the authenticated user
export async function GET(req: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    // Get current user from token
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Find all subscriptions for this user
    const subscriptions = await Subscription.find({ userId: user.id });
    
    return NextResponse.json({
      success: true,
      subscriptions,
    });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new subscription for the authenticated user
export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    // Get current user from token
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    
    // Calculate nextPayment date based on startDate and billingCycle
    const startDate = new Date(body.startDate);
    let nextPayment = new Date(startDate);
    
    // Check if start date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day
    
    // If start date is in the future, use it as the next payment date
    if (startDate > today) {
      nextPayment = startDate;
    } else {
      // If start date is today or in the past, calculate next payment based on billing cycle
      switch (body.billingCycle) {
        case 'Weekly':
          nextPayment.setDate(startDate.getDate() + 7);
          break;
        case 'Biweekly':
          nextPayment.setDate(startDate.getDate() + 14);
          break;
        case 'Monthly':
          nextPayment.setMonth(startDate.getMonth() + 1);
          break;
        case 'Quarterly':
          nextPayment.setMonth(startDate.getMonth() + 3);
          break;
        case 'Yearly':
          nextPayment.setFullYear(startDate.getFullYear() + 1);
          break;
        default:
          // Default to monthly if unknown billing cycle
          nextPayment.setMonth(startDate.getMonth() + 1);
      }
      
      // If calculated next payment is still in the past, keep advancing until it's in the future
      while (nextPayment <= today) {
        switch (body.billingCycle) {
          case 'Weekly':
            nextPayment.setDate(nextPayment.getDate() + 7);
            break;
          case 'Biweekly':
            nextPayment.setDate(nextPayment.getDate() + 14);
            break;
          case 'Monthly':
            nextPayment.setMonth(nextPayment.getMonth() + 1);
            break;
          case 'Quarterly':
            nextPayment.setMonth(nextPayment.getMonth() + 3);
            break;
          case 'Yearly':
            nextPayment.setFullYear(nextPayment.getFullYear() + 1);
            break;
          default:
            nextPayment.setMonth(nextPayment.getMonth() + 1);
        }
      }
    }
    
    // Create subscription with user ID
    const subscription = await Subscription.create({
      ...body,
      userId: user.id,
      nextPayment: nextPayment.toISOString().split('T')[0], // Format as YYYY-MM-DD
    });
    
    // Update the user registry with the new subscription
    try {
      await updateRegistrySubscriptions(user.id);
      console.log(`User registry updated with new subscription for user ${user.id}`);
    } catch (registryError) {
      // Log error but don't fail the request
      console.error('Error updating user registry with new subscription:', registryError);
    }
    
    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 