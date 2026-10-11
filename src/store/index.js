'use strict';
const config = require('../config');

function createStore() {
  if (config.databaseUrl) {
    const PostgresStore = require('./postgres');
    return new PostgresStore(config.databaseUrl);
  }
  const LocalStore = require('./local');
  return new LocalStore(config.dataDir);
}

module.exports = { createStore };
