import Base from './base';

import Responder from './http/responder';

export default class Http extends Base {
  async getPreMiddleware() {
    if (!this.preMiddleware) {
      const paths = this.options.preMiddleware || [];

      this.preMiddleware = await Promise.all(
        paths.map((path) => Base.requireHandler(path, null, false)),
      );
    }

    return this.preMiddleware;
  }

  async getPostMiddleware() {
    if (!this.postMiddleware) {
      const paths = this.options.postMiddleware || [];

      this.postMiddleware = await Promise.all(
        paths.map((path) => Base.requireHandler(path, null, false)),
      );
    }

    return this.postMiddleware;
  }

  async reduceMiddleware(middleware = [], object, allowErrors = false) {
    const context = await this.resolveContext();

    let result = object;

    await Promise.all(
      middleware.map(async (fn) => {
        try {
          result = await fn(result, context);
        } catch (error) {
          if (allowErrors) {
            result = error;
          }

          throw error;
        }
      }),
    );

    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  getResponder(payload, headers = {}, statusCode = 200) {
    return new Responder(payload, headers, statusCode);
  }
}

export {
  Responder,
};
