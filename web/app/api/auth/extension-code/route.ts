import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-jwt-secret';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { state } = await req.json();

    if (!state) {
      return NextResponse.json(
        { error: 'Missing state parameter' },
        { status: 400 }
      );
    }

    // Generate a JWT as the auth code (expires in 5 minutes)
    // The backend will verify this JWT to get user info
    const code = jwt.sign(
      {
        email: session.user.email,
        name: session.user.name,
        state,
      },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return NextResponse.json({ code });
  } catch (error: any) {
    console.error('Extension code error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate code' },
      { status: 500 }
    );
  }
}

