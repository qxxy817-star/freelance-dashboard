# 自由职业总控台

一个无需登录、无需数据库的中文静态网页，用于在浏览器本地记录自媒体、模特、网店三个方向的项目、时间和现金流。

## 预览方式

在仓库根目录运行：

```bash
python3 -m http.server 4173
```

然后用浏览器打开：<http://localhost:4173>

数据会保存在当前浏览器的 localStorage 中。

## 公开部署

本仓库已包含 GitHub Pages 自动部署工作流：`.github/workflows/pages.yml`。当该分支合并并推送到 `main` 后，GitHub Actions 会把仓库根目录中的静态文件发布为公开站点。

部署完成后，可在 GitHub 仓库的 **Settings → Pages** 或 Actions 的 `github-pages` 环境中查看公开访问链接，通常格式为：

```text
https://<github-owner>.github.io/<repository-name>/
```

公开分享前请先阅读 `SECURITY-PRIVACY.md`，确认没有提交真实客户、收入、日程、API Key 或其他私人数据。当前内置数据为虚构示例，访客新增的数据只会保存在访客自己的浏览器 localStorage 中。
