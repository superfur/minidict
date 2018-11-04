'use strict';

const ora = require('ora');
const spinner = ora('查询中...');

const start = () => {
  spinner.start();
};

const success = (message = '') => {
  spinner.succeed(message);
};

const fail = () => {
  spinner.fail();
};

module.exports = {
  start,
  success,
  fail
};
