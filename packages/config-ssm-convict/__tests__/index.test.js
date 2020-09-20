import { join } from 'path';

import {
  SSM as Client,
} from 'aws-sdk';

import chai, { expect } from 'chai';
import asPromised from 'chai-as-promised';

import sinon from 'sinon';

import ConfigConvict from '@ananke/config-convict';

import ConfigSSMConvict from '../src';

chai.use(asPromised);

describe('@ananke/config-ssm-convict', () => {
  describe('#fromFile()', () => {
    const manifest = {
      'common.database.host': 'localhost',
      short: 'key',
      'common.auth.secret': {
        doc: 'JWT auth secret',
        format: String,
        default: 'abcd1234',
        env: 'JWT_SECRET',
      },
    };

    context('when path exists and is plain JS', () => {
      it('should return an instance of ConfigSSMConvict', () => {
        const config = ConfigSSMConvict.fromFile(
          join(
            __dirname,
            'data/valid.js',
          ),
        );

        expect(config).to.be.instanceof(ConfigSSMConvict);
        expect(config.manifest).to.be.instanceof(ConfigConvict);
      });
    });

    context('when path exists and is transpiled JS', () => {
      it('should return an instance of ConfigSSMConvict', () => {
        const config = ConfigSSMConvict.fromFile(
          join(
            __dirname,
            'data/valid.transpiled.js',
          ),
        );

        expect(config).to.be.instanceof(ConfigSSMConvict);
        expect(config.manifest).to.be.instanceof(ConfigConvict);
      });
    });
  });

  describe('#factory()', () => {
    const manifest = {
      'common.database.host': 'localhost',
      short: 'key',
      'common.auth.secret': {
        doc: 'JWT auth secret',
        format: String,
        default: 'abcd1234',
        env: 'JWT_SECRET',
      },
    };

    context('when given a manifest', () => {
      it('should return an instance of ConfigSSMConvict', () => {
        const config = ConfigSSMConvict.factory(manifest);

        expect(config).to.be.instanceof(ConfigSSMConvict);
        expect(config.manifest).to.be.instanceof(ConfigConvict);
      });
    });
  });

  describe('fetch()', () => {
    const generateClient = () => {
      const callOne = {
        Parameters: [
          {
            Name: '/common/database/host',
            Value: 'localhost',
          },
        ],
        NextToken: 'ImANextToken!',
      };

      const callTwo = {
        Parameters: [
          {
            Name: '/common/auth/secret',
            Value: 'VerySecretKey',
          },
        ],
        NextToken: null,
      };

      const getParamsPromise = sinon.stub();
      getParamsPromise.onCall(0).resolves(callOne);
      getParamsPromise.onCall(1).resolves(callTwo);

      const getParams = sinon.fake.returns({
        promise: getParamsPromise,
      });

      const client = {
        getParametersByPath: getParams,
      };

      return {
        callOne,
        callTwo,

        getParamsPromise,
        getParams,

        client,
      };
    };

    context('when given a valid prefix and no options', () => {
      const manifest = {
        'common.database.host': 'localhost',
        short: 'key',
        'common.auth.secret': {
          doc: 'JWT auth secret',
          format: String,
          default: 'abcd1234',
          env: 'JWT_SECRET',
        },
      };

      const {
        client,
      } = generateClient();

      it('should return a convict configuration containing all values', async () => {
        const config = ConfigSSMConvict.factory(
          manifest,
          client,
        );

        const loaded = await config.fetch('/development/');

        expect(config).to.be.instanceof(ConfigSSMConvict);
        expect(config.manifest).to.be.instanceof(ConfigConvict);
        expect(loaded).has.property('get');
        expect(loaded.get).to.be.a('function');
        expect(loaded.get('common.database.host')).to.be.equal('localhost');
        expect(loaded.get('common.auth.secret')).to.be.equal('VerySecretKey');
      });
    });

    context('when given a valid prefix and some options', () => {
      const manifest = {
        'common.db.host': 'localhost',
        short: 'key',
      };

      const {
        client,
      } = generateClient();

      it('should return a convict configuration containing filtered and transformed values', async () => {
        const config = ConfigSSMConvict.factory(
          manifest,
          client,
        );

        const loaded = await config.fetch(
          '/development/',
          {
            only: /database/,
            transformKey: (key) => key.replace('database', 'db'),
          },
        );

        expect(config).to.be.instanceof(ConfigSSMConvict);
        expect(config.manifest).to.be.instanceof(ConfigConvict);
        expect(loaded).has.property('get');
        expect(loaded.get).to.be.a('function');
        expect(loaded.has('common.database.host')).to.be.equal(false);
        expect(loaded.has('common.auth.secret')).to.be.equal(false);
        expect(loaded.has('common.db.host')).to.be.equal(true);
        expect(loaded.get('common.db.host')).to.be.equal('localhost');
        expect(loaded.has('short')).to.be.equal(true);
        expect(loaded.get('short')).to.be.equal('key');
      });
    });
  });
});
