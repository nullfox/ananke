import { ApolloServer, Config } from 'apollo-server-lambda';
import { mapKeys } from 'lodash';

import { Context, GraphQLMiddleware } from './interfaces';

export default class GraphQL<C extends Context> {
  config: Config;
  middleware: GraphQLMiddleware<C>[] = [];

  static create<C extends Context>(config: Config): GraphQL<C> {
    return new GraphQL<C>(config);
  }

  constructor(config: Config) {
    this.config = config;
  }

  addMiddleware(fn: GraphQLMiddleware<C>): this {
    this.middleware.push(fn);

    return this;
  }

  server(): ApolloServer {
    return new ApolloServer({
      ...this.config,
      context: async (rawContext) => {
        const { event } = rawContext;

        let context: Context = {
          functionName: 'graphql',
          headers: mapKeys(event.headers, (value, key) => key.toLowerCase()),
        };

        context = await this.middleware.reduce((acc, next) => acc.then((ctx) => next(event, ctx as C)), Promise.resolve(context));

        return {
          ...rawContext,
          ...context,
        };
      },
    });
  }

  handler(): any {
    const server = this.server();

    return server.createHandler();
  }
}
