import Joi from 'joi';

import {
  Parser,
} from 'acorn';

const joiFromString = (string) => {
  const ast = Parser.parse(
    string,
    {
      ecmaVersion: 2020,
    },
  );

  const parts = [];

  let current = ast.body[0];

  while (current) {
    if (current.type === 'ExpressionStatement') {
      if (current.expression.type === 'Identifier') {
        parts.unshift({
          fn: current.expression.name,
        });
      }

      current = current.expression;
    } else if (current.type === 'CallExpression') {
      const { callee } = current;
      const { object } = callee;

      if (callee.property.name === 'items') {
        parts.unshift({
          fn: callee.property.name,
          args: current.arguments.map((arg) => (
            joiFromString(string.slice(arg.start, arg.end))
          )),
        });
      } else {
        parts.unshift({
          fn: callee.property.name,
          args: current.arguments.map((arg) => (
            arg.type && arg.type === 'Identifier'
              ? joiFromString(string.slice(arg.start, arg.end))
              : arg.value
          )),
        });
      }

      if (object && object.type === 'Identifier') {
        parts.unshift({
          fn: object.name,
        });
      }

      current = object;
    } else if (current.type === 'MemberExpression') {
      const { property } = current;
      const { object } = current;

      parts.unshift({
        fn: property.name,
      });

      if (object && object.type === 'Identifier') {
        parts.unshift({
          fn: object.name,
        });
      }

      current = object;
    } else {
      current = false;
    }
  }

  // @ts-ignore
  return parts.reduce(
    (rule, part) => {
      if (!rule[part.fn]) {
        throw new Error(`"${string}" is not a valid Joi validator string because of "${part.fn}" - are you sure thats a valid Joi function?`);
      }

      return rule[part.fn](...(part.args || []));
    },
    Joi,
  );
};

export default joiFromString;
