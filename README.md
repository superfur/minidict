# minidict

一个简单易用的命令行词典工具（CLI），支持中英互译，聚合多词典源，提供音标与高质量例句展示。适合日常查词、英语学习与开发集成。

## 特性

- 支持中英互译
  - 单词翻译：详细释义、英/美音标、网络释义
  - 短语/句子：智能识别中英文，使用官方接口返回高质量译文
- 多词典源聚合
  - 有道词典：权威释义、网络释义与多选择器解析回退
  - 必应词典：高质量双语例句、健壮解析策略
- 智能与可配置
  - 自动判断“单词 vs 短语/句子”，走最优接口
  - 结果过滤与去重，噪声更少
  - 可配置是否展示音标、例句与例句数量
- 友好的 CLI 输出
  - 彩色输出、清晰分组
  - 插件来源标识，便于对比

## 安装

```bash
yarn global add minidict
# 或
npm i -g minidict
```

环境要求：Node.js >= 16（使用 ESM 与 node-fetch@3）

## 快速开始

```bash
# 查询英文单词
dict hello

# 查询英文短语（展示例句并限制为 5 条）
dict "I love you" --examples --max-examples 5

# 查询中文
dict "我爱你" --examples

# 查看帮助
dict -h

# 查看版本
dict -v
```

## 配置

配置文件位于 `~/.minidict.json`，示例：

```json
{
  "plugins": ["bing", "youdao"],
  "showPhonetic": true,
  "showExamples": false,
  "maxExamples": 3
}
```

- `plugins` (array): 启用的词典插件列表，可选：`bing`、`youdao`（默认两者都启用）
- `showPhonetic` (boolean): 是否显示音标（默认 `true`）
- `showExamples` (boolean): 是否显示例句（默认 `false`）
- `maxExamples` (number): 最多显示的例句数量（默认 `3`）

命令行参数会覆盖配置文件中的对应项：

```bash
# 指定插件
dict hello --plugin bing

# 强制显示音标
dict hello --phonetic

# 开启例句并调整数量
dict hello --examples --max-examples 5
```

## 命令行用法（CLI）

```bash
dict <word> [options]

Options:
  -p, --plugin <plugin>       指定插件（bing/youdao）
      --phonetic              显示音标
      --examples              显示例句
      --max-examples <num>    最大例句数量
      --config <path>         指定配置文件路径（默认 ~/.minidict.json）
  -h, --help                  显示帮助
  -v, --version               显示版本
```

## 使用示例

```bash
# 仅使用必应插件，并展示 2 条例句
dict "take off" --plugin bing --examples --max-examples 2

# 使用有道插件，显示音标
dict hello --plugin youdao --phonetic

# 从指定配置文件加载
dict hello --config /path/to/my-minidict.json
```

## 编程接口（Node.js）

minidict 同时提供可编程接口（ESM）：

```ts
import { translate } from 'minidict/dist/translate.js';
import type { Config } from 'minidict/dist/types.js';

const config: Config = {
  plugins: ['bing', 'youdao'],
  showPhonetic: true,
  showExamples: true,
  maxExamples: 3
};

const results = await translate('hello world', config);
// results: Array<{
//   word: string;
//   phonetic?: string | { uk?: string; us?: string };
//   translations: string[];
//   examples?: Array<{ en: string; zh: string }>;
//   pluginName: 'Bing' | 'Youdao';
// }>
```

## 插件架构

- 目录：`src/plugins/minidict-<name>/`
- 每个插件需实现：`translate(word): Promise<TranslationResult>`
- 典型流程：
  1. 判断输入（单词/短语/句子）
  2. 选择 API 或抓取 HTML
  3. `cheerio` 解析 + 多选择器回退
  4. 过滤与去重，返回 `TranslationResult`

### 当前内置插件
- `minidict-bing`: 解析 `cn.bing.com/dict` 页面并支持短语接口 `ttranslatev3`
- `minidict-youdao`: 解析 `dict.youdao.com` 页面并支持 JSON 接口

## 错误处理与边界

- 解析失败：选择器更新或页面变化会触发解析失败；本项目提供多选择器回退与过滤逻辑
- 网络问题：接口请求失败会在控制台提示相应插件失败，不影响其他插件结果
- 例句数量：最终展示由 `config.maxExamples` 限制

## 故障排查（Troubleshooting）

- Node 版本过低：请升级至 Node.js >= 16
- 外网不可达：短语/句子翻译与页面抓取依赖网络；单测通过 mock，不依赖网络
- 输出异常或无结果：尝试切换插件 `--plugin youdao` 或 `--plugin bing`

## 常见问题（FAQ）

- Q：如何只使用一个插件？
  - A：配置 `plugins: ["bing"]` 或在命令行加 `--plugin bing`
- Q：如何关闭音标？
  - A：配置 `showPhonetic: false` 或命令行不加 `--phonetic`
- Q：例句太多？
  - A：配置 `maxExamples` 或命令行 `--max-examples <num>`

## 开发与测试

```bash
# 安装依赖
yarn install

# 开发编译（watch 模式）
yarn dev

# 运行测试
yarn test

# 构建
yarn build

# 代码检查
yarn lint
```

## 发布与版本

- 版本规范：遵循语义化版本（SemVer）
- 发布前自动构建：`prepublishOnly` 会触发 `yarn build`
- 建议使用 `npm pack --dry-run` 确认发布包内容

## 许可证

MIT

