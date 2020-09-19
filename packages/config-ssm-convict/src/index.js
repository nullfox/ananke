import SSM, {
  Client,
} from '@ananke/config-ssm';

import AnankeConfig from '@ananke/config-convict';

export default class ConfigSSMConvict {
  static fromFile(path, ssmOrUndefined) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const file = require(path);

    return this.factory(file.default ? file.default : file, ssmOrUndefined);
  }

  static factory(manifest, ssmOrUndefined) {
    return new ConfigSSMConvict(manifest, ssmOrUndefined);
  }

  constructor(manifest, ssmOrUndefined) {
    this.manifest = AnankeConfig.factory(manifest);
    this.ssm = SSM.factory(ssmOrUndefined);
  }

  async fetch(prefix, options = {}) {
    const secrets = await this.ssm.fetch(prefix, options);

    return this.manifest.load(secrets);
  }
}

export {
  Client,
};
