import {
  SQS,
} from 'aws-sdk';

import {
  internal,
} from '@hapi/boom';

import Base from './base';

import Helper from './queue/helper';

export default class Queue extends Base {
  constructor(runner, options) {
    super(runner, options);

    this.sqs = new SQS();
  }

  async exec(event) {
    let context;

    try {
      context = await this.resolveContext();
    } catch (error) {
      this.logger.error(error);

      throw internal(`Context could not be resolved: ${error.message}`);
    }

    return Promise.all(
      event.Records.map(async (message) => {
        const data = JSON.parse(message.body);

        const params = await Queue.validateSchema(
          Queue.schemaFromStrings(this.options.validation),
          data,
        );

        return this.runner(
          params,
          context,
          Helper.factory(this.sqs, message),
          message,
          event,
        );
      }),
    );
  }
}
