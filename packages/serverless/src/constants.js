const ConfigKey = Object.freeze({
  Prefix: 'ananke',

  PsuedoName: 'ananke.psuedoName',

  FunctionSource: 'ananke.function.source',
  Context: 'ananke.function.context',

  HttpPreMiddleware: 'ananke.http.middleware.pre',
  HttpPostMiddleware: 'ananke.http.middleware.post',

  Rpc: 'ananke.rpc',
  RpcPath: 'ananke.rpc.path',
  RpcMethodSource: 'ananke.rpc.methods',
});

const FileType = Object.freeze({
  Unknown: 'unknown',
  RPC: 'rpc',
  REST: 'rest',
  Schedule: 'schedule',
  Queue: 'queue',
  Method: 'method',
  Generic: 'generic',
});

export {
  ConfigKey,
  FileType,
};
