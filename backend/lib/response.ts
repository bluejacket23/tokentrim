import { APIGatewayProxyResult } from 'aws-lambda';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

export function success(body: any): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(body),
  };
}

export function created(body: any): APIGatewayProxyResult {
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(body),
  };
}

export function badRequest(message: string): APIGatewayProxyResult {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: message }),
  };
}

export function unauthorized(message: string = 'Unauthorized'): APIGatewayProxyResult {
  return {
    statusCode: 401,
    headers,
    body: JSON.stringify({ error: message }),
  };
}

export function forbidden(message: string = 'Forbidden'): APIGatewayProxyResult {
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ error: message }),
  };
}

export function notFound(message: string = 'Not found'): APIGatewayProxyResult {
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: message }),
  };
}

export function conflict(message: string): APIGatewayProxyResult {
  return {
    statusCode: 409,
    headers,
    body: JSON.stringify({ error: message }),
  };
}

export function serverError(message: string = 'Internal server error'): APIGatewayProxyResult {
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ error: message }),
  };
}













