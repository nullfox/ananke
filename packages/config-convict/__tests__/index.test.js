import { join } from 'path';

import { expect } from 'chai';

import ConfigConvict from '../src';

describe('@ananke/config-convict', () => {
  describe('#fromFile()', () => {
    const expectedManifest = {
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
      it('should return an instance of ConfigConvict', () => {
        const config = ConfigConvict.fromFile(
          join(
            __dirname,
            'data/valid.js',
          ),
        );

        expect(config).to.be.instanceof(ConfigConvict);
        expect(config.manifest).to.be.eql(expectedManifest);
      });
    });

    context('when path exists and is transpiled JS', () => {
      it('should return an instance of ConfigConvict', () => {
        const config = ConfigConvict.fromFile(
          join(
            __dirname,
            'data/valid.transpiled.js',
          ),
        );

        expect(config).to.be.instanceof(ConfigConvict);
        expect(config.manifest).to.be.eql(expectedManifest);
      });
    });
  });

  describe('#factory()', () => {
    const expectedManifest = {
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
      it('should return an instance of ConfigConvict', () => {
        const config = ConfigConvict.factory(expectedManifest);

        expect(config).to.be.instanceof(ConfigConvict);
        expect(config.manifest).to.be.eql(expectedManifest);
      });
    });
  });

  describe('load()', () => {
    const config = ConfigConvict.fromFile(
      join(
        __dirname,
        'data/valid.js',
      ),
    );

    context('when given no data', () => {
      it('should return a convict configuration containing default values from the manifest', () => {
        const loaded = config.load({});

        expect(loaded.get).to.be.a('function');
        expect(loaded.get('common.database.host')).to.be.equal('localhost');
        expect(loaded.get('short')).to.be.equal('key');
        expect(loaded.get('common.auth.secret')).to.be.equal('abcd1234');
      });
    });

    context('when given data that partially cover default values', () => {
      it('should return a convict configuration containing default values mixed with supplied values', () => {
        const data = {
          common: {
            auth: {
              secret: 'ThisIsNotSoSecret',
            },
            database: {
              host: '127.0.0.1',
            },
          },
        };

        const loaded = config.load(data);

        expect(loaded.get).to.be.a('function');
        expect(loaded.get('common.database.host')).to.be.equal(data.common.database.host);
        expect(loaded.get('short')).to.be.equal('key');
        expect(loaded.get('common.auth.secret')).to.be.equal(data.common.auth.secret);
      });
    });
  });
});
