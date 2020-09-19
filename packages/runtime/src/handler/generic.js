import {
  internal,
} from '@hapi/boom';

import Base from './base';

export default class Generic extends Base {
  async exec(event) {
    let context;

    try {
      context = await this.resolveContext();
    } catch (error) {
      this.logger.error(error);

      throw internal(`Context could not be resolved: ${error.message}`);
    }

    return this.runner(
      event,
      context,
      this.options,
    );
  }
}
