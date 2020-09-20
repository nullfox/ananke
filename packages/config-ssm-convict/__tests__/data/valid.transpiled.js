module.exports = {
  default: {
    'common.database.host': 'localhost',
    short: 'key',
    'common.auth.secret': {
      doc: 'JWT auth secret',
      format: String,
      default: 'abcd1234',
      env: 'JWT_SECRET',
    },
  },
};
