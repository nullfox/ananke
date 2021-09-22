import { APIGatewayProxyEvent } from "aws-lambda";
import { Result, Event } from '../interfaces';

export const respond = (errorOrResult: Error | unknown): Result => {
  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, User-Agent',
      'Access-Control-Request-Method': 'OPTIONS, POST',
    },
  };

  if (errorOrResult instanceof Error) {
    return {
      ...response,
      body: JSON.stringify({
        error: {
          code: (errorOrResult as Error & { code?: number }).code || 500,
          message: errorOrResult.message,
        },
      }),
    };
  }

  return {
    ...response,
    body: JSON.stringify(errorOrResult),
  };
};

export const eventIsV1 = (event: Event): event is APIGatewayProxyEvent => {
  if ((event as APIGatewayProxyEvent).httpMethod) {
    return true;
  }

  return false;
};

export const getHttpMethod = (event: Event): string => {
  if (eventIsV1(event)) {
    return event.httpMethod.toLowerCase();
  }

  return event.requestContext.http.method.toLowerCase();
};

export const eventCanHaveBody = (event: Event): boolean => {
  if (['post', 'put'].includes(getHttpMethod(event))) {
    return true;
  }

  return false;
};
