# ⚔️ 炉石网页版 · 简易对战

一个纯前端实现的《炉石传说》风格卡牌对战网页游戏。无需安装，浏览器直接打开即可游玩单机模式；支持局域网联机对战、竞技场、卡牌收藏、商店开包与多种扩展包。

## 🎮 在线试玩

- **VibeHub 在线地址**：<https://vibeapps.lumigrav.space/W6OOXn9b/>

> 本仓库与 VibeHub 自动部署联动：推送到 `main` 分支后，GitHub Actions 会自动构建并部署到上面的在线地址，无需手动上传。

## ✨ 功能特性

- **单机对战**：完整的随从攻防、法术、战吼、亡语等基础规则
- **竞技场模式**（`arena.js`）：随机选牌、赢场奖励的肉鸽玩法
- **卡牌收藏**（`collection.js`）：收集卡牌、组建卡组、编辑套牌
- **商店与开包**（`shop.js`）：多种扩展包、金币系统、开包收集
- **局域网联机**（`network.js` + `server.js`）：WebSocket 双人对战
- **历史记录**（`history.js`）：出牌过程可视化回看
- **特效引擎**（`fx.js`）：屏幕震动、攻击动画等视觉反馈
- **沙盒测试模式**（`testMode.js`）：独立测试卡牌与规则的沙盒

## 📁 项目结构

```
炉石网页版/
├── index.html          # 主页面：全部界面 UI（对战、菜单、收藏、商店…）
├── game.js             # 核心游戏逻辑：状态管理、对战规则、依赖入口（全局 $ / CARDS / sfx）
├── cards.js            # 全局卡牌数据库与扩展包定义（经典、扩展卡池、费用/属性）
├── arena.js            # 竞技场模式（随机选牌、胜负奖励、钥匙进度）
├── collection.js       # 我的收藏：卡牌收集、卡组编辑与套牌管理
├── shop.js             # 商店与开包系统（金币、卡包、多扩展包）
├── network.js          # 局域网联机驱动（WebSocket 客户端）
├── server.js           # 局域网对战 WebSocket 服务器（Node.js，需单独启动）
├── effects.js          # 独立效果与事件系统（战吼、亡语、随从效果）
├── fx.js               # 视觉与特效引擎（屏幕震动、动画）
├── history.js          # 出牌历史记录模块
├── testMode.js         # 独立沙盒测试模式
├── 游戏封面.png         # 封面图（VibeHub 部署展示用）
├── 参考文档/            # 设计文档（商店开包、对战模式卡牌数据库、收藏界面）
└── .vibehub/           # VibeHub 项目映射（project.json，非敏感）
```

## 🚀 本地运行

### 方式一：单机模式（最简单）

直接用浏览器打开 **`index.html`** 即可游玩单机对战、竞技场、收藏与商店。

### 方式二：局域网联机对战

1. 安装 [Node.js](https://nodejs.org/)，在项目目录执行：

   ```bash
   npm install ws    # 安装 WebSocket 依赖
   node server.js    # 启动局域网服务器（默认端口 8080）
   ```

2. 房主在游戏中创建房间，对手在同一局域网内输入房主的局域网 IP 加入对战。

## 🔄 自动部署说明

本仓库已配置 **VibeHub 自动部署**：

- 工作流：`.github/workflows/vibehub-deploy.yml`
- 触发方式：推送到 `main` 分支（或合并 PR 到 main）后自动构建并部署
- 部署目标：VibeHub 项目 `W6OOXn9b`
- 分支保护：默认分支受 Ruleset 保护，改动需通过 Pull Request 合并

### 日常开发流程

```bash
# 1. 在本地修改代码
# 2. 提交并推送到远端（或让 AI 协助执行）
git add .
git commit -m "描述你的改动"
git push origin <新分支>   # 推送新分支

# 3. 在 GitHub 上创建 Pull Request 合并到 main
#    （或在对话中告诉 AI：帮我提交并推送到 GitHub 部署）
```

合并到 `main` 后，等 1~3 分钟，刷新在线试玩地址即可看到最新版本。

## 🛠️ 技术栈

- 纯原生 JavaScript + HTML + CSS（无构建工具，无框架）
- 本地数据持久化：浏览器 `localStorage`
- 局域网联机：Node.js + WebSocket（`ws`）

## 📄 许可

仅供个人学习与娱乐使用；游戏素材与卡牌设计版权归原《炉石传说》所有者所有。
