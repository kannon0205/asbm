{
  "development": {
    "username": "root",
    "password": "ZgYddWr3FWP5",
    "database": "asb",
    "host": "localhost",
    "dialect": "mysql",
    "timezone": "+09:00",
    "operatorsAliases": 0,
    "logging": false
  },
  "test": {
    "username": process.env.USER,
    "password": process.env.PASSWORD,
    "database": process.env.Database,
    "host": process.env.HOST,
    "dialect": "postgres",
    "operatorsAliases": false,
    "timezone": "+09:00"
  },
  "production": {
    "username": process.env.USER,
    "password": process.env.PASSWORD,
    "database": process.env.Database,
    "host": process.env.HOST,
    "dialect": "postgres",
    "operatorsAliases": false,
    "timezone": "+09:00"
  }
}
