export default class RESTError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);

    this.status = status;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, RESTError.prototype);
  }
}
