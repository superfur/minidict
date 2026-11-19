# minidict

[![npm version](https://img.shields.io/npm/v/minidict.svg)](https://www.npmjs.com/package/minidict)
[![CI](https://github.com/superfur/minidict/actions/workflows/ci.yml/badge.svg)](https://github.com/superfur/minidict/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/minidict.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/minidict.svg)](./LICENSE)

一个简单易用的命令行词典 / 翻译工具。一次查询并发聚合 **Bing、有道、Google** 三个来源，哪个先返回就先显示；也可以作为 Node.js 库使用。

**目录**：[安装](#安装) · [使用](#使用) · [配置](#配置) · [编程接口](#编程接口nodejs) · [外部插件](#外部插件) · [常见问题](#常见问题) · [从 2.x 升级](#从-2x-升级) · [开发](#开发)

```text
$ dict hello
╭──────────────────────────────────────────────────────────────────────╮
│ ▸ dict hello                                                         │
╰──────────────────────────────────────────────────────────────────────╯

╭ Youdao ──────────────────────────────────────────────────────────────╮
│ 英 [həˈləʊ]  美 [həˈloʊ]                                             │
│                                                                      │
│ int.  喂，你好（用于问候或打招呼）；喂，你好（打电话时的招呼语）     │
│ n.    招呼，问候                                                     │
│ 网络  您好；哈啰；喂                                                 │
╰──────────────────────────────────────────────────────────────────────╯
```

## 特性

- **中英互查**：单词给出音标、按词性归类的释义、网络释义和双语例句；短语与整句走机器翻译
- **多语言翻译**：`--from` / `--to` 指定任意语言方向（由 Google、Bing 提供）；日文、韩文、俄文输入可自动识别
- **多来源并发**：各来源同时请求、到达即显示，单个来源失败不影响其它来源
- **三种输出**：终端下是彩色卡片；管道 / 重定向时自动切换为纯文本；`--json` 输出结构化数据
- **适合脚本**：支持从标准输入读取查询；所有来源都失败时退出码为 1
- **结果缓存**：默认缓存 7 天，过期文件自动清理
- **代理支持**：HTTP / HTTPS / SOCKS 代理，识别 `HTTPS_PROXY`、`ALL_PROXY`、`HTTP_PROXY`、`NO_PROXY`
- **可扩展**：通过外部插件添加新的词典来源

## 安装

```bash
npm i -g minidict       # npm
pnpm add -g minidict    # pnpm
bun add -g minidict     # bun
```

安装后得到 `dict` 命令：

```bash
dict --version    # 确认安装成功
dict hello        # 开始查询
dict -u           # 以后升级到最新版本
```

不想安装也可以直接试用：`npx minidict hello`。

环境要求：Node.js >= 20.18.1。用 bun 安装时同样需要 Node.js，bun 只负责安装，`dict` 命令由 Node.js 运行。

## 使用

```bash
dict hello                        # 查英文单词
dict 苹果                         # 查中文词
dict I love you                   # 短语 / 句子（可以不加引号）
dict hello -e --max-examples 5    # 显示例句，最多 5 条
dict hello -p bing,youdao         # 只用指定来源
dict good morning -t ja           # 翻译成日文
dict bonjour -f fr -t en          # 指定源语言和目标语言
dict hello --json                 # JSON 输出
echo serendipity | dict           # 从管道读入
dict hello | grep 网络            # 管道下自动输出纯文本
```

### 命令行选项

```text
Usage: dict [options] [text...]

  -p, --plugin <plugins>       指定词典来源，逗号分隔（bing / youdao / google）
  -f, --from <lang>            源语言代码（默认自动检测），如 en / zh / ja
  -t, --to <lang>              目标语言代码（默认：中文 → en，其它 → zh）
      --phonetic               显示音标（默认）
      --no-phonetic            不显示音标
  -e, --examples               显示例句
      --no-examples            不显示例句（默认）
      --max-examples <number>  最大例句数量
      --timeout <ms>           请求超时时间（毫秒，默认 10000）
      --config <path>          配置文件路径（默认 ~/.minidict.json）
      --json                   以 JSON 输出（便于脚本处理）
      --plain                  以纯文本输出（无边框；管道/重定向时自动启用）
      --card                   以卡片输出（终端下的默认形式）
      --no-cache               本次查询不使用缓存
      --clear-cache            清空查询缓存后退出
      --list-plugins           列出可用的词典来源后退出
  -u, --update                 检查并升级到最新版本后退出
      --no-update-check        本次查询不检查新版本
  -v, --version                显示版本
  -h, --help                   显示帮助
```

### 语言

语言代码使用简短写法：`zh`（简体中文）、`zh-TW`（繁体中文）、`en`、`ja`、`ko`、`fr`、`de`、`es`、`ru` 等，也接受 `zh-CN`、`jp` 这类常见别名。

- 不指定时自动判断方向：输入是中文则译为英文，其它译为中文。
- 自动检测按文字系统进行（汉字、假名、谚文、西里尔字母）。拉丁字母一律当作英文，查法语、德语等请用 `--from` 指定。
- 有道与必应词典只收录中英词条。其它语言方向下，Bing 自动改用机器翻译，有道会提示不支持。

### 退出码

| 退出码 | 含义                                         |
| ------ | -------------------------------------------- |
| 0      | 至少一个来源返回了结果                       |
| 1      | 所有来源都失败，或发生错误（如配置文件非法） |

### JSON 输出

```jsonc
{
  "query": "hello",
  "from": "auto",
  "to": "zh",
  "elapsedMs": 812,
  "ok": true, // 是否至少一个来源成功
  "results": [
    {
      "word": "hello",
      "pluginName": "Youdao",
      "phonetic": { "uk": "həˈləʊ", "us": "həˈloʊ" },
      "translations": ["int. 喂，你好…", "网络您好"],
      "examples": [{ "en": "…", "zh": "…" }],
      "from": "auto",
      "to": "zh",
      "cached": false,
      "elapsedMs": 301
    },
    {
      "word": "hello",
      "pluginName": "Google",
      "translations": [],
      "examples": [],
      "error": "请求超时 (10000ms)",
      "errorCode": "TIMEOUT"
    }
  ]
}
```

`errorCode` 的取值：`TIMEOUT`、`NETWORK`、`HTTP`、`RATE_LIMIT`、`NO_RESULT`、`PARSE`、`UNSUPPORTED`、`UNKNOWN_PLUGIN`、`PLUGIN_LOAD`、`UNKNOWN`。

## 配置

配置文件默认位于 `~/.minidict.json`，也可以用 `--config <path>` 或环境变量 `MINIDICT_CONFIG` 指定。所有字段都可省略：

```json
{
  "plugins": ["bing", "youdao", "google"],
  "showPhonetic": true,
  "showExamples": false,
  "maxExamples": 3,
  "timeout": 10000,
  "from": "auto",
  "to": "auto",
  "proxy": "http://127.0.0.1:7890",
  "cache": { "enabled": true, "ttl": 604800000 },
  "autoUpdate": { "enabled": true, "checkInterval": 86400000 },
  "externalPlugins": []
}
```

| 字段              | 说明                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `plugins`         | 启用的来源及其顺序                                                               |
| `showPhonetic`    | 是否显示音标                                                                     |
| `showExamples`    | 是否显示例句                                                                     |
| `maxExamples`     | 每个来源最多显示的例句数，`0` 表示不限制                                         |
| `timeout`         | 单次请求超时（毫秒）                                                             |
| `from` / `to`     | 默认的源语言 / 目标语言，`auto` 表示自动                                         |
| `proxy`           | 代理地址字符串，或 `{ "protocol", "host", "port", "username", "password" }` 对象 |
| `cache`           | `enabled` 是否启用缓存；`ttl` 有效期（毫秒）                                     |
| `autoUpdate`      | `enabled` 是否检查新版本；`checkInterval` 检查间隔（毫秒）                       |
| `externalPlugins` | 外部插件模块（npm 包名或文件路径）                                               |

配置文件不存在时使用默认值；**文件存在但不是合法 JSON，或 `--config` 指定的文件读不到时会报错退出**。

### 代理

未在配置文件中设置 `proxy` 时，按 `HTTPS_PROXY` → `ALL_PROXY` → `HTTP_PROXY` 的顺序读取环境变量（大小写均可）。支持 `http`、`https`、`socks`、`socks4`、`socks4a`、`socks5`、`socks5h` 协议。`NO_PROXY` 中列出的域名不走代理。

### 环境变量

| 变量                       | 作用                                   |
| -------------------------- | -------------------------------------- |
| `MINIDICT_CONFIG`          | 配置文件路径                           |
| `MINIDICT_CACHE_DIR`       | 缓存目录（默认 `~/.minidict/cache`）   |
| `MINIDICT_STATE_DIR`       | 更新检查状态目录（默认 `~/.minidict`） |
| `MINIDICT_NO_UPDATE_CHECK` | 设置后不检查新版本                     |
| `NO_COLOR`                 | 设置后不输出颜色                       |

### 更新

- 终端下查询结束后会提示新版本（每 24 小时最多检查一次，与查询并发进行，不增加等待）。CI 环境、管道输出、`--json` 下不检查。
- `dict -u` 检查最新版本，并按全局安装来源（npm / pnpm / yarn / bun）执行对应的升级命令。
- 关闭检查：单次加 `--no-update-check`；永久关闭在配置中设置 `"autoUpdate": { "enabled": false }`，或设置环境变量 `MINIDICT_NO_UPDATE_CHECK=1`。

## 编程接口（Node.js）

minidict 是纯 ESM 包：

```ts
import { translate } from 'minidict';

const results = await translate('hello');

for (const result of results) {
  if (result.error) {
    console.error(`${result.pluginName} 失败：${result.error} (${result.errorCode})`);
  } else {
    console.log(result.pluginName, result.translations);
  }
}
```

`translate(text, options?, onResult?)`：

- `options` 与配置文件字段相同，全部可选。
- `onResult` 在每个来源完成时立即调用（按完成先后），可用于流式展示。
- 返回值按 `plugins` 的顺序排列。单个来源失败不会让 Promise reject，而是返回带 `error` / `errorCode` 的结果。

```ts
import { translate, loadConfig, formatResult } from 'minidict';

// 读取 ~/.minidict.json（含环境变量中的代理），并覆盖部分选项
const config = await loadConfig();

await translate('good morning', { ...config, plugins: ['google'], to: 'ja' }, result => {
  console.log(formatResult(result));
});
```

注意：`translate()` 本身不读取配置文件和环境变量，需要代理时请传入 `proxy`，或像上面那样使用 `loadConfig()`。

其它导出：`availablePlugins`、`resolveConfig`、`defaultConfig`、`detectLanguage`、`resolveLanguages`、`clearCache`、`MinidictError`、`formatPlainResult`、`formatJson`、`fetchJson`、`fetchText`，以及全部类型定义。

## 外部插件

编写一个 ES 模块，默认导出一个带 `translate` 方法的对象：

```js
// minidict-myplugin.mjs
export default {
  displayName: 'MyPlugin',

  // context: { from, to, timeout, proxy }
  async translate(text, context) {
    return {
      word: text,
      translations: [`n. 示例释义（${context.from} → ${context.to}）`],
      examples: [],
      pluginName: 'MyPlugin'
    };
  }
};
```

在配置文件中声明并启用。插件名由模块名推导：`minidict-myplugin` → `myplugin`。

```json
{
  "plugins": ["youdao", "myplugin"],
  "externalPlugins": ["/绝对路径/minidict-myplugin.mjs"]
}
```

约定：

- `translations` 中以词性缩写开头的行（如 `n. 苹果`）按词性对齐显示；以 `网络` 开头的行作为网络释义合并显示；其它按普通文本显示。
- 返回空的 `translations` 会被视为「无结果」。抛出 `MinidictError` 可以指定错误码。
- 插件应是无状态的，运行参数都从 `context` 读取。可以使用导出的 `fetchJson` / `fetchText`，它们已处理代理、超时和重试。
- 加载失败的外部插件不影响其它来源，被引用时会显示加载失败的原因。
- 2.x 的 `setProxy()` / `setTimeout()` 仍会被调用，旧插件无需修改即可继续工作。

## 常见问题

- **Google 不可用或很慢？** Google 在中国大陆无法直接访问，需要代理：临时使用可以 `HTTPS_PROXY=http://127.0.0.1:7890 dict hello`，长期使用在配置文件里设置 `"proxy"`（见[代理](#代理)）。没有代理时 Bing 和有道仍然可用，可以用 `-p bing,youdao` 跳过 Google，省去等它超时。
- **Google 只有译文，没有音标和词性？** 主接口被限流时会自动改用备用接口，备用接口只返回译文。
- **安装或升级时报 404（`minidict-x.y.z.tgz`）？** 新版本刚发布的几分钟内，包文件可能还没同步到 CDN，稍后重试即可。
- **提示 `dict: command not found`？** 全局安装目录不在 `PATH` 里。npm 用 `npm prefix -g` 查看安装位置，bun 默认是 `~/.bun/bin`，把对应的 `bin` 目录加入 `PATH`。
- **有道提示未收录？** 有道的免费接口是词典而不是机器翻译，整句通常查不到，请参考 Bing / Google 的结果。
- **只想用一个来源？** `dict hello -p bing`，或在配置中设置 `"plugins": ["bing"]`。
- **查到的是旧结果？** 加 `--no-cache` 跳过缓存，或用 `--clear-cache` 清空。
- **管道里想要卡片样式？** 加 `--card`。

## 从 2.x 升级

- 需要 Node.js >= 20.18.1。
- 输出到管道或文件时默认是纯文本，不再带边框（可用 `--card` 恢复）。
- 所有来源都失败时退出码为 1（此前恒为 0）；查无结果计为失败。
- 非法的配置文件会报错，不再静默使用默认配置。
- 库接口：插件的 `translate` 多了第二个参数 `context`；`TranslationResult` 新增 `errorCode`、`from`、`to`、`cached`、`elapsedMs`；移除了未使用的 `MDOutput`、`MDError` 类型。

完整变更见 [CHANGELOG.md](./CHANGELOG.md)。

## 开发

```bash
bun install
bun run dev           # tsc watch
bun run test          # vitest（注意是 bun run test，不是 bun test）
bun run lint
bun run format        # Prettier 写入；format:check 仅检查
bun run typecheck     # 含测试代码的类型检查
bun run build
bun run check         # 以上检查一次跑完
```

目录结构：

```text
src/
  cli.ts            命令行入口
  translate.ts      并发编排、缓存、错误归一
  config.ts         配置解析与代理
  lang.ts           语言代码与方向推断
  errors.ts         结构化错误
  plugins/          bing / youdao / google 与插件注册表
  render/           卡片、纯文本、JSON 渲染与折行
  utils/            fetch、缓存、自动更新
```

提交时 husky + lint-staged 会对改动的 `.ts` 运行 `eslint --fix` 与 `prettier --write`。CI 在 Node 20 / 22 / 24 上运行 lint、格式检查、类型检查、测试和构建。

### 发布

发布由 `.github/workflows/release.yml` 完成：push `v*` tag 后，它运行全部检查、校验 tag 与 `package.json` 版本一致，然后执行 `npm publish`。

```bash
# 1. 修改 package.json 的 version，并在 CHANGELOG.md 顶部添加条目
bun run check
git commit -am "release: vX.Y.Z" && git push origin main

# 2. 打 tag 触发发布
git tag vX.Y.Z && git push origin vX.Y.Z

# 3. 确认结果（发布后 registry 可能有一两分钟延迟）
npm view minidict version
```

认证使用 npm 的 Trusted Publishing（OIDC），不需要令牌，也没有过期问题。它依赖 npmjs.com 上的一次性登记：包页面 → Settings → Trusted Publisher，选 GitHub Actions 并填写：

| 字段                 | 值                          |
| -------------------- | --------------------------- |
| Organization or user | `superfur`                  |
| Repository           | `minidict`                  |
| Workflow filename    | `release.yml`（只填文件名） |
| Environment name     | 留空                        |
| Allowed actions      | 勾选 **Allow npm publish**  |

登记创建后不能修改，填错需要删除重建。发布失败时按报错排查：

| 报错                                         | 原因                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `403 OIDC permission denied for this action` | 登记里没有勾选 **Allow npm publish**（默认只允许 `npm stage publish`）                |
| `404 Not found` / `ENEEDAUTH`                | npm 版本低于 11.5.1，没有走 OIDC；workflow 里用 Node 24 并升级 npm 就是为了满足这一点 |
| tag 与 `package.json` 版本不一致             | 先改版本号并推送，再打 tag                                                            |

修正 workflow 后要让同一个版本重新发布，需要删除并重新推送 tag；重跑旧的运行仍会使用旧 tag 上的 workflow 文件。

也可以在本地手动发布（需要 `npm login`）：

```bash
bun run check
npm pack --dry-run    # 确认发布内容
npm publish
```

## 许可证

MIT
