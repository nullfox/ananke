import Bunyan from 'bunyan';
import Boom from '@hapi/boom';
import Joi from 'joi';

import Generic from './handler/generic';
import Queue from './handler/queue';
import REST from './handler/rest';
import RPC from './handler/rpc';

const Handler = {
  Generic,
  Queue,
  REST,
  RPC,
};

export {
  Bunyan,
  Boom,
  Handler,
  Joi,
};
