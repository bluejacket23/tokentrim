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
  email: string;
  name?: string;
  image?: string;
  passwordHash?: string;
  provider?: string;
  providerId?: string;
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'canceled';
  customerId?: string;
  subscriptionId?: string;
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

// User operations
export async function createUser(user: Omit<User, 'PK' | 'SK'>): Promise<User> {
  const item: User = {
    PK: `USER#${user.email}`,
    SK: 'PROFILE',
    ...user,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
















