# minidict

一个简单易用的命令行词典工具（CLI），支持中英互译，聚合多词典源，提供音标与高质量例句展示。适合日常查词、英语学习与开发集成。

## 特性

- 支持中英互译
  - 单词翻译：详细释义、英/美音标、网络释义
  - 短语/句子：智能识别中英文，使用官方接口返回高质量译文
- 多词典源聚合
  - 有道词典：权威释义、网络释义与多选择器解析回退
  - 必应词典：高质量双语例句、健壮解析策略
  - Google 翻译：网页版免 key 接口，自动检测源语言（国内网络可能需配置代理）
- 智能与可配置
  - 自动判断"单词 vs 短语/句子"，走最优接口
  - 结果过滤与去重，噪声更少
  - 可配置是否展示音标、例句与例句数量
  - 可配置请求超时时间（默认 10000ms）
  - 结果缓存（默认开启，7 天有效期），重复查询近乎瞬时返回；`--no-cache` 可临时绕过
  - 支持外部插件（`externalPlugins`），无需改动核心即可扩展词典源
- 友好的 CLI 输出
  - 彩色卡片输出、清晰分组
  - 插件来源标识，便于对比
  - 并行查询、真正的流式输出：哪个插件先返回就先展示，快插件不被慢插件阻塞
  - 失败插件友好提示，不影响其他结果

## 安装

```bash
bun add -g minidict
# 或
npm i -g minidict
```

环境要求：Node.js >= 16（使用 ESM 与 node-fetch@3）。开发使用 [Bun](https://bun.sh) 作为包管理与脚本运行器。

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
  "timeout": 10000,
  "cache": { "enabled": true, "ttl": 604800000 },
  "externalPlugins": []
}
```

- `plugins` (array): 启用的词典插件列表，可选：`bing`、`youdao`、`google`（默认三者都启用）
- `showPhonetic` (boolean): 是否显示音标（默认 `true`）
- `showExamples` (boolean): 是否显示例句（默认 `false`）
- `maxExamples` (number): 最多显示的例句数量（默认 `3`）
- `timeout` (number): 请求超时时间，单位毫秒（默认 `10000`，Google 翻译可能需要更长时间）
- `cache` (object): 查询结果缓存。`enabled` 是否启用（默认 `true`），`ttl` 有效期毫秒（默认 7 天 `604800000`）。缓存存于 `~/.minidict/cache`，可用环境变量 `MINIDICT_CACHE_DIR` 覆盖位置
- `externalPlugins` (array): 额外的外部插件模块（npm 包名或绝对路径），其默认导出需实现 `DictionaryPlugin` 接口，按需动态加载；加载失败会被安全跳过

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
      --timeout <ms>          请求超时时间（毫秒，默认 10000）
      --config <path>         指定配置文件路径（默认 ~/.minidict.json）
      --no-cache              本次查询不使用缓存
      --clear-cache           清空查询缓存后退出
  -u, --update                检查并升级到最新版本后退出
      --no-update-check       本次查询不检查新版本
  -h, --help                  显示帮助
  -v, --version               显示版本
```

### 自动更新

- 每次查询结束后，minidict 会在后台静默检查 npm 上是否有新版本（默认开启，**每 24 小时最多检查一次**，结果缓存在 `~/.minidict/update-check.json`）。有新版本时会在结尾给出一行提示。
- `dict -u`（或 `dict --update`）会检查最新版本，并**自动识别你的全局安装来源（npm/pnpm/yarn/bun）执行对应的升级命令**。
  - 若新版本要求的 Node 版本高于当前，或所需包管理器命令缺失，会明确提示问题所在，而不会静默失败。
- 关闭自动检查的三种方式（任一即可）：
  - 单次：加 `--no-update-check`
  - 环境变量：设置 `MINIDICT_NO_UPDATE_CHECK=1`（CI 环境会自动跳过）
  - 永久：在 `~/.minidict.json` 中设置 `"autoUpdate": { "enabled": false }`

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
import { translate, availablePlugins } from 'minidict';
import type { Config } from 'minidict';

