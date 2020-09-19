import {
  isString,
} from 'lodash';

export default class Responder {
  constructor(body, headers = {}, statusCode = 200) {
    this.body = body;
    this.headers = headers;
    this.statusCode = statusCode;
  }

  getBody() {
    return this.body;
  }

  toGateway() {
    return {
      statusCode: this.statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        ...(this.headers || {}),
      },
      body: isString(this.body) ? this.body : JSON.stringify(this.body),
    };
  }
}
