require('dotenv').config();

module.exports = {
  'production': {
    'username': process.env.USER,
    'password': process.env.PASSWORD,
    'database': process.env.Database,
    'host': process.env.HOST,
    'port': '5432',
    'dialect': 'postgres',
    'operatorsAliases': false,
  },
};
