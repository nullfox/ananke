import {
  v4,
} from 'uuid';

import {
  boomify,
  internal,
  unauthorized,
} from '@hapi/boom';

import Http from './http';

export default class REST extends Http {
  static generateResponse(result) {
    if (result instanceof Error) {
      return result.output;
    }

    return {
      statusCode: 200,
      payload: result,
    };
  }

  static factory(runner, options = {}) {
    return new REST(runner, options);
  }

  async exec(event) {
    const requestId = v4();

    let context;

    try {
      context = await this.resolveContext();
    } catch (error) {
      this.logger.error(error);

      return REST.generateResponse(internal(`Context could not be resolved: ${error.message}`));
    }

    // Create a child logger attached to the requestId
    const childLogger = context.Logger.child({ requestId });

    childLogger.debug(
      {
        path: event.path,
        method: event.httpMethod,
      },
      'Starting REST request',
    );

    try {
      const payload = await REST.validateSchema(
        REST.schemaFromStrings(this.options.validation),
        JSON.parse(event.body),
      );

      const request = await this.reduceMiddleware(
        await this.getPreMiddleware(),
        {
          payload,
          headers: event.headers,
          context: event.requestContext,
        },
      );

      // If the method requires auth, ensure principalId exists
      if (!!this.options.requireAuth && !request.principalId) {
        throw unauthorized(`REST endpoint ${event.httpMethod.toUpperCase()} ${event.path} requires authentication`);
      }

      let result = await this.runner(
        request,
        context,
        event,
      );

      result = await this.reduceMiddleware(
        await this.getPostMiddleware(),
        result,
      );

      childLogger.debug(
        {
          path: event.path,
          method: event.httpMethod,
        },
        'Finished request successfully',
      );

      const response = REST.generateResponse(result);

      return this.getResponder(
        response.payload,
        {},
        response.statusCode,
      );
    } catch (error) {
      let boomed = boomify(error);

      try {
        boomed = await this.reduceMiddleware(
          await this.getPostMiddleware(),
          boomed,
        );

        boomed = boomify(boomed);
      } catch (middleError) {
        boomed = boomify(middleError);
      }

      if (boomed.isServer) {
        childLogger.error(
          { err: boomed },
          'Finished request with server error',
        );
      } else {
        childLogger.debug(
          { err: boomed },
          'Finished request with client error',
        );
      }

      const response = REST.generateResponse(boomed);

      return this.getResponder(
        response.payload,
        response.headers,
        response.statusCode,
      );
    }
  }
}
