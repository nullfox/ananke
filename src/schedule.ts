import { Context, MethodLike, Middleware, EventHandler } from './interfaces';

export default class Schedule<C extends Context> {
  method: MethodLike;
  middleware: Middleware<C>[] = [];

  static create<C extends Context>(method: MethodLike): Schedule<C> {
    return new Schedule<C>(method);
  }

  static fromPath<C extends Context>(path: string): Schedule<C> {
    // eslint-disable-next-line
    const method = require(path);

    return new Schedule<C>(method.default ? method.default : method);
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
      let context: Context = {
        functionName: 'sqs',
        headers: {},
      };

      context = await this.middleware.reduce(
        (acc, next) => acc.then((ctx) => next(event, ctx as C)),
        Promise.resolve(context),
      );

      if (typeof this.method === 'function') {
        this.method({}, context, event);
      } else {
        await this.method.handler({}, context as C, event);
      }
    };

    return eventHandler;
  }
}
