import {
  join,
  resolve as resolvePath,
} from 'path';

import {
  isFunction,
  map,
  mapValues,
} from 'lodash';

import {
  object,
} from 'joi';

import {
  badRequest,
} from '@hapi/boom';

import Bunyan from 'bunyan';

import fromString from '../util/joiFromString';

let contextChain = null;

export default class Base {
  static schemaFromStrings(strings) {
    if (!strings) {
      return object({});
    }

    return object(
      mapValues(
        strings,
        (val) => fromString(val),
      ),
    );
  }

  static validateSchema(schema, params) {
    return new Promise((resolve, reject) => {
      const result = schema.validate(
        params,
        {
          allowUnknown: true,
          stripUnknown: true,
        },
      );

      if (result.error) {
        reject(
          badRequest(
            'One or more parameters are invalid',
            (result.error.details || []).map((d) => d.message),
          ),
        );
      }

      resolve(result.value);
    });
  }

  static requireFunction(path) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(path);
  }

  static requireHandler(path, handlerName = 'handler', underscoreName = true) {
    let fullPath = resolvePath(
      process.cwd(),
      path,
    );

    if (underscoreName) {
      const pieces = path.split('/');

      pieces.push(`_${pieces.pop()}`);

      fullPath = join(
        process.cwd(),
        ...pieces,
      );
    }

    // eslint-disable-next-line import/no-dynamic-require, global-require
    const file = require(fullPath);

    let fn;

    if (!handlerName) {
      fn = file.default || file;
    } else {
      fn = file[handlerName];
    }

    if (!fn) {
      throw new Error(`Helper at ${path} does not export a function`);
    }

    return fn;
  }

  static factory(runner, options = {}) {
    return new Base(runner, options);
  }

  constructor(runner, options = {}) {
    this.runner = runner;
    this.options = options;

    this.logger = Bunyan.createLogger({
      name: process.env.SERVICE_NAME || 'unknown',
      serializers: Bunyan.stdSerializers,
      level: (
        process.env.LOG_LEVEL
          ? parseInt(process.env.LOG_LEVEL, 10)
          : 30
      ),
    });
  }

  async resolveContext() {
    if (!contextChain) {
      // @ts-ignore
      contextChain = Promise.resolve({});

      const context = map(
        this.options.context || {},
        (pathOrFn, key) => (
          {
            key,
            handler: pathOrFn,
          }
        ),
      );

      context.unshift({
        key: 'Logger',
        handler: () => this.logger,
      });

      context.forEach(({ key, handler }) => {
        contextChain = contextChain.then(async (ctx) => {
          let fn;

          if (isFunction(handler)) {
            fn = handler;
          } else {
            fn = Base.requireHandler(handler, null, false);
          }

          return Object.assign(
            ctx,
            {
              [key]: await fn(ctx),
            },
          );
        });
      });
    }

    return contextChain;
  }

  // eslint-disable-next-line class-methods-use-this
  async exec() {
    throw new Error('Implement in subclass');
  }
}
