# minidict

一个简单易用的命令行词典工具，支持中英互译，多词典源，显示音标和例句。

## 特性

- 支持中英互译
  - 单词翻译：提供详细释义、音标和例句
  - 短语/句子翻译：智能识别中英文，提供准确翻译
- 支持多词典源
  - 有道词典：提供权威词典释义、音标和网络释义
  - 必应词典：提供高质量双语例句
- 智能功能
  - 自动识别输入语言
  - 根据查询内容自动选择最佳翻译接口
  - 过滤并优化翻译结果和例句
- 人性化设计
  - 清晰的结果展示
  - 彩色输出支持
  - 可配置的输出选项

## 安装

```bash
yarn global add minidict
```

## 使用

```bash
# 查询英文单词
dict hello
# 输出：音标、基本释义、网络释义

# 查询英文短语
dict "I love you" --examples
# 输出：多个可能的翻译、相关例句

# 查询中文
dict "我爱你" --examples
# 输出：英文翻译、相关例句

# 显示帮助
dict -h

# 显示版本
dict -v
```

## 配置

配置文件位于 `~/.minidict.json`，支持以下选项：

```json
{
  "plugins": ["bing", "youdao"],
  "showPhonetic": true,
  "showExamples": false,
  "maxExamples": 3
}
```

### 配置选项说明

- `plugins` (array): 启用的词典插件列表，可选值：`bing`、`youdao`，默认为 `["bing", "youdao"]`
- `showPhonetic` (boolean): 是否显示音标，默认为 `true`
- `showExamples` (boolean): 是否显示例句，默认为 `false`
- `maxExamples` (number): 最大例句数量，默认为 `3`

### 命令行选项优先级

命令行选项会覆盖配置文件中的对应设置：

```bash
# 使用指定插件
dict hello --plugin bing

# 强制显示音标
dict hello --phonetic

# 显示例句
dict hello --examples

# 设置最大例句数量
dict hello --examples --max-examples 5
```

## 开发

```bash
# 安装依赖
yarn install

# 开发模式
yarn dev

# 构建
yarn build

# 测试
yarn test

# 代码检查
yarn lint
```

## 插件系统

minidict 采用插件系统设计，目前支持：

### 有道词典插件
- 支持中英互译
- 提供权威词典释义
- 显示音标（英美音）
- 提供网络释义
- 智能识别查询类型（单词/短语）

### 必应词典插件
- 支持中英互译
- 提供高质量双语例句
- 智能过滤无关例句
- 优化排序算法

## 测试覆盖

- 核心翻译器测试
- 词典插件测试
  - 有道词典插件测试
  - 必应词典插件测试
- 配置管理测试
- 命令行接口测试

## 许可证

MIT

