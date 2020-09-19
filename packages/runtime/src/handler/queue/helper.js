export default class Helper {
  static factory(sqs, record) {
    return new Helper(sqs, record);
  }

  constructor(sqs, record) {
    this.sqs = sqs;
    this.record = record;
  }

  async getUrl() {
    const response = await this.sqs.getQueueUrl({
      QueueName: this.record.eventSourceARN.split(':').pop(),
    })
      .promise();

    return response.QueueUrl;
  }

  async delete() {
    const url = await this.getUrl();

    return this.sqs.deleteMessage({
      QueueUrl: url,
      ReceiptHandle: this.record.receiptHandle,
    })
      .promise();
  }
}
