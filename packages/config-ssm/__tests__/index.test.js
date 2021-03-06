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
    context('when given a prefix and no options', () => {
      const {
        client,

        getParamsPromise,

        callOne,
        callTwo,
      } = generateClient();

      it('should return an object containing all configuration values', async () => {
        const config = ConfigSSM.factory(client);

        const loaded = await config.fetchRaw('/development/');

        expect(getParamsPromise.calledTwice).to.be.equal(true);
        expect(loaded).to.have.property('common.database.host');
        expect(loaded['common.database.host']).to.be.equal(callOne.Parameters[0].Value);
        expect(loaded).to.have.property('common.auth.secret');
        expect(loaded['common.auth.secret']).to.be.equal(callTwo.Parameters[0].Value);
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
            '/development/',
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
          '/development/',
          {
            only: /database/,
          },
        );

        expect(getParamsPromise.calledTwice).to.be.equal(true);
        expect(loaded).to.have.property('common.database.host');
        expect(loaded['common.database.host']).to.be.equal(callOne.Parameters[0].Value);
        expect(loaded).to.not.have.property('common.auth.secret');
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
            '/development/',
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
          '/development/',
          {
            except: /database/,
          },
        );

        expect(getParamsPromise.calledTwice).to.be.equal(true);
        expect(loaded).to.not.have.property('common.database.host');
        expect(loaded).to.have.property('common.auth.secret');
        expect(loaded['common.auth.secret']).to.be.equal(callTwo.Parameters[0].Value);
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
            '/development/',
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
          '/development/',
          {
            sortKey: (key) => key.split('').reverse().join('').slice(2),
          },
        );

        expect(getParamsPromise.calledTwice).to.be.equal(true);

        const keys = Object.keys(loaded);

        expect(keys[0]).to.be.equal('common.database.host');
        expect(keys[1]).to.be.equal('common.auth.secret');
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
            '/development/',
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
          '/development/',
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

        expect(keys[0]).to.be.equal('common.auth.secret');
        expect(keys[1]).to.be.equal('common.db.host');
      });
    });
  });

  describe('fetch', () => {
    context('when given a prefix and no options', () => {
      it('should return a structured object', async () => {
        const {
          client,
        } = generateClient();

        const config = ConfigSSM.factory(client);

        const loaded = await config.fetch('/development/');

        expect(loaded).to.have.property('common');
        expect(loaded.common).to.have.property('database');
        expect(loaded.common.database).to.have.property('host');
        expect(loaded.common.database.host).to.be.equal('localhost');
        expect(loaded.common).to.have.property('auth');
        expect(loaded.common.auth).to.have.property('secret');
        expect(loaded.common.auth.secret).to.be.equal('VerySecretKey');
      });
    });

    context('when given a prefix and one or more options', () => {
      it('should return a structured object', async () => {
        const {
          client,
        } = generateClient();

        const config = ConfigSSM.factory(client);

        const loaded = await config.fetch('/development/', { only: /database/ });

        expect(loaded).to.have.property('common');
        expect(loaded.common).to.have.property('database');
        expect(loaded.common.database).to.have.property('host');
        expect(loaded.common.database.host).to.be.equal('localhost');
        expect(loaded.common).to.not.have.property('auth');
      });
    });
  });
});
