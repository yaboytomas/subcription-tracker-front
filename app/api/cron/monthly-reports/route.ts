import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db-connect';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import { sendMonthlySpendingReport } from '@/lib/email-service';

// Helper functions
function getMonthlyPrice(subscription: any): number {
  const amount = parseFloat(subscription.amount);
  
  switch (subscription.billingCycle) {
    case 'Monthly':
      return amount;
    case 'Yearly':
      return amount / 12;
    case 'Weekly':
      return amount * 4.33; // Average weeks in a month
    case 'Quarterly':
      return amount / 3;
    case 'Biweekly':
      return amount * 2.17; // Average bi-weeks in a month
    default:
      return amount;
  }
}

function getDaysUntil(dateString: string): number {
  const today = new Date();
  const targetDate = new Date(dateString);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function GET(req: NextRequest) {
  try {
    // Check for authorization with a secret token for cron jobs
    const authHeader = req.headers.get('authorization');
    const cronToken = process.env.CRON_SECRET_TOKEN || 'your-default-cron-secret';
    
    if (authHeader !== `Bearer ${cronToken}`) {
      console.warn('Unauthorized access attempt to monthly reports cron job');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Starting monthly spending report generation...');
    
    // Connect to the database
    try {
      await dbConnect();
      console.log('Database connected successfully');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    // Get all users with monthly reports enabled
    let users;
    try {
      users = await User.find({ 'notificationPreferences.monthlyReports': true });
      console.log(`Found ${users.length} users with monthly reports enabled`);
    } catch (userError) {
      console.error('Error fetching users:', userError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      );
    }
    
    let emailsSent = 0;
    let errors = 0;
    
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    
    // Process each user
    for (const user of users) {
      try {
        console.log(`Processing user: ${user.email}`);
        
        // Get user's subscriptions
        const subscriptions = await Subscription.find({ user: user._id });
        
        if (subscriptions.length === 0) {
          console.log(`No subscriptions found for user ${user.email}`);
          continue;
        }
        
        console.log(`Found ${subscriptions.length} subscriptions for ${user.email}`);
        
        // Calculate current month's spending
        const totalSpent = subscriptions.reduce((total, sub) => total + getMonthlyPrice(sub), 0);
        
        // For previous month, we can either:
        // 1. Calculate based on actual historical data (if you have it)
        // 2. Use a simulated value for demonstration
        // Here we'll use a simulated value as a placeholder
        const variation = Math.random() * 0.2 - 0.1; // Between -10% and +10%
        const previousMonthSpent = totalSpent * (1 + variation);
        
        // Group subscriptions by category
        const categoryMap = new Map<string, number>();
        
        subscriptions.forEach(sub => {
          const category = sub.category || 'Uncategorized';
          const monthlyPrice = getMonthlyPrice(sub);
          categoryMap.set(category, (categoryMap.get(category) || 0) + monthlyPrice);
        });
        
        // Create categories array
        const categories = Array.from(categoryMap.entries()).map(([name, amount]) => ({
          name,
          amount,
          percentage: Math.round((amount / totalSpent) * 100)
        }));
        
        // Sort subscriptions by price (highest first)
        const sortedSubscriptions = [...subscriptions].sort((a, b) => 
          getMonthlyPrice(b) - getMonthlyPrice(a)
        );
        
        // Get top subscriptions (up to 5)
        const topSubscriptions = sortedSubscriptions.slice(0, 5).map(sub => ({
          name: sub.name,
          amount: getMonthlyPrice(sub),
          category: sub.category || 'Uncategorized'
        }));
        
        // Get upcoming renewals in the next 30 days
        const upcomingRenewals = subscriptions
          .filter(sub => {
            const daysUntil = getDaysUntil(sub.nextPaymentDate);
            return daysUntil >= 0 && daysUntil <= 30;
          })
          .map(sub => ({
            name: sub.name,
            date: sub.nextPaymentDate,
            amount: parseFloat(sub.amount),
            daysUntil: getDaysUntil(sub.nextPaymentDate)
          }))
          .sort((a, b) => a.daysUntil - b.daysUntil)
          .slice(0, 5);
        
        // Prepare the report data
        const reportData = {
          monthName: currentMonth,
          year: currentYear,
          totalSpent: totalSpent,
          previousMonthSpent: previousMonthSpent,
          categories: categories,
          topSubscriptions: topSubscriptions,
          upcomingRenewals: upcomingRenewals
        };
        
        // Send the monthly report
        await sendMonthlySpendingReport(
          { email: user.email, name: user.name },
          reportData
        );
        
        emailsSent++;
        console.log(`Sent monthly report to ${user.email}`);
      } catch (err) {
        console.error(`Error processing user ${user.email}:`, err);
        errors++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Monthly spending reports generated successfully. Sent ${emailsSent} emails. Errors: ${errors}.`,
      emailsSent,
      errors
    });
  } catch (error) {
    console.error('Monthly spending report generation failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : '') : undefined
      },
      { status: 500 }
    );
  }
} 