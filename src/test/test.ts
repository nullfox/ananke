import { join } from 'path';
import { v4 } from 'uuid';
import Queue from '../queue';
import REST from '../rest';
import RPC from '../rpc';
import { Context, Method } from '../interfaces';

interface TestContext extends Context {
  foo: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const helloWorld: Method<{ name: string }, TestContext> = {
  validation: (yup) => ({
    name: yup.string().required(),
  }),
  handler: (params, context) => {
    console.log(params, context);

    return params.name;
  },
};

const rpc = RPC.create<TestContext>()
  .addMethod('hello.world', helloWorld)
  .addMethodsFromPath(join(__dirname, 'methods/**'))
  .addMiddleware((event, context) => {
    context.foo = 'bar';

    return context;
  })
  .addMiddleware(async (event, context) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    context.user = {
      id: v4(),
      firstName: 'Ben',
      lastName: 'Fox',
    };

    return context;
  });

exports.rpc = rpc.handler();
exports.webhook = REST.fromPath<TestContext>(join(__dirname, 'rest/webhook'))
  .addMiddleware(async (event, context) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    context.user = {
      id: v4(),
      firstName: 'Ben',
      lastName: 'Fox',
    };

    return context;
  })
  .handler();

exports.queue = Queue.fromPath<Context>(join(__dirname, 'queue/recording'), 'http://fake').handler();
