import ora from 'ora';

const spinner = ora('查询中...');

export function start() {
    spinner.start();
};

export function success(text: string) {
    spinner.succeed(text);
};

export function fail() {
    spinner.fail('查询失败');
};