const config: Config = {
  plugins: ['bing', 'youdao', 'google'],
  showPhonetic: true,
  showExamples: true,
  maxExamples: 3,
  timeout: 10000,
  cache: { enabled: true, ttl: 604800000 }
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
- `minidict-bing`: 解析 `cn.bing.com/dict` 页面（需带 `mkt=zh-CN`）并支持短语接口 `ttranslatev3`
- `minidict-youdao`: 解析 `dict.youdao.com` 页面并支持 JSON 接口
- `minidict-google`: 使用 Google 翻译网页版的免 key 接口（`translate_a/single`，无需 API 密钥），源语言自动检测

### 开发外部插件

无需改动核心代码即可扩展词典源。编写一个模块，默认导出一个实现 `DictionaryPlugin` 的对象：

```js
// minidict-myplugin.mjs
export default {
  async translate(word) {
    return {
      word,
      translations: [`示例：${word}`],
      examples: [],
      pluginName: 'MyPlugin'
    };
  },
  setProxy(proxy) {},      // 可选：接收代理配置
  setTimeout(ms) {}        // 可选：接收超时（毫秒）
};
```

然后在 `~/.minidict.json` 中声明并启用（名称由模块名推导：`minidict-myplugin` → `myplugin`）：

```json
{
  "plugins": ["youdao", "myplugin"],
  "externalPlugins": ["/绝对路径/minidict-myplugin.mjs"]
}
```

加载失败的外部插件会被安全跳过，引用时以「未知插件」提示，不影响其它来源。

## 错误处理与边界

- 解析失败：选择器更新或页面变化会触发解析失败；本项目提供多选择器回退与过滤逻辑
- 网络问题：接口请求失败会在控制台提示相应插件失败，不影响其他插件结果
- Google 网络可达性：国内网络环境下 `translate.googleapis.com` 可能不可达，可配置代理（`HTTP_PROXY`/`HTTPS_PROXY` 或配置文件中的 `proxy`）；无需 API 密钥
- 并行查询：所有插件同时发起请求，每个插件返回后立即显示结果，无需等待全部完成
- 例句数量：最终展示由 `config.maxExamples` 限制

## 故障排查（Troubleshooting）

- Node 版本过低：请升级至 Node.js >= 16
- 外网不可达：短语/句子翻译与页面抓取依赖网络；单测通过 mock，不依赖网络
- Google 翻译不可用：使用的是免 key 网页接口；若 `translate.googleapis.com` 在你的网络下被屏蔽/不可达，请配置代理，或临时禁用该插件（`--plugin bing,youdao`）
- 输出异常或无结果：尝试切换插件 `--plugin youdao` 或 `--plugin bing`

## 常见问题（FAQ）

- Q：如何只使用一个插件？
  - A：配置 `plugins: ["bing"]` 或在命令行加 `--plugin bing`
- Q：如何关闭音标？
  - A：配置 `showPhonetic: false` 或命令行不加 `--phonetic`
- Q：例句太多？
  - A：配置 `maxExamples` 或命令行 `--max-examples <num>`
- Q：Google 翻译不可用/超时怎么办？
  - A：免 key 接口本身不需密钥；多为网络不可达，配置代理即可，或禁用该插件（`--plugin bing,youdao`）
- Q：查询速度慢？
  - A：v2.4.0 已优化为并行查询，响应速度大幅提升

## 开发与测试

```bash
# 安装依赖
bun install

# 开发编译（watch 模式）
bun run dev

# 运行测试（注意是 bun run test，而非 bun test —— 后者会启用 bun 自带的测试运行器而非 jest）
bun run test

# 构建
bun run build

# 代码检查
bun run lint

# 代码格式化（Prettier）
bun run format          # 写入
bun run format:check    # 仅检查
```

> 提交时会通过 husky + lint-staged 自动对改动的 `.ts` 运行 `eslint --fix` 与 `prettier --write`。
> CI（GitHub Actions）在 push / PR 到 `main` 时使用 Bun 运行 `lint → test → build`。

## 发布与版本

- 版本规范：遵循语义化版本（SemVer）
- 发布前自动构建：`prepublishOnly` 会触发 `bun run build`
- 建议使用 `npm pack --dry-run` 确认发布包内容

### 通过 tag 自动发布到 npm

发布由 `.github/workflows/release.yml` 在 push `v*` tag 时自动完成（lint → test → build → 校验 tag 与版本一致 → `npm publish`）。

一次性准备：在 GitHub 仓库 `Settings → Secrets and variables → Actions` 添加 `NPM_TOKEN`（npm 上生成的 Automation token）。

> ⚠️ **当前 `NPM_TOKEN` 有效期至 2026-09-21**，到期后发布会失败，需在 npm 重新生成 token 并更新该 Secret。

发布某个版本：

```bash
# 1. 确认 package.json 的 version 已更新（例如 2.6.0）并合入 main
# 2. 打 tag 并推送，即触发发布
git tag v2.6.0
git push origin v2.6.0
```

## 许可证

MIT

