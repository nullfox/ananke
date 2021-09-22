import * as Yup from 'yup';
import { glob } from 'glob';
import { Result, Schema, MethodLike } from '../interfaces';

export const maybeParse = (body: string | Schema | Schema[]): Schema[] => {
  if (typeof body === 'string') {
    const parsed = JSON.parse(body);

    if (Array.isArray(parsed)) {
      return parsed as Schema[];
    }

    return [parsed] as Schema[];
  } else if (Array.isArray(body)) {
    return body;
  } else {
    return [body];
  }
};

export const validateSchema = async (schema: Schema): Promise<Schema> => {
  const validated = await Yup.object()
    .shape({
      id: Yup.string().uuid().required(),
      jsonrpc: Yup.string().required(),
      method: Yup.string().required(),
      params: Yup.object(),
    })
    .validate(schema);

  return validated as Schema;
};

export const respond = (body: Record<string, any>): Result => {
  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };

  return {
    ...response,
    body: JSON.stringify(body),
  };
};

export const format = (id: string, errorOrResult: Error | unknown): Record<string, any> => {
  if (errorOrResult instanceof Error) {
    return {
      id,
      jsonrpc: '2.0',
      error: {
        code: (errorOrResult as Error & { code?: number }).code || 500,
        message: errorOrResult.message,
      },
    };
  }

  return {
    id,
    jsonrpc: '2.0',
    result: errorOrResult,
  };
};

export const loadMethodsFromPath = async (path: string): Promise<Record<string, MethodLike>> => {
  const nameFromPath = (filePath: string) => filePath.split('/').pop()!.replace('.js', '');

  const files: string[] = await new Promise((resolve) => {
    glob(path, (error, files) => {
      resolve(files);
    });
  });

  const filtered = files.filter(file => file.endsWith('.js'));

  if (filtered.length === 0) {
    return {};
  }

  const methods: Record<string, MethodLike> = {};

  filtered.forEach((file) => {
    const name = nameFromPath(file);
    // eslint-disable-next-line
    const mod = require(file);

    methods[name] = mod.default ? mod.default : mod;
  });

  return methods;
};
