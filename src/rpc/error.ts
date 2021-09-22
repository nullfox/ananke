export default class RPCError extends Error {
  static CODE: Record<string, number> = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    INVALID_METHOD: -32601,
    INVALID_PARAMS: -32602,
  };

  static MESSAGE: Record<string, string> = {
    PARSE_ERROR: 'Body must contain well formed JSON',
    INVALID_REQUEST: 'Body must contain valid JSON-RPC payload',
    INVALID_METHOD: 'Method does not exist',
    INVALID_PARAMS: 'One or more parameters were invalid',
  };

  id: string;
  code: number;

  constructor(id: string, code: number, m?: string) {
    if (m) {
      super(m);
    } else {
      const key = Object.keys(RPCError.CODE).find(key => RPCError.CODE[key] === code);

      if (!key) {
        throw new Error(`Could not resolve message for code ${code}`);
      }

      super(RPCError.MESSAGE[key]);
    }

    this.id = id;
    this.code = code;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, RPCError.prototype);
  }
}
