/**
 * Local file-based database for development
 * In production, this would be DynamoDB via API Gateway
 */

import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_FILE = path.join(process.cwd(), '.local-db.json');

export interface User {
  email: string;
  name?: string;
  image?: string;
  passwordHash?: string;
  provider: 'credentials' | 'google';
  providerId?: string;
  subscriptionStatus: 'none' | 'trial' | 'active' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface Database {
  users: Record<string, User>;
}

async function readDb(): Promise<Database> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist, return empty db
    return { users: {} };
  }
}

async function writeDb(db: Database): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

export async function getUser(email: string): Promise<User | null> {
  const db = await readDb();
  return db.users[email] || null;
}

export async function createUser(userData: {
  email: string;
  name?: string;
  image?: string;
  password?: string;
  provider: 'credentials' | 'google';
  providerId?: string;
}): Promise<User> {
  const db = await readDb();
  
  // Check if user exists
  if (db.users[userData.email]) {
    throw new Error('User already exists');
  }

  const now = new Date().toISOString();
  
  const user: User = {
    email: userData.email,
    name: userData.name,
    image: userData.image,
    passwordHash: userData.password ? await bcrypt.hash(userData.password, 10) : undefined,
    provider: userData.provider,
    providerId: userData.providerId,
    subscriptionStatus: 'none', // No subscription until they pay via Stripe
    createdAt: now,
    updatedAt: now,
  };

  db.users[userData.email] = user;
  await writeDb(db);
  
  return user;
}

export async function updateUser(email: string, updates: Partial<User>): Promise<User | null> {
  const db = await readDb();
  
  if (!db.users[email]) {
    return null;
  }

  db.users[email] = {
    ...db.users[email],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeDb(db);
  return db.users[email];
}

export async function validatePassword(email: string, password: string): Promise<User | null> {
  const user = await getUser(email);
  
  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}






