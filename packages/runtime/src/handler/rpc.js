import {
  readdirSync,
} from 'fs';

import {
  basename,
  join,
} from 'path';

import {
  isArray,
} from 'lodash';

import {
  boomify,
  internal,
  notFound,
  unauthorized,
} from '@hapi/boom';

import * as Joi from 'joi';

import Http from './http';

const methodCache = new Map();

export default class RPC extends Http {
  static readFiles(path) {
    return readdirSync(path)
      .filter((file) => file.startsWith('_'))
      .map((file) => join(path, file));
  }

  static getEnvelopeSchema() {
    return Joi.object({
      id: Joi.string().uuid().required(),
      jsonrpc: Joi.string().valid('2.0').required(),
      method: Joi.string().required(),
      params: Joi.alternatives(
        Joi.array(),
        Joi.object(),
      ),
    });
  }

  static generateResponse(id, result) {
    const payload = {
      id,
      jsonrpc: '2.0',
    };

    if (result instanceof Error) {
      payload.error = {
        // @ts-ignore
        code: result.output.statusCode,
        // @ts-ignore
        message: result.output.payload.message,
      };
    } else {
      payload.result = result;
    }

    return payload;
  }

  async collect() {
    const result = await this.runner();

    if (!methodCache.has(result)) {
      methodCache.set(result, new Map());

      const fileNames = RPC.readFiles(result);

      fileNames.forEach((file) => {
        methodCache.get(result).set(basename(file.replace(/\.ts|\.js/, '')).slice(1), file);
      });
    }

    return methodCache.get(result);
  }

  async resolveMethod(envelope) {
    const methods = await this.collect();

    const path = methods.get(envelope.method);

    if (!path) {
      return {
        runner: (call) => (
          RPC.generateResponse(
            call.id,
            notFound(`Method ${envelope.method} does not exist`),
          )
        ),
      };
    }

    // eslint-disable-next-line import/no-dynamic-require, global-require
    const file = require(path);

    return {
      runner: file.runner,
      options: file.options,
    };
  }

  async callMethod(
    method,
    envelope,
    sourceEvent,
  ) {
    // Use the id from the envelope
    const requestId = envelope.id;

    let context;

    try {
      context = await this.resolveContext();
    } catch (error) {
      this.logger.error(error);

      return RPC.generateResponse(requestId, internal(`Context could not be resolved: ${error.message}`));
    }

    // Create a child logger attached to the requestId
    const childLogger = context.Logger.child({ requestId });

    childLogger.debug(
      {
        method: envelope.method,
      },
      'Starting RPC request',
    );

    try {
      const params = await RPC.validateSchema(
        RPC.schemaFromStrings(method.options.validation),
        envelope.params,
      );

      const request = await this.reduceMiddleware(
        await this.getPreMiddleware(),
        {
          params,
          envelope,
          headers: sourceEvent.headers,
          context: sourceEvent.requestContext,
        },
      );

      // If the method requires auth, ensure principalId exists
      if (!!method.options.requireAuth && !request.principalId) {
        throw unauthorized(`RPC method ${envelope.method} requires authentication`);
      }

      let result = await method.runner(
        request,
        context,
        sourceEvent,
      );

      result = await this.reduceMiddleware(
        await this.getPostMiddleware(),
        result,
      );

      childLogger.debug(
        {
          method: envelope.method,
        },
        'Finished request successfully',
      );

      return RPC.generateResponse(requestId, result);
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

      return RPC.generateResponse(requestId, boomed);
    }
  }

  async exec(event) {
    const envelope = await RPC.validateSchema(
      Joi.alternatives().try(
        RPC.getEnvelopeSchema(),
        Joi.array().items(RPC.getEnvelopeSchema()),
      ),
      JSON.parse(event.body),
    );

    const envelopes = isArray(envelope) ? envelope : [envelope];

    const results = await Promise.all(
      envelopes.map(async (env) => {
        const method = await this.resolveMethod(env);

        return this.callMethod(
          method,
          env,
          event,
        );
      }),
    );

    if (results.length === 1) {
      return this.getResponder(results.shift());
    }

    return this.getResponder(results);
  }
}
