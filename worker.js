'use strict';
const Dht = require('./dht');
const config = require('./config');
(new Dht(config.port, config.address));