import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user data from backend
    const userRes = await fetch(`${BACKEND_URL}/users?email=${encodeURIComponent(session.user.email)}`);
    
    if (!userRes.ok) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = await userRes.json();
    
    if (!userData.licenseKey) {
      return NextResponse.json({ error: 'No license key found' }, { status: 404 });
    }

    // For now, just return success - in production, this would send an email via SES
    // The backend would handle the actual email sending
    console.log(`Would email license key ${userData.licenseKey} to ${session.user.email}`);
    
    // In production, call backend to send email:
    // await fetch(`${BACKEND_URL}/license/email`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email: session.user.email }),
    // });

    return NextResponse.json({ success: true, message: 'License key sent to your email' });
  } catch (error: any) {
    console.error('Email license error:', error);
    return NextResponse.json({ error: 'Failed to email license key' }, { status: 500 });
  }
}



