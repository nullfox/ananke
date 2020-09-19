import {
  fill,
  set,
  zipObject,
} from 'lodash';

import {
  ConfigKey,
  FileType,
} from '../constants';

const replacePsuedo = (tag, string, replacements = {}) => {
  const regex = new RegExp(`#{${tag}::([^}]+)}`, 'g');

  let match = regex.exec(string);
  const matches = [];

  while (match !== null) {
    matches.push(match[1]);
    match = regex.exec(string);
  }

  if (matches.length === 0) {
    return string;
  }

  let replaced = string;

  matches.forEach((key) => {
    replaced = replaced.replace(`#{${tag}::${key}}`, replacements[key]);
  });

  return replaced;
};

export default class Handler {
  static factory(file, plugin) {
    return new Handler(file, plugin);
  }

  constructor(file, plugin) {
    this.file = file;
    this.plugin = plugin;
  }

  getKey() {
    return this.file.getPath().split('/').pop().replace(/\.ts|\.js/, '')
      .replace(/\./g, '-');
  }

  getName() {
    return `${this.plugin.options.stage}-${this.plugin.sls.service.getServiceName()}-${this.getKey()}`;
  }

  getHandlerName() {
    return `${this.file.getOutputPath().replace(/\.ts|\.js/, '')}.handler`;
  }

  toServerless() {
    return {
      name: this.getName(),
      type: this.file.getType(),
      handler: this.getHandlerName(),
      events: [this.generateEvent()],
    };
  }

  generateEvent() {
    switch (this.file.getType()) {
      case FileType.Queue:
        return this.generateQueueEvent();
      case FileType.Schedule:
        return this.generateScheduleEvent();
      case FileType.RPC:
        return this.generateRpcEvent();
      case FileType.REST:
        return this.generateRestEvent();
      default:
        return {};
    }
  }

  generateQueueEvent() {
    const {
      queue,
    } = this.file.getTags();

    const replacements = {
      StageName: this.plugin.options.stage,
    };

    const replaced = replacePsuedo(
      this.plugin.getCustomValue(ConfigKey.PsuedoName, 'Ananke'),
      queue,
      replacements,
    );

    return {
      sqs: `arn:aws:sqs:#{AWS::Region}:#{AWS::AccountId}:${replaced}`,
    };
  }

  generateScheduleEvent() {
    return {
      schedule: this.file.getTags().schedule,
    };
  }

  generateRpcEvent() {
    return {
      http: {
        method: 'POST',
        path: this.file.getTags().rpc,
        cors: true,
      },
    };
  }

  generateRestEvent() {
    const rest = {
      method: this.file.getTags().rest.split(' ').shift(),
      path: this.file.getTags().rest.split(' ').pop(),
      cors: true,
    };

    const pathParams = (rest.path.match(/\{(\w+)\}/g) || [])
      .map((param) => param.replace(/[{}]+/g, ''));

    set(
      rest,
      'request.parameters.paths',
      zipObject(
        pathParams,
        fill(Array(pathParams.length), true),
      ),
    );

    return {
      http: rest,
    };
  }
}
