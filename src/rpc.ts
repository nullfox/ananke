import { mapKeys } from 'lodash';
import { v4 } from 'uuid';
import * as Yup from 'yup';

import Error from './rpc/error';
import { respond, format, maybeParse, validateSchema, loadMethodsFromPath } from './rpc/util';
import { Context, MethodLike, Middleware, EventHandler } from './interfaces';

export {
  Error
};

export default class RPC<C extends Context> {
  methods: Map<string, MethodLike> = new Map();
  middleware: Middleware<C>[] = [];
  paths: string[] = [];

  static create<C extends Context>(): RPC<C> {
    return new RPC<C>();
  }

  addMethod(name: string, method: MethodLike<any, any>): this {
    this.methods.set(name, method);

    return this;
  }

  addMethods(methods: Record<string, MethodLike>): this {
    Object.keys(methods).forEach((key) => {
      this.methods.set(key, methods[key]);
    });
    
    return this;
  }

  addMethodsFromPath(path: string, extension = '.js'): this {
    const ext = extension || '.js';

    if (path.endsWith(ext)) {
      this.paths.push(path);
    } else {
      this.paths.push(`${path}${ext}`);
    }

    return this;
  }

  addMiddleware(fn: Middleware<C>): this {
    this.middleware.push(fn);

    return this;
  }

  handler(): EventHandler {
    const eventHandler: EventHandler = async (event, awsContext) => {
      if (this.paths.length > 0) {
        await Promise.all(this.paths.map(async (path) => {
          const methods = await loadMethodsFromPath(path);
  
          this.addMethods(methods);
        }));
  
        this.paths = [];
      }
  
      // Sanity check a valid event
      if (!event.body) {
        const id = v4();
  
        return respond(
          format(id, new Error(id, Error.CODE.PARSE_ERROR))
        );
      }
  
      let context: Context = {
        functionName: awsContext.functionName,
        headers: mapKeys(event.headers, (value, key) => key.toLowerCase()),
      };

      context = await this.middleware.reduce((acc, next) => acc.then((ctx) => next(event, ctx as C)), Promise.resolve(context));
  
      // Collect our array of schemas that will be 1+
      const schemas = maybeParse(event.body);
  
      // Run em all
      const results = await Promise.all(schemas.map(async (rawSchema) => {
        try {
          const schema = await validateSchema(rawSchema);
  
          const method = this.methods.get(schema.method);
  
          if (!method) {
            throw new Error(schema.id, Error.CODE.INVALID_METHOD);
          }
  
          let result;
  
          if (typeof method === 'function') {
            result = await method(schema.params, context, event);
          } else {
            const paramSchema = Yup.object().shape(method.validation(Yup, schema.params, context as C));
  
            let values;
  
            try {
              values = await paramSchema.validate(schema.params);
            } catch (error) {
              throw new Error(schema.id, Error.CODE.INVALID_PARAMS);
            }
  
            result = await method.handler(values, context as C, event);
          }
  
          return format(schema.id, result);
        } catch (error) {
          return format((error as Error).id, error);
        }
      }));
  
      if (results.length === 1) {
        return respond(results[0]);
      }
  
      return respond(results);
    };

    return eventHandler;
  }
}
