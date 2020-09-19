import {
  object as objectify,
} from 'dot-object';

import {
  capitalize,
  chain,
  has,
} from 'lodash';

import convict from 'convict';

const DEFAULTS = {
  env: {
    doc: 'Node environment',
    format: ['development', 'staging', 'production'],
    default: 'development',
    env: 'NODE_ENV',
  },
};

export default class ConfigConvict {
  static fromFile(path) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const file = require(path);

    return this.factory(file.default ? file.default : file);
  }

  static factory(manifest) {
    return new ConfigConvict(manifest);
  }

  constructor(manifest) {
    this.manifest = manifest;
  }

  load(secrets) {
    const merged = chain(this.manifest)
      .mapValues((value, key) => (
        has(value, 'doc')
          ? value
          : {
            doc: key.split('.').join(' '),
            format: global[capitalize(value)] || String,
            default: value,
            env: key.split('.').join('_').toUpperCase(),
          }
      ))
      .thru((manifest) => objectify(manifest))
      .merge(DEFAULTS)
      .value();

    const config = convict(merged);

    config.load(secrets);

    config.validate();

    return config;
  }
}
