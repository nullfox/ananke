import {
  readFileSync,
  writeFileSync,
} from 'fs';

import {
  basename,
  dirname,
  join,
  relative,
  resolve,
} from 'path';

import {
  fromPairs,
  get,
  has,
  keys,
  intersection,
  template as compileTemplate,
  merge,
  omit,
} from 'lodash';

import DocBlock from 'docblock';

import {
  ConfigKey,
  FileType,
} from '../constants';

import Handler from './handler';

export default class File {
  static getTags(file) {
    const db = new DocBlock();

    if (!/.*(ts|js)$/.test(file)) {
      throw new Error(`${file} must end in .js or .ts`);
    }

    const code = readFileSync(file);

    const tags = db.parse(
      code,
      'js',
    )
      .shift();

    if (has(tags.tags, 'unknown')) {
      return omit(
        merge(
          tags.tags,
          fromPairs(
            tags.tags.unknown.map((tag) => [tag.tag, tag.value]),
          ),
        ),
        'unknown',
      );
    }

    return tags.tags;
  }

  static getType(tags) {
    const types = Object.values(FileType);

    const foundTypes = intersection(types, keys(tags));

    if (foundTypes.length > 1) {
      throw new Error(`File contains more than one handler type ${foundTypes.join(', ')}`);
    }

    // Makes it work with enums
    switch (foundTypes.shift()) {
      case 'rpc':
        return FileType.RPC;
      case 'rest':
        return FileType.REST;
      case 'schedule':
        return FileType.Schedule;
      case 'queue':
        return FileType.Queue;
      case 'method':
        return FileType.Method;
      case 'generic':
        return FileType.Generic;
      default:
        return FileType.Unknown;
    }
  }

  static getTemplate(name) {
    let final = name;

    if (final === 'schedule') {
      final = 'generic';
    }

    const template = readFileSync(
      join(
        __dirname,
        'templates',
        `${final}.js.template`,
      ),
    )
      .toString();

    return compileTemplate(template);
  }

  static factory(path, plugin) {
    return new File(path, plugin);
  }

  constructor(path, plugin) {
    this.path = path;
    this.plugin = plugin;
    this.tags = File.getTags(path);
    this.type = File.getType(this.tags);
  }

  getPath() {
    return this.path;
  }

  getTags() {
    return this.tags;
  }

  getType() {
    return this.type;
  }

  getHandler() {
    return Handler.factory(this, this.plugin);
  }

  isHttp() {
    return [
      FileType.RPC,
      FileType.REST,
    ].includes(this.getType());
  }

  getOptions() {
    const tags = this.getTags();

    const options = {
      requireAuth: get(tags, 'auth') !== 'false',
      name: this.plugin.getSlsValue('service.name'),
      context: this.plugin.getCustomValue(ConfigKey.Context),
      ...(
        this.isHttp()
          ? ({
            preMiddleware: this.plugin.getCustomValue(ConfigKey.HttpPreMiddleware, []),
            postMiddleware: this.plugin.getCustomValue(ConfigKey.HttpPostMiddleware, []),
          })
          : {}
      ),
    };

    if (tags.params) {
      options.validation = fromPairs(
        tags.params.map((param) => (
          [param.name, param.type]
        )),
      );
    }

    return options;
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

  shouldRegister() {
    return this.getType() !== FileType.Unknown
      && this.getType() !== FileType.Method
      && this.getType() !== FileType.Generic;
  }

  write() {
    const tmpl = File.getTemplate(this.type);

    const sourcePath = relative(
      resolve(dirname(this.getPath())),
      resolve(this.getPath()),
    )
      .replace(/\.ts|\.js/, '');

    const replacements = {
      sourcePath,
      options: JSON.stringify(this.getOptions()),
    };

    return writeFileSync(
      this.getOutputPath(),
      tmpl(replacements),
    );
  }
}
