# RSCG - Readme Stats Canvas for GitHub

[![CI](https://github.com/cyan-cs/RSCG-Readme-Stats-Canvas-for-GitHub/actions/workflows/ci.yml/badge.svg)](https://github.com/cyan-cs/RSCG-Readme-Stats-Canvas-for-GitHub/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**RSCG** is a visual editor for creating dynamic, highly customizable GitHub profile statistics cards. Design your own unique card in seconds and host it directly on your GitHub README.

English | [日本語](./docs/ja/README.md) | [简体中文](./docs/ch/README.md) | [한국어](./docs/ko/README.md)

---

## Key Features

- **Visual Drag-and-Drop Editor**: Fully interactive canvas for designing cards.
- **Rich Widget Library**:
  - **GitHub Stats**: Commits, stars, repositories, and followers.
  - **Contribution Heatmap**: The classic "grass" visualization.
  - **Language Charts**: Dynamic breakdown of your top coding languages.
  - **Custom Elements**: Badges, progress bars, shapes, and avatars.
- **Smart Layout**: 8px grid snapping, multi-selection, and undo/redo support.
- **Template System**: Use predefined templates or save your own custom designs.
- **Dynamic Localization**: Automatic translation for English, Japanese, Chinese, and Korean.
- **CJK Font Support**: Renders beautiful Noto Sans CJK fonts in SVGs for high-quality multi-language display.
- **High Performance**: Optimized SVG rendering with ETag caching and 304 support.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: SQLite (via `better-sqlite3`)
- **Authentication**: Auth.js v5 (GitHub Provider)
- **Icons**: Lucide React

---

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- npm 10 or higher

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/cyan-cs/RSCG-Readme-Stats-Canvas-for-GitHub.git
   cd RSCG-Readme-Stats-Canvas-for-GitHub
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Setup environment variables**:
   Create a `.env` file from the example:

   ```bash
   cp .env.example .env
   ```

   Fill in your GitHub OAuth credentials and other required variables.

4. **Run the development server**:
   ```bash
   npm run dev
   ```

### Docker Setup

1. **Build the image**:

   ```bash
   docker build -t profilecanvas .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3000:3000 \
     --env-file .env \
     -v $(pwd)/data:/app/data \
     profilecanvas
   ```
   _Note: Mounting the `/app/data` volume is required to persist your cards database._

---

## Environment Variables

| Variable             | Description                                   |
| -------------------- | --------------------------------------------- |
| `AUTH_GITHUB_ID`     | GitHub OAuth App Client ID                    |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret                |
| `AUTH_SECRET`        | Random string for session encryption          |
| `AUTH_URL`           | Base URL of your deployment                   |
| `GITHUB_TOKEN`       | (Optional) GitHub PAT to increase rate limits |

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
