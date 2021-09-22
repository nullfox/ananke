import { Handler } from '../../interfaces';

const handler: Handler<Record<string, unknown>> = async (params, context) => {
  const { user } = context;

  if (!user) {
    throw new Error('Invalid user');
  }

  return null;
};

export default handler;
