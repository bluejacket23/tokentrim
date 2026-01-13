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
  GSI1PK?: string;  // CUSTOMER (for lookup by Stripe customer ID)
  GSI1SK?: string;  // Customer ID
  email: string;
  name?: string;
  image?: string;
  passwordHash?: string;
  provider?: string;
  providerId?: string;
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'canceled' | 'past_due';
  trialEndsAt?: string;  // ISO date string
  customerId?: string;   // Stripe customer ID
  subscriptionId?: string;  // Stripe subscription ID
  currentPeriodEnd?: string;  // Subscription period end
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  keyId: string;
  keyHash: string;
  name: string;
  userId: string;
  createdAt: string;
  lastUsed?: string;
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

// User operations
export async function createUser(user: Omit<User, 'PK' | 'SK' | 'createdAt' | 'updatedAt' | 'trialEndsAt' | 'subscriptionStatus'> & { subscriptionStatus?: User['subscriptionStatus'] }): Promise<User> {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  
  const item: User = {
    PK: `USER#${user.email}`,
    SK: 'PROFILE',
    ...user,
    subscriptionStatus: user.subscriptionStatus || 'trialing',
    trialEndsAt: trialEnd.toISOString(),
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

// API Key operations
export async function createApiKey(
  userId: string,
  keyId: string,
  keyHash: string,
  name: string
): Promise<ApiKey> {
  const item: ApiKey = {
    PK: `USER#${userId}`,
    SK: `KEY#${keyId}`,
    GSI1PK: 'APIKEY',
    GSI1SK: keyHash,
    keyId,
    keyHash,
    name,
    userId,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
}

export async function getApiKeysByUser(userId: string): Promise<ApiKey[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'KEY#',
      },
    })
  );

  return (result.Items as ApiKey[]) || [];
}

export async function getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': 'APIKEY',
        ':sk': keyHash,
      },
    })
  );

  return result.Items?.[0] as ApiKey | null;
}

export async function deleteApiKey(userId: string, keyId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `KEY#${keyId}`,
      },
    })
  );
}

export async function updateKeyLastUsed(userId: string, keyId: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `KEY#${keyId}`,
      },
      UpdateExpression: 'SET lastUsed = :lastUsed',
      ExpressionAttributeValues: {
        ':lastUsed': new Date().toISOString(),
      },
    })
  );
}

// Anti-abuse configuration
const MAX_REQUESTS_PER_HOUR = 500;  // Max requests per API key per hour
const MAX_UNIQUE_IPS = 5;           // Max unique IPs per key in 24h (reasonable for work + home + mobile)
const ABUSE_THRESHOLD_IPS = 10;     // Flag for review if more than this many IPs

/**
 * Track API key usage and detect potential abuse
 * Returns: { allowed: boolean, reason?: string, warning?: string }
 */
export async function trackKeyUsage(
  userId: string,
  keyId: string,
  clientIP: string
): Promise<{ allowed: boolean; reason?: string; warning?: string }> {
  const now = new Date();
  const currentHour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  
  // Get current key record
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `KEY#${keyId}`,
      },
    })
  );
  
  const key = result.Item as ApiKey | undefined;
  if (!key) {
    return { allowed: false, reason: 'Key not found' };
  }
  
  // Check if flagged for abuse
  if (key.flaggedForAbuse) {
    return { allowed: false, reason: 'This API key has been flagged for suspicious activity. Please contact support.' };
  }
  
  // Check rate limit
  let requestCount = 1;
  if (key.requestHour === currentHour) {
    requestCount = (key.requestCount || 0) + 1;
    if (requestCount > MAX_REQUESTS_PER_HOUR) {
      return { allowed: false, reason: `Rate limit exceeded (${MAX_REQUESTS_PER_HOUR} requests/hour). Try again later.` };
    }
  }
  
  // Track unique IPs (keep last 24 hours worth)
  let uniqueIPs = key.uniqueIPs || [];
  if (!uniqueIPs.includes(clientIP)) {
    uniqueIPs.push(clientIP);
    // Keep only last 20 IPs to avoid unbounded growth
    if (uniqueIPs.length > 20) {
      uniqueIPs = uniqueIPs.slice(-20);
    }
  }
  
  // Check for suspicious IP count
  let warning: string | undefined;
  let shouldFlag = false;
  
  if (uniqueIPs.length > ABUSE_THRESHOLD_IPS) {
    shouldFlag = true;
    // Still allow but will be flagged for review
    warning = 'Unusual activity detected on this API key.';
  } else if (uniqueIPs.length > MAX_UNIQUE_IPS) {
    warning = `This key is being used from ${uniqueIPs.length} different locations. Keys are for personal use only.`;
  }
  
  // Update the key record
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `KEY#${keyId}`,
      },
      UpdateExpression: `
        SET lastUsed = :lastUsed,
            lastIP = :lastIP,
            uniqueIPs = :uniqueIPs,
            requestCount = :requestCount,
            requestHour = :requestHour
            ${shouldFlag ? ', flaggedForAbuse = :flagged' : ''}
      `,
      ExpressionAttributeValues: {
        ':lastUsed': now.toISOString(),
        ':lastIP': clientIP,
        ':uniqueIPs': uniqueIPs,
        ':requestCount': requestCount,
        ':requestHour': currentHour,
        ...(shouldFlag && { ':flagged': true }),
      },
    })
  );
  
  return { allowed: true, warning };
}

/**
 * Reset abuse flag for a key (admin function)
 */
export async function resetKeyAbuseFlag(userId: string, keyId: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `KEY#${keyId}`,
      },
      UpdateExpression: 'SET flaggedForAbuse = :flagged, uniqueIPs = :emptyList',
      ExpressionAttributeValues: {
        ':flagged': false,
        ':emptyList': [],
      },
    })
  );
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

















