# Model Name Formatter (SillyTavern Extension)

用于在 SillyTavern 聊天消息中显示并格式化模型名称的扩展。

## 功能

- 对方名称常显（仅 AI 侧，忽略 hover，可开关）
- 显示模型名称（仅 AI 侧，关闭时显示昵称，可开关）
- 模型名称切割（0/1/2/3）
  - `0`：原样保留
  - `1`：取首个 `" - "` 后的内容
  - `2`：在第 1 步基础上，优先取首个 `"/"` 后；无 `"/"` 则再取首个 `" - "` 后
  - `3`：在第 2 步基础上，取最后一个 `"-"` 前的内容
- 扩展设置使用 SillyTavern 原生折叠面板（右侧箭头）

## 安装

### 方式 A：通过 GitHub 安装（推荐）

在 SillyTavern 的第三方扩展安装入口使用仓库地址：

`https://github.com/svomro/SillyTavern-model_name_format.git`

### 方式 B：本地开发（内置目录）

将扩展放到：

`/public/scripts/extensions/model_name_formatter`

确保目录包含：

- `manifest.json`
- `index.js`
- `index.html`
- `style.css`

## 兼容说明

扩展已适配以下两种加载场景：

- 内置扩展目录（`/scripts/extensions/<name>/...`）
- 第三方扩展目录（`/scripts/extensions/third-party/<name>/...`）

模板路径会根据运行路径自动解析，无需手动改 `index.js` 的路径。

## 使用方式

1. 启动 SillyTavern 并进入扩展设置。
2. 打开 `Model Name Formatter` 折叠面板。
3. 按需切换：
   - `对方名称常显（忽略 hover）`
   - `显示模型名称（关闭时显示昵称）`
   - `模型名称切割` 下拉选项

## 与自定义 CSS 协作

扩展会根据设置切换以下 `body` class：

- `mnf-show-model`：启用模型名称展示
- `mnf-show-ch-name`：启用“对方名称常显”（仅 AI 侧）

如果你有全局自定义 CSS，可基于这两个 class 继续覆盖样式。

## 常见问题

### 1) Extension "Model Name Formatter" failed to load: [object Event]

通常由旧版本路径写法引起（第三方目录加载时相对路径错误）。

处理步骤：

1. 删除旧扩展目录
2. 从本仓库重新安装最新版本
3. 强制刷新浏览器（Ctrl/Cmd + Shift + R）
4. 若仍报错，打开控制台查看第一条红字

### 2) 折叠箭头位置看起来不对齐

已在最新版本中修正扩展外层容器边距。更新到最新提交并刷新后应与原生扩展对齐。

## 免责声明

- 本项目为非官方扩展，与 SillyTavern 官方项目无隶属关系或担保关系。
- 扩展按“现状（AS IS）”提供，不承诺适配所有主题、CSS 或未来版本变更。
- 使用者需自行评估风险并对其配置、数据与运行结果负责。
- 因版本更新、第三方样式冲突或自行修改导致的问题，维护者不承担连带责任。
