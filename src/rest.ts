import { mapKeys } from 'lodash';
import * as Yup from 'yup';
import Error from './rest/error';
import { eventCanHaveBody, respond } from './rest/utils';
import { Context, MethodLike, Middleware, EventHandler, Param } from './interfaces';

export {
  Error
};

export default class REST<C extends Context> {
  method: MethodLike;
  middleware: Middleware<C>[] = [];

  static create<C extends Context>(method: MethodLike): REST<C> {
    return new REST<C>(method);
  }

  static fromPath<C extends Context>(path: string): REST<C> {
    // eslint-disable-next-line
    const method = require(path);

    return new REST<C>(method.default ? method.default : method);
  }

  constructor(method: MethodLike) {
    this.method = method;
  }

  addMiddleware(fn: Middleware<C>): this {
    this.middleware.push(fn);

    return this;
  }

  handler(): EventHandler {
    const eventHandler: EventHandler = async (event, awsContext) => {
      const { body } = event;

      let context: Context = {
        functionName: awsContext.functionName,
        headers: mapKeys(event.headers, (value, key) => key.toLowerCase()),
      };

      context = await this.middleware.reduce((acc, next) => acc.then((ctx) => next(event, ctx as C)), Promise.resolve(context));

      let params: Record<string, Param> = {};

      if (eventCanHaveBody(event)) {
        if (!body) {
          return respond(new Error('Body must contain well formed JSON', 400)); 
        }

        const parsed = JSON.parse(body);

        if (typeof this.method !== 'function' && this.method.validation) {
          const schema = Yup.object().shape(this.method.validation(Yup, parsed, context));

          await schema.validate(parsed);
        }

        params = parsed;
      }

      try {
        let result: any;

        if (typeof this.method === 'function') {
          result = await this.method(params, context, event);
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

          result = await this.method.handler(values, context as C, event);
        }

        return respond(result);
      } catch (error) {
        return respond(error);
      }
    };

    return eventHandler;
  }
}
