# 炉石网页版 · 项目级指令

## 修改后必须询问是否部署(强制约定)

每次修改完炉石网页版代码,并自查 / review 确认没有问题后,**必须停下来向我(用户)询问**是否需要用 git 提交并推送到 GitHub 部署。

- 在得到我明确确认之前,**不得**自动执行 `git commit`、`git push`、创建 PR 或合并。
- 询问时要简要说明这次改了什么,方便我判断是否需要发布。
- 只有我明确同意后,才执行提交 → 推送 → 合并到 main(触发 VibeHub 自动部署)。

## 项目背景速查

- VibeHub 项目 slug:`W6OOXn9b`,试玩地址:<https://vibeapps.lumigrav.space/W6OOXn9b/>
- GitHub 仓库:<https://github.com/08102317cdw-art/hearthstone-web>(默认分支 `main`,改动走 PR 合并)
- 静态输出目录 = 仓库根目录(`index.html` 在根),无构建步骤
- 更新说明:从 PR 描述提取,提 PR 时把更新介绍写在描述里
- 本项目的 VibeHub 接入与自动部署方式见 `docs/VIBEHUB_DEPLOY.md`,新项目可照此复刻
