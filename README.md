# MiniDict 迷你词典

一个简单而强大的命令行翻译工具，支持中英互译，多个翻译源，实时查询。

[![NPM Version][npm-image]][npm-url]
[![Node Version][node-version-image]][node-version-url]
[![License][license-image]][license-url]

## 特性

- 🚀 快速的命令行翻译工具
- 🌐 支持中英互译
- 🔄 多翻译源支持（有道词典、必应词典）
- 📖 详细的翻译结果（音标、词性、释义、例句）
- 🎨 优雅的命令行展示
- ⚡️ 实时查询，无需等待
- 🛠 可配置的翻译源

## 安装

```bash
# 使用 yarn 安装（推荐）
yarn global add minidict

# 或使用 npm 安装
npm install -g minidict
```

## 使用方法

### 基本翻译

```bash
# 英译中
dict hello world

# 中译英
dict 你好世界

# 翻译短语
dict "good morning"

# 翻译句子
dict "这是一个测试句子"
```

### 配置文件

配置文件位于 `~/.minidict.yml`，可以自定义启用的翻译源：

```yaml
plugins:
  minidict-youdao: true  # 启用有道词典
  minidict-bing: true    # 启用必应词典
```

## 输出示例

```
# Bing
https://cn.bing.com/dict/search?q=hello

美. [həˈloʊ]  英. [həˈləʊ]

int. 喂；哈罗
n. 表示问候，惊奇或唤起注意时的用语

例句:
  Hello, is anybody there?
  喂，有人在吗？
```

## 开发

### 环境要求

- Node.js >= 14
- Yarn >= 1.22

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/superfur/minidict.git
cd minidict

# 安装依赖
yarn install

# 构建项目
yarn build

# 本地测试
yarn link
dict hello
```

### 项目结构

```
src/
├── plugins/            # 翻译插件
│   ├── minidict-bing/  # 必应词典插件
│   └── minidict-youdao/# 有道词典插件
├── service/           # 核心服务
├── template/          # 输出模板
├── types/            # 类型定义
└── utils/            # 工具函数
```

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 许可证

MIT © [Septem](https://github.com/superfur)

[npm-image]: https://img.shields.io/npm/v/minidict.svg
[npm-url]: https://npmjs.org/package/minidict
[node-version-image]: https://img.shields.io/node/v/minidict.svg
[node-version-url]: https://nodejs.org/en/download/
[license-image]: https://img.shields.io/npm/l/minidict.svg
[license-url]: https://github.com/superfur/minidict/blob/master/LICENSE

