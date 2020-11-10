import * as ora from 'ora';
const spinner = ora('查询中...');

export function start() {
  spinner.start();
};

export function success(message: string = '') {
  spinner.succeed(message);
};

export function fail() {
  spinner.fail();
};
