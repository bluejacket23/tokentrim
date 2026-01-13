import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';

// GET - Fetch user's API keys
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch keys from Lambda/DynamoDB
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/keys?email=${encodeURIComponent(session.user.email)}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch keys');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Fetch keys error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST - Create a new API key (generated server-side and emailed to user)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await req.json();

    // Backend generates key and emails it to user
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email,
        name: name || 'My API Key',
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || data.message || 'Failed to create key' },
        { status: response.status }
      );
    }

    // Key was created and emailed - don't return the actual key
    return NextResponse.json({
      id: data.id,
      name: data.name,
      message: data.message || 'API key created and sent to your email!',
      emailSent: data.emailSent,
    });
  } catch (error: any) {
    console.error('Create key error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create API key' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke an API key
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { keyId } = await req.json();

    // Delete from Lambda/DynamoDB
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/keys`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email,
        keyId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete key');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete key error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

















