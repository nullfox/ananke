import Yup, { AnySchema } from 'yup';

export type AWSContext = import('aws-lambda').Context;
export type Result = import('aws-lambda').APIGatewayProxyResult;
export type Event = import('aws-lambda').APIGatewayProxyEvent | import('aws-lambda').APIGatewayProxyEventV2;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Param = any;
export interface Params {
  [key: string]: Param;
}
export interface Context {
  functionName: string;
  headers: Record<string, string | undefined>;
  [key: string]: any;
}
export type Handler<P extends Params, C extends Context = Context> = (
  params: P,
  context: C,
  event: Event,
) => Promise<unknown> | unknown;
export type Method<P extends Params, C extends Context = Context> = {
  authenticated?: boolean;
  validation: (yup: typeof Yup, input: Record<string, Param>, context: C) => Record<keyof P, AnySchema>;
  handler: Handler<P, C>;
};
export type Middleware<C = Context> = (event: Event, context: C, options?: { authenticated?: boolean }) => C | Promise<C>;
export type MethodLike<P extends Params = Params, C extends Context = Context> = Handler<P, C> | Method<P, C>;
export type Schema = {
  id: string;
  jsonrpc: '2.0';
  method: string;
  params: Params;
};
export type EventHandler = (event: Event, context: AWSContext) => Promise<unknown> | unknown;
