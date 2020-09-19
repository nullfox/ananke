import {
  basename,
  dirname,
  join,
  relative,
  resolve,
} from 'path';

import {
  writeFileSync,
} from 'fs';

import { sync } from 'mkdirp';

import {
  ConfigKey,
  FileType,
} from '../../constants';

import Handler from '../handler';

import File from '../file';

export default class RPC {
  static factory(plugin) {
    return new RPC(plugin);
  }

  constructor(plugin) {
    this.plugin = plugin;
  }

  getPath() {
    return join(
      this.plugin.getCustomValue(ConfigKey.FunctionSource),
      'rpc.js',
    );
  }

  getTags() {
    return {
      rpc: this.plugin.getCustomValue(ConfigKey.RpcPath),
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getType() {
    return FileType.RPC;
  }

  getHandler() {
    return Handler.factory(this, this.plugin);
  }

  getOptions() {
    return {
      name: this.plugin.getSlsValue('service.name'),
      context: this.plugin.getCustomValue(ConfigKey.Context),
      preMiddleware: this.plugin.getCustomValue(ConfigKey.HttpPreMiddleware, []),
      postMiddleware: this.plugin.getCustomValue(ConfigKey.HttpPostMiddleware, []),
    };
  }

  getOutputFile() {
    return `_${basename(this.getPath())}`;
  }

  getOutputPath() {
    return join(
      dirname(this.getPath()),
      this.getOutputFile(),
    );
  }

  write() {
    const tmpl = File.getTemplate(this.getType());

    const sourcePath = relative(
      resolve(dirname(this.getPath())),
      resolve(this.getPath()),
    )
      .replace(/\.ts|\.js/, '');

    const replacements = {
      sourcePath,
      options: JSON.stringify(this.getOptions()),
      path: resolve(this.plugin.getCustomValue(ConfigKey.RpcMethodSource)),
    };

    // Ensures the directory exists...
    sync(dirname(this.getOutputPath()));

    return writeFileSync(
      this.getOutputPath(),
      tmpl(replacements),
    );
  }
}
