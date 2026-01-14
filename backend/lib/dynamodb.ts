import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE!;

export interface User {
  PK: string;
  SK: string;
  GSI1PK?: string;  // LICENSE or CUSTOMER (for lookup by license key or Stripe customer ID)
  GSI1SK?: string;  // License key or Customer ID
  email: string;
  name?: string;
  image?: string;
  passwordHash?: string;
  provider?: string;
  providerId?: string;
  licenseKey: string;  // Unique license key for extension
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'canceled' | 'past_due';
  trialEndsAt?: string;  // ISO date string
  customerId?: string;   // Stripe customer ID
  subscriptionId?: string;  // Stripe subscription ID
  currentPeriodEnd?: string;  // Subscription period end
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageRecord {
  PK: string;
  SK: string;
  userId: string;
  promptsOptimized: number;
  tokensSaved: number;
  month: string;
}

// Trial period duration in days
const TRIAL_PERIOD_DAYS = 7;

// Generate a unique license key like TT-XXXX-XXXX-XXXX
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I/L
  const segments: string[] = [];
  
  for (let s = 0; s < 3; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return `TT-${segments.join('-')}`;
}

// User operations
export async function createUser(user: Omit<User, 'PK' | 'SK' | 'createdAt' | 'updatedAt' | 'trialEndsAt' | 'subscriptionStatus' | 'licenseKey'> & { subscriptionStatus?: User['subscriptionStatus'] }): Promise<User> {
  const now = new Date();
  
  // New users start with no subscription - must subscribe via Stripe to get trial
  const item: User = {
    PK: `USER#${user.email}`,
    SK: 'PROFILE',
    ...user,
    licenseKey: '', // No license key until they subscribe
    subscriptionStatus: user.subscriptionStatus || 'none',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  return item;
}

export async function getUser(email: string): Promise<User | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${email}`,
        SK: 'PROFILE',
      },
    })
  );

  return (result.Item as User) || null;
}

export async function updateUser(
  email: string,
  updates: Partial<User>
): Promise<User | null> {
  const updateExpression: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'PK' && key !== 'SK') {
      updateExpression.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${email}`,
        SK: 'PROFILE',
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return (result.Attributes as User) || null;
}

// License Key operations
export async function getUserByLicenseKey(licenseKey: string): Promise<User | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': 'LICENSE',
        ':sk': licenseKey,
      },
    })
  );

  return result.Items?.[0] as User | null;
}

// Usage tracking
export async function getOrCreateUsage(userId: string): Promise<UsageRecord> {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const pk = `USER#${userId}`;
  const sk = `USAGE#${month}`;

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
  );

  if (result.Item) {
    return result.Item as UsageRecord;
  }

  const newRecord: UsageRecord = {
    PK: pk,
    SK: sk,
    userId,
    promptsOptimized: 0,
    tokensSaved: 0,
    month,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: newRecord,
    })
  );

  return newRecord;
}

export async function incrementUsage(
  userId: string,
  promptsOptimized: number,
  tokensSaved: number
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `USAGE#${month}`,
      },
      UpdateExpression:
        'SET promptsOptimized = if_not_exists(promptsOptimized, :zero) + :prompts, tokensSaved = if_not_exists(tokensSaved, :zero) + :tokens, userId = :userId, #month = :month',
      ExpressionAttributeNames: {
        '#month': 'month',
      },
      ExpressionAttributeValues: {
        ':prompts': promptsOptimized,
        ':tokens': tokensSaved,
        ':zero': 0,
        ':userId': userId,
        ':month': month,
      },
    })
  );
}

/**
 * Check if a user has valid access to the service
 * Valid if: subscribed (active) OR in trial period (not expired)
 */
export function hasValidAccess(user: User): { valid: boolean; reason?: string } {
  const now = new Date();
  
  // Active subscription - always valid
  if (user.subscriptionStatus === 'active') {
    return { valid: true };
  }
  
  // Trialing - check if trial has expired
  if (user.subscriptionStatus === 'trialing') {
    if (user.trialEndsAt) {
      const trialEnd = new Date(user.trialEndsAt);
      if (now < trialEnd) {
        return { valid: true };
      } else {
        return { valid: false, reason: 'Trial period has expired. Please subscribe to continue.' };
      }
    }
    // No trial end date set - assume valid
    return { valid: true };
  }
  
  // Past due - give some grace period but warn
  if (user.subscriptionStatus === 'past_due') {
    return { valid: true }; // Stripe handles dunning, give grace
  }
  
  // Canceled or none
  if (user.subscriptionStatus === 'canceled') {
    // Check if still within paid period
    if (user.currentPeriodEnd) {
      const periodEnd = new Date(user.currentPeriodEnd);
      if (now < periodEnd) {
        return { valid: true };
      }
    }
    return { valid: false, reason: 'Subscription canceled. Please resubscribe to continue.' };
  }
  
  return { valid: false, reason: 'No active subscription. Please subscribe to use TokenTrim.' };
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByCustomerId(customerId: string): Promise<User | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': 'CUSTOMER',
        ':sk': customerId,
      },
    })
  );

  return result.Items?.[0] as User | null;
}














