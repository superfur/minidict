# minidict

一个简单易用的命令行词典工具（CLI），支持中英互译，聚合多词典源，提供音标与高质量例句展示。适合日常查词、英语学习与开发集成。

## 特性

- 支持中英互译
  - 单词翻译：详细释义、英/美音标、网络释义
  - 短语/句子：智能识别中英文，使用官方接口返回高质量译文
- 多词典源聚合
  - 有道词典：权威释义、网络释义与多选择器解析回退
  - 必应词典：高质量双语例句、健壮解析策略
  - Google 翻译：快速翻译接口（国内网络环境可能超时，可配置超时）
- 智能与可配置
  - 自动判断"单词 vs 短语/句子"，走最优接口
  - 结果过滤与去重，噪声更少
  - 可配置是否展示音标、例句与例句数量
  - 可配置请求超时时间（默认 3000ms）
- 友好的 CLI 输出
  - 彩色输出、清晰分组
  - 插件来源标识，便于对比
  - 并行查询，渐进式输出，响应更快
  - 失败插件友好提示，不影响其他结果

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
  "plugins": ["bing", "youdao", "google"],
  "showPhonetic": true,
  "showExamples": false,
  "maxExamples": 3,
  "timeout": 3000
}
```

- `plugins` (array): 启用的词典插件列表，可选：`bing`、`youdao`、`google`（默认三者都启用）
- `showPhonetic` (boolean): 是否显示音标（默认 `true`）
- `showExamples` (boolean): 是否显示例句（默认 `false`）
- `maxExamples` (number): 最多显示的例句数量（默认 `3`）
- `timeout` (number): 请求超时时间，单位毫秒（默认 `3000`，Google 翻译可能需要更长时间）

命令行参数会覆盖配置文件中的对应项：

```bash
# 指定插件
dict hello --plugin bing

# 使用多个插件
dict hello --plugin bing,youdao,google

# 强制显示音标
dict hello --phonetic

# 开启例句并调整数量
dict hello --examples --max-examples 5

# 设置超时时间（Google 可能需要更长时间）
dict hello --timeout 5000
```

## 命令行用法（CLI）

```bash
dict <word> [options]

Options:
  -p, --plugin <plugins>      指定插件（bing/youdao/google，可用逗号分隔）
      --phonetic              显示音标
      --examples              显示例句
      --max-examples <num>    最大例句数量
      --timeout <ms>          请求超时时间（毫秒，默认 3000）
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

# 使用所有插件，设置更长超时时间
dict hello --plugin bing,youdao,google --timeout 5000

# 从指定配置文件加载
dict hello --config /path/to/my-minidict.json
```

## 编程接口（Node.js）

minidict 同时提供可编程接口（ESM）：

```ts
import { translate } from 'minidict/dist/translate.js';
import type { Config } from 'minidict/dist/types.js';

const config: Config = {
  plugins: ['bing', 'youdao', 'google'],
  showPhonetic: true,
  showExamples: true,
  maxExamples: 3,
  timeout: 3000
};

// 支持回调，每个插件返回结果时立即调用
const results = await translate('hello world', config, (result) => {
  console.log(`${result.pluginName}:`, result.translations);
});
// results: Array<{
//   word: string;
//   phonetic?: string | { uk?: string; us?: string };
//   translations: string[];
//   examples?: Array<{ en: string; zh: string }>;
//   pluginName: 'Bing' | 'Youdao' | 'Google';
//   error?: string;  // 当插件失败时包含错误信息
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
- `minidict-google`: 使用 Google Translate API v2 进行翻译（支持超时配置）

## 错误处理与边界

- 解析失败：选择器更新或页面变化会触发解析失败；本项目提供多选择器回退与过滤逻辑
- 网络问题：接口请求失败会在控制台提示相应插件失败，不影响其他插件结果
- Google 超时：国内网络环境下 Google 翻译可能超时，可通过 `--timeout` 或配置文件调整超时时间
- 并行查询：所有插件同时发起请求，每个插件返回后立即显示结果，无需等待全部完成
- 例句数量：最终展示由 `config.maxExamples` 限制

## 故障排查（Troubleshooting）

- Node 版本过低：请升级至 Node.js >= 16
- 外网不可达：短语/句子翻译与页面抓取依赖网络；单测通过 mock，不依赖网络
- Google 翻译不可用：国内网络环境下 Google API 可能超时，可配置更长的超时时间（`--timeout 5000`）或禁用该插件
- 输出异常或无结果：尝试切换插件 `--plugin youdao` 或 `--plugin bing`

## 常见问题（FAQ）

- Q：如何只使用一个插件？
  - A：配置 `plugins: ["bing"]` 或在命令行加 `--plugin bing`
- Q：如何关闭音标？
  - A：配置 `showPhonetic: false` 或命令行不加 `--phonetic`
- Q：例句太多？
  - A：配置 `maxExamples` 或命令行 `--max-examples <num>`
- Q：Google 翻译总是超时怎么办？
  - A：可以增加超时时间（`--timeout 5000`）或禁用该插件（`--plugin bing,youdao`）
- Q：查询速度慢？
  - A：v2.4.0 已优化为并行查询，响应速度大幅提升

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

