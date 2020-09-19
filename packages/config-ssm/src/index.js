import {
  object,
} from 'dot-object';

import {
  SSM as Client,
} from 'aws-sdk';

import {
  has,
  chain,
  isFunction,
  isRegExp,
  mapKeys,
  omitBy,
  pickBy,
} from 'lodash';

export default class ConfigSSM {
  static factory(ssmOrUndefined) {
    return new ConfigSSM(ssmOrUndefined);
  }

  constructor(ssmOrUndefined) {
    this.ssm = ssmOrUndefined || new Client();
  }

  async recursiveFetch(prefix, token, secrets = {}) {
    const normalizedPath = `${prefix.replace(/\/$/, '')}/`;

    const request = {
      Path: normalizedPath,
      NextToken: token,
      Recursive: true,
      WithDecryption: true,
    };

    const response = await this.ssm.getParametersByPath(request).promise();

    const aggregate = chain(response.Parameters)
      .map((param) => (
        [
          param.Name.replace(request.Path, '').replace(/\//g, '.'),
          param.Value,
        ]
      ))
      .fromPairs()
      .merge(secrets)
      .value();

    if (response.NextToken) {
      return this.recursiveFetch(
        normalizedPath,
        response.NextToken,
        aggregate,
      );
    }

    return aggregate;
  }

  async fetchRaw(prefix, options = {}) {
    const fetched = await this.recursiveFetch(prefix, undefined);

    let filtered = fetched;

    if (has(options, 'only')) {
      if (!isRegExp(options.only)) {
        throw new RangeError('only must be a regular expression');
      }

      filtered = pickBy(filtered, (val, key) => options.only.test(key));
    }

    if (has(options, 'except')) {
      if (!isRegExp(options.except)) {
        throw new RangeError('except must be a regular expression');
      }

      filtered = omitBy(filtered, (val, key) => options.except.test(key));
    }

    if (has(options, 'sortKey')) {
      if (!isFunction(options.sortKey)) {
        throw new RangeError('sortKey must a function that accepts a single string');
      }

      filtered = chain(filtered)
        .toPairs()
        .sortBy((pair) => options.sortKey(pair[0]))
        .fromPairs()
        .value();
    }

    if (has(options, 'transformKey')) {
      if (!isFunction(options.transformKey)) {
        throw new RangeError('transformKey must a function that accepts a single string');
      }

      filtered = mapKeys(filtered, (val, key) => options.transformKey(key));
    }

    return filtered;
  }

  async fetch(prefix, options = {}) {
    const raw = await this.fetchRaw(prefix, options);

    return object(raw);
  }
}

export {
  Client,
};