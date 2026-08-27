# VibeHub 接入与自动部署手册(可复刻模板)

> 本文档记录炉石网页版(hearthstone-web)如何接入 VibeHub 并配置 GitHub 自动部署。
> 用「实例 + 通用步骤」写成,供新项目(如家里那款游戏)照此复刻。
> 本文档是**仓库公共知识**,与单机环境(代理、token 凭证)解耦;本机私有连接配置见各机器自己的全局 git / `~/.claude`。

## 这套模式一句话

**PR 合并到 main → GitHub Actions 构建 → 官方 VibeHub CLI 把产物 publish 到 VibeHub 项目 → 版本说明自动从 PR 描述提取。**

- 只在 `push` 到 `main` 时**部署**;`pull_request` 只跑构建(CI 校验),不部署。
- 纯静态站点无构建工具时,构建命令就是 `true`(占位),产物 = 仓库根目录。
- 自动部署的钥匙是项目级 Secret `VIBEHUB_PROJECT_TOKEN`,由 VibeHub 项目提供。

## 炉石网页版实例(实际配置)

### 相关文件
- 工作流:`.github/workflows/vibehub-deploy.yml`
- VibeHub 项目元数据:`.vibehub/project.json`(schema、baseUrl、projectSlug)

### 关键配置速查
| 项 | 炉石网页版的值 | 说明 |
|---|---|---|
| VibeHub 项目 slug | `W6OOXn9b` | 项目唯一标识,创作者中心可见 |
| 试玩地址 | https://vibeapps.lumigrav.space/W6OOXn9b/ | slug 拼在域名后 |
| GitHub 仓库 | 08102317cdw-art/hearthstone-web | 默认分支 `main` |
| 输出目录 | 仓库根目录(`index.html` 在根) | 静态、无构建 |
| 构建命令 | `true` | 有构建工具时换成真实命令 |
| Secret | `VIBEHUB_PROJECT_TOKEN` | 项目级 token,存仓库 Actions Secrets |
| 部署触发 | `push` 到 `main` | PR 只构建不部署 |
| 共创状态 | 关闭(`collaborationEnabled: false`) | 暂不开放共创 |

### 工作流做了什么(vibehub-deploy.yml)
1. `actions/checkout` 拉代码。
2. 构建静态站点(当前为 `true` 占位)。
3. 仅 `push` 事件:从官方地址安装 VibeHub CLI(`https://vibe.lumigrav.space/downloads/vibehub-cli/install.sh`,带 `--retry 3`)。
4. 仅 `push` 事件:生成版本说明 —— 优先取该 commit 关联 PR 的标题 + 描述(描述截断 2000 字符),无 PR 时用 commit message,写入临时 note 文件。
5. 仅 `push` 事件:`vibehub update --slug <slug> --dir . --note-file <note>` 发布,其中 `VIBEHUB_TOKEN = secrets.VIBEHUB_PROJECT_TOKEN`。

### 分支保护(Ruleset「VibeHub collaboration protection」)
- Copilot Review 开启。
- required check:`build-and-deploy`(PR 必须构建通过)。
- 作者 PR-only bypass:作者也不能直接推 `main`,必须走 PR 合并。
- 禁止 force push、禁止删除默认分支。

### 版本说明规则
- **提 PR 时把更新介绍写在 PR 描述里**,部署后 VibeHub 版本说明自动取自 PR 标题 + 描述。
- 直接在 main 上提交(绕过 PR)也能发布,版本说明用 commit message。

### 非游戏改动的处理(重要)
- 工作流用 `dorny/paths-filter` 判断本次改动是否涉及游戏内容。
- 只改 `docs/`、`CLAUDE.md`、`README.md`、`.github/`、`*.md`、`*.txt` 等**非游戏文件**时,跳过 VibeHub 部署与版本说明,避免内部文档消息污染游戏简介/更新说明。
- 因此:文档、CI 配置改动合并到 main **不会触发部署**;只有游戏代码/资源改动才部署。复刻到新项目时,这套过滤规则一起带过去。

## 复刻到新项目(通用步骤)

前置:一个 GitHub 仓库(默认分支 `main`)、一个 VibeHub 项目(拿到 slug)。

1. **VibeHub 侧**:创作者中心建项目,记下 slug;默认关闭共创(除非要开放)。
2. **仓库侧**:放好静态产物(根目录 `index.html`)或构建脚本。
3. **复制工作流**:把本仓库 `.github/workflows/vibehub-deploy.yml` 复制到新仓库,改三处:
   - 构建命令:换成目标项目真实的构建(无构建就保留 `true`);
   - `--slug`:换成新项目 slug;
   - `--dir .`:确认指向产物目录。
4. **加 Secret**:仓库 Settings → Secrets and variables → Actions,新建 `VIBEHUB_PROJECT_TOKEN`,值从 VibeHub 项目获取。
5. **配分支保护(Ruleset)**:参照上文,加 required check `build-and-deploy`、作者 PR-only bypass、禁 force push。
6. **首次发布**:开 PR 合并到 `main`,观察 Actions;`push` 触发的那次应看到 CLI 安装 + publish 成功。
7. **确认**:访问 `https://vibeapps.lumigrav.space/<slug>/` 看是否更新。

> ⚠️ **规范唯一真相源**:所有接口、红线以官方文档为准 —— 通读 `https://vibe.lumigrav.space/llms.txt`,接入 GitHub 自动化前必读 `https://vibe.lumigrav.space/api/github-automation`。不要凭记忆或旧 Prompt 里的规则猜接口。

## 本机环境注意事项(各机器独立,不随仓库同步)
- GitHub 直连可能被网络环境 reset,本机需配代理(git 的 `http.proxy`/`https.proxy`)与 `gh` 认证。
- VibeHub CLI 的请求**不能走代理**,需设 `NO_PROXY=.lumigrav.space` 绕过。
- 各机器的 git 全局代理 / credential helper 是单机配置,换机器后各自配置一遍。
