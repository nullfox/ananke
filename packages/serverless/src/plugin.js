import {
  inspect,
} from 'util';

import {
  ok,
} from 'assert';

import {
  sync,
} from 'glob';

import {
  chain,
  get,
  isPlainObject,
  set,
} from 'lodash';

import { ConfigKey } from './constants';

import File from './plugin/file';
import RPC from './plugin/file/rpc';

export default class Plugin {
  constructor(sls, options) {
    this.sls = sls;
    this.options = options;

    this.hooks = {
      'before:package:initialize': this.assemble.bind(this),
      'before:package:createDeploymentArtifacts': this.wrap.bind(this),
      'before:deploy:function:packageFunction': this.wrap.bind(this),
      'before:invoke:local:invoke': this.assembleAndWrap.bind(this),
      'before:offline:start': this.assembleAndWrap.bind(this),
    };

    ok(
      !this.hasCustomValue(ConfigKey.Context)
        || (
          this.hasCustomValue(ConfigKey.Context)
            && isPlainObject(this.getCustomValue(ConfigKey.Context))
        ),
      `${ConfigKey.Context} key must be an object containing Key: path/to/file (ex: Database: lib/functions/context/database)`,
    );

    ok(
      this.hasCustomValue(ConfigKey.FunctionSource),
      `${ConfigKey.FunctionSource} key must be set in serverless.yml (ex: custom.${ConfigKey.FunctionSource}: lib/functions)`,
    );

    const files = sync(`${this.getCustomValue(ConfigKey.FunctionSource)}/**/*.+(js|ts)`);

    this.files = chain(files)
      // All of our files write prepending with _
      .filter((file) => !file.split('/').pop().startsWith('_'))

      // Ignore TS declaration files
      .filter((file) => !file.endsWith('d.ts'))

      // Turn them into File instances
      .map((file) => File.factory(file, this))
      .value();

    if (this.hasRpc()) {
      this.rpc = RPC.factory(this);
    }
  }

  getCustomValue(key, defaultValue = undefined) {
    ok(
      Object.keys(ConfigKey).includes(key),
      `Key must be one of the following: ${Object.keys(ConfigKey).join(', ')}`,
    );

    return get(this.sls.service, `custom.${key}`, defaultValue);
  }

  hasCustomValue(key) {
    return this.getCustomValue(key) !== undefined;
  }

  getSlsValue(key) {
    return get(this.sls, key);
  }

  hasRpc() {
    return this.hasCustomValue(ConfigKey.RpcPath)
      && this.hasCustomValue(ConfigKey.RpcMethodSource);
  }

  assemble() {
    const functions = chain(this.files)
      .filter((file) => file.shouldRegister())
      .map((file) => file.getHandler())
      .keyBy((handler) => handler.getKey())
      .mapValues((handler) => handler.toServerless())
      .value();

    if (this.hasRpc()) {
      const rpc = this.rpc.getHandler();

      functions[rpc.getKey()] = rpc.toServerless();
    }

    set(
      this.sls.service,
      'functions',
      {
        ...get(this.sls.service, 'functions', {}),
        ...(functions),
      },
    );

    console.log('Functions', inspect(this.sls.service.functions, true, null));
  }

  wrap() {
    this.files.forEach((file) => {
      file.write();
    });

    if (this.hasRpc()) {
      this.rpc.write();
    }
  }

  assembleAndWrap() {
    this.assemble();
    this.wrap();
  }
}
