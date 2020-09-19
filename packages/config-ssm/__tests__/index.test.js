import { join } from 'path';

import {
  SSM as Client,
} from 'aws-sdk';

import chai, { expect } from 'chai';
import asPromised from 'chai-as-promised';

import sinon from 'sinon';

import ConfigSSM from '../src';

chai.use(asPromised);

describe('@ananke/config-ssm', () => {
  describe('#factory()', () => {
    context('when no SSM client is supplied', () => {
      it('should return an instance of ConfigSSM with a default client', () => {
        const config = ConfigSSM.factory();

        expect(config).to.be.instanceof(ConfigSSM);
        expect(config.ssm).to.be.instanceof(Client);
      });
    });

    context('when a SSM client is supplied', () => {
      const client = new Client({ region: 'us-east-1' });

      it('should return an instance of ConfigSSM with the supplied client', () => {
        const config = ConfigSSM.factory(client);

        expect(config).to.be.instanceof(ConfigSSM);
        expect(config.ssm).to.be.instanceof(Client);
        expect(config.ssm).to.be.equal(client);
      });
    });
  });

  describe('fetchRaw()', () => {
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

    context('when given a prefix and no options', () => {
      const {
        client,

        getParamsPromise,

        callOne,
        callTwo,
      } = generateClient();

      it('should return an object containing all configuration values', async () => {
        const config = ConfigSSM.factory(client);

        const loaded = await config.fetchRaw('/common/');

        expect(getParamsPromise.calledTwice).to.be.equal(true);
        expect(loaded).to.have.property('database.host');
        expect(loaded['database.host']).to.be.equal(callOne.Parameters[0].Value);
        expect(loaded).to.have.property('auth.secret');
        expect(loaded['auth.secret']).to.be.equal(callTwo.Parameters[0].Value);
      });
    });

    context('when given a prefix and invalid only supplied', () => {
      const {
        client,
      } = generateClient();

      it('should throw a RangeError', async () => {
        const config = ConfigSSM.factory(client);

        expect(
          config.fetchRaw(
            '/common/',
            {
              only: 'hi!',
            },
          ),
        ).to.eventually.rejectedWith(RangeError);
      });
    });

    context('when given a prefix and only supplied', () => {
      const {
        client,

        getParamsPromise,

        callOne,
      } = generateClient();

      it('should return an object containing filtered values', async () => {
        const config = ConfigSSM.factory(client);

        const loaded = await config.fetchRaw(
          '/common/',
          {
            only: /database/,
          },
        );

        expect(getParamsPromise.calledTwice).to.be.equal(true);
        expect(loaded).to.have.property('database.host');
        expect(loaded['database.host']).to.be.equal(callOne.Parameters[0].Value);
        expect(loaded).to.not.have.property('auth.secret');
      });
    });

    context('when given a prefix and invalid except supplied', () => {
      const {
        client,
      } = generateClient();

      it('should throw a RangeError', async () => {
        const config = ConfigSSM.factory(client);

        expect(
          config.fetchRaw(
            '/common/',
            {
              except: 'hi!',
            },
          ),
        ).to.eventually.rejectedWith(RangeError);
      });
    });

    context('when given a prefix and except supplied', () => {
      const {
        client,

        getParamsPromise,

        callTwo,
      } = generateClient();

      it('should return an object containing filtered values', async () => {
        const config = ConfigSSM.factory(client);

        const loaded = await config.fetchRaw(
          '/common/',
          {
            except: /database/,
          },
        );

        expect(getParamsPromise.calledTwice).to.be.equal(true);
        expect(loaded).to.not.have.property('database.host');
        expect(loaded).to.have.property('auth.secret');
        expect(loaded['auth.secret']).to.be.equal(callTwo.Parameters[0].Value);
      });
    });

    context('when given a prefix and invalid sortKey supplied', () => {
      const {
        client,
      } = generateClient();

      it('should throw a RangeError', async () => {
        const config = ConfigSSM.factory(client);

        expect(
          config.fetchRaw(
            '/common/',
            {
              sortKey: 'hi!',
            },
          ),
        ).to.eventually.rejectedWith(RangeError);
      });
    });

    context('when given a prefix and sortKey supplied', () => {
      const {
        client,

        getParamsPromise,
      } = generateClient();

      it('should return an object containing sorted values', async () => {
        const config = ConfigSSM.factory(client);

        const loaded = await config.fetchRaw(
          '/common/',
          {
            sortKey: (key) => key.split('').reverse().join('').slice(2),
          },
        );

        expect(getParamsPromise.calledTwice).to.be.equal(true);

        const keys = Object.keys(loaded);

        expect(keys[0]).to.be.equal('database.host');
        expect(keys[1]).to.be.equal('auth.secret');
      });
    });

    context('when given a prefix and invalid transformKey supplied', () => {
      const {
        client,
      } = generateClient();

      it('should throw a RangeError', async () => {
        const config = ConfigSSM.factory(client);

        expect(
          config.fetchRaw(
            '/common/',
            {
              transformKey: 'hi!',
            },
          ),
        ).to.eventually.rejectedWith(RangeError);
      });
    });

    context('when given a prefix and transformKey supplied', () => {
      const {
        client,

        getParamsPromise,
      } = generateClient();

      it('should return an object containing transformed keys', async () => {
        const config = ConfigSSM.factory(client);

        const loaded = await config.fetchRaw(
          '/common/',
          {
            transformKey: (key) => {
              if (key.includes('database')) {
                return key.replace('database', 'db');
              }

              return key;
            },
          },
        );

        expect(getParamsPromise.calledTwice).to.be.equal(true);

        const keys = Object.keys(loaded);

        expect(keys[0]).to.be.equal('auth.secret');
        expect(keys[1]).to.be.equal('db.host');
      });
    });
  });
});
