require("dotenv").config();
const env = process.env;

const development = {
  username: env.MYSQL_USERNAME,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  host: env.MYSQL_HOST,
  dialect: "mysql",
};

const test = {
  username: env.MYSQL_USERNAME,
  password: null,
  database: "database_test",
  host: env.MYSQL_HOST2,
  dialect: "mysql",
};

const production = {
  username: env.MYSQL_USERNAME,
  password: null,
  database: "database_production",
  host: env.MYSQL_HOST2,
  dialect: "mysql",
};

module.exports = { development, test, production };
