import { SQSEvent } from 'aws-lambda';
import * as Yup from 'yup';
import Error from './rest/error';
import { Context, MethodLike, Middleware, EventHandler, Param } from './interfaces';

export default class Queue<C extends Context> {
  method: MethodLike;
  middleware: Middleware<C>[] = [];

  static create<C extends Context>(method: MethodLike): Queue<C> {
    return new Queue<C>(method);
  }

  static fromPath<C extends Context>(path: string): Queue<C> {
    // eslint-disable-next-line
    const method = require(path);

    return new Queue<C>(method.default ? method.default : method);
  }

  constructor(method: MethodLike) {
    this.method = method;
  }

  addMiddleware(fn: Middleware<C>): this {
    this.middleware.push(fn);

    return this;
  }

  handler(): EventHandler {
    const eventHandler: EventHandler = async (event) => {
      const sqsEvent: SQSEvent = (event as unknown) as SQSEvent;

      const { Records } = sqsEvent;

      let context: Context = {
        functionName: 'sqs',
        headers: {},
      };

      context = await this.middleware.reduce((acc, next) => acc.then((ctx) => next(event, ctx as C)), Promise.resolve(context));

      let params: Record<string, Param> = {};

      return Promise.all(Records.map(async (record) => {
        const data = JSON.parse(record.body);

        const parsed = JSON.parse(data);

        if (typeof this.method !== 'function' && this.method.validation) {
          const schema = Yup.object().shape(this.method.validation(Yup, parsed, context));

          await schema.validate(parsed);
        }

        params = parsed;

        if (typeof this.method === 'function') {
          await this.method(params, context, event);
        } else {
          let values = params;

          if (this.method.validation) {
            const schema = Yup.object().shape(this.method.validation(Yup, params, context as C));

            try {
              values = await schema.validate(params);
            } catch (error) {
              throw new Error('One or more parameters are invalid', 400);
            }
          }

          await this.method.handler(values, context as C, event);
        }
      }));
    };

    return eventHandler;
  }
}
