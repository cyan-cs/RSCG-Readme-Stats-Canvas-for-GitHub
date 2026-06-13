# RSCG - GitHub 统计图表画布 (Readme Stats Canvas)

**RSCG** 是一个可视化编辑器，用于创建动态且高度可定制的 GitHub 个人资料统计卡片。您可以在几秒钟内设计出独特的卡片，并将其直接托管在您的 GitHub README 中。

[English](../../README.md) | [日本語](../ja/README.md) | 简体中文 | [한국어](../ko/README.md)

---

### 核心特性

- **可视化拖拽编辑器**: 直观的画布界面，自由设计您的统计卡片。
- **丰富的小组件库**:
  - **GitHub 统计**: 提交数、星标数、仓库数及关注者。
  - **贡献图**: 经典的 GitHub “绿墙”可视化（芝生）。
  - **语言分布**: 自动展示您最常用的编程语言。
  - **自定义元素**: 徽章、进度条、形状、头像及文本。
- **智能布局**: 支持 8px 网格吸附、多选操作以及撤销/重做 (Undo/Redo)。
- **模板系统**: 使用内置精美模板或保存您自己的自定义设计。
- **多语言支持**: 根据浏览器设置自动切换英语、日语、中文（简体/繁体）和韩语。
- **CJK 字体支持**: 在 SVG 中渲染精美的 Noto Sans CJK 字体，确保多语言显示的高质量。
- **高性能**: 通过 ETag 缓存和 304 支持优化 SVG 渲染，提供快速的访问体验。

### 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **数据库**: SQLite (通过 `better-sqlite3`)
- **身份验证**: Auth.js v5 (GitHub Provider)
- **图标**: Lucide React

---

## 入门指南

### 前提条件

- Node.js 20.9.0 或更高版本
- npm 10 或更高版本

### 本地开发

1. **克隆仓库**:

   ```bash
   git clone https://github.com/cyan-cs/RSCG-Readme-Stats-Canvas-for-GitHub.git
   cd RSCG-Readme-Stats-Canvas-for-GitHub
   ```

2. **安装依赖**:

   ```bash
   npm install
   ```

3. **设置环境变量**:
   从示例创建 `.env` 文件:

   ```bash
   cp .env.example .env
   ```

   填写您的 GitHub OAuth 凭据和其他必需变量。

4. **运行开发服务器**:
   ```bash
   npm run dev
   ```

### Docker 设置

1. **构建镜像**:

   ```bash
   docker build -t profilecanvas .
   ```

2. **运行容器**:
   ```bash
   docker run -p 3000:3000 \
     --env-file .env \
     -v $(pwd)/data:/app/data \
     profilecanvas
   ```
   _注意：必须挂载 `/app/data` 卷以持久化您的卡片数据库。_

---

## 环境变量

| 变量名               | 描述                                               |
| -------------------- | -------------------------------------------------- |
| `AUTH_GITHUB_ID`     | GitHub OAuth 应用的 Client ID                      |
| `AUTH_GITHUB_SECRET` | GitHub OAuth 应用的 Client Secret                  |
| `AUTH_SECRET`        | 用于会话加密的随机字符串                           |
| `AUTH_URL`           | 您部署的基础 URL                                   |
| `GITHUB_TOKEN`       | (可选) GitHub 个人访问令牌 (PAT)，用于提高速率限制 |

---

## 📜 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](../../LICENSE) 文件。
