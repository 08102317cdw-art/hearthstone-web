# 家里电脑 · 首次配置与使用指南

> 面向家里这台(全新状态的)电脑,用 Claude Code 开发,并复用本仓库「炉石网页版」的 VibeHub 自动部署模式。
> 本文件由公司电脑维护、提交进仓库,家里 `git pull` 后即可读到。

## 1. 确认 / 安装 Claude Code

- 终端跑 `claude --version`,有输出 = 已装,跳过。
- 没装:官网 <https://claude.ai/code> 下载桌面版;或已有 Node.js 时跑 `npm install -g @anthropic-ai/claude-code`。

## 2. GitHub 认证(一次配置,以后自动)

在 Claude Code 会话里运行:

```
! gh auth login
```

交互依次选 **GitHub.com → HTTPS → Login with a web browser**,浏览器授权即可。这一步同时让 `git` 和 `gh` 都能用(push、开 PR、合并全自动)。

> 网络提醒:若家里 GitHub 连不上,先配好代理(公司这台是 Clash `127.0.0.1:7897`),认证通过后再继续。

## 3. 拉取本仓库

```
! git clone https://github.com/08102317cdw-art/hearthstone-web.git
```

clone 后仓库落在当前目录的 `hearthstone-web/` 文件夹里(见第 6 节"找到文件夹")。

## 4. 让 Claude 认识部署模式

进入仓库目录后,粘贴以下提示词:

```
我切到家里这台电脑继续开发。先帮我完成环境认知:

1. 如果本仓库还没拉到本地,先 git clone https://github.com/08102317cdw-art/hearthstone-web.git
2. 通读项目 CLAUDE.md,记住里面的项目约定(尤其是"修改后必须询问是否部署"这条)
3. 重点读 docs/VIBEHUB_DEPLOY.md —— 这是本项目的 VibeHub 接入 + GitHub 自动部署手册,含可复刻模板
4. 看完后给我复述一遍:这套"PR→main→Actions→CLI publish"部署模式的关键环节?如果我要把另一个新游戏按同样方式接入 VibeHub 自动部署,需要准备哪些东西?
```

## 5. (可选)补一份全局偏好

想让家里 Claude 也遵循「中文回复 + emoji 开头」等习惯,在 `C:\Users\<你的用户名>\.claude\CLAUDE.md` 写一份即可。全局配置不随仓库同步,两边各维护各的。

## 6. 找到 clone 的文件夹 & 进入提问

- `git clone` 结束时会打印 `Cloning into 'hearthstone-web'...`,文件夹就在**你运行 clone 的那个目录**下。
- 用 `ls`(Windows 用 `dir`)查看当前目录,能看到 `hearthstone-web`。
- 进入:`cd hearthstone-web`,确认路径:`pwd`。
- 在该目录里直接运行 `claude` 启动,提问即在项目上下文;或一步到位 `claude hearthstone-web`(支持直接指定项目目录启动)。

## 7. 部署家里新游戏时

把下面提示词粘贴给家里的 Claude:

```
我有一个新游戏(简单描述玩法/形态),要按炉石网页版的模式接入 VibeHub 自动部署。

1. 先通读 https://vibe.lumigrav.space/llms.txt 和 https://vibe.lumigrav.space/api/github-automation —— 以官方规范为唯一真相源,不要凭记忆猜接口
2. 参考 https://github.com/08102317cdw-art/hearthstone-web 的 docs/VIBEHUB_DEPLOY.md「复刻到新项目」步骤
3. 动手前先跟我确认:技术方案、GitHub 仓库准备、VibeHub 项目 slug、工作流/Secret/Ruleset 的配置计划,我确认后再写代码
```
