import {
  readdirSync,
} from 'fs';

import {
  join,
} from 'path';

import {
  DataTypes,
  Model,
  Op,
  Sequelize,
} from 'sequelize';

import {
  chain,
  capitalize,
  get,
  has,
  mapValues,
} from 'lodash';

export default class ConnectionManager {
  static createConnection(
    options,
    additional,
  ) {
    return new Sequelize(
      options.database,
      options.username,
      options.password,
      {
        host: options.host,
        port: options.port || 3306,
        logging: console.log,
        define: {
          charset: 'utf8mb4',
          timestamps: true,
          underscored: true,
        },
        ...additional,
      },
    );
  }

  static factory(connection) {
    return new ConnectionManager(connection);
  }

  constructor(connection) {
    this.connection = connection;
  }

  setup(models = {}, modelConfig = {}) {
    return mapValues(
      models,
      (model, key) => {
        if (has(model, 'setup')) {
          model.setup(
            this.connection,
            get(modelConfig, key, {}),
          );
        }

        if (has(model, 'associate')) {
          model.associate(models);
        }

        // eslint-disable-next-line no-param-reassign
        model.models = models;

        return model;
      },
    );
  }

  load(path) {
    const models = chain(readdirSync(path))
      .filter((file) => file !== 'index.js')
      .map((file) => (
        [
          capitalize(file.split('.').shift()),
          // eslint-disable-next-line import/no-dynamic-require, global-require
          require(join(
            __dirname,
            file,
          )),
        ]
      ))
      .fromPairs()
      .value();

    return this.setup(models);
  }
}

export {
  DataTypes,
  Model,
  Op,
  Sequelize,
};
