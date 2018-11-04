#!/usr/bin/env node

'use strict';

const program = require('commander');
const pkg = require('../package.json');
const { search } = require('../index');

const inputs = process.argv.slice(2);

program
  .usage('<words...>')
  .description('一个简单的命令行字典工具')
  .option('-y, --youdao', '使用有道查询')
  .version(pkg.version)
  .action((...args) => {
    const words = args.slice(0, -1);
    search(words);
  });

program
  .command('youdao')
  .alias('y')
  .description('使用有道字典查询')
  .action((...args) => {
    const words = args.slice(0, -1);
    search(words, 'youdao');
  });

program.parse(process.argv);
