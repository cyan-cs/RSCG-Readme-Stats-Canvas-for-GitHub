# RSCG - GitHub プロフィール統計カードキャンバス

**RSCG** は、動的で高度にカスタマイズ可能な GitHub プロフィール統計カードを作成するためのビジュアルエディタです。数秒で独自のカードをデザインし、GitHub の README に直接表示させることができます。

[English](../../README.md) | 日本語 | [简体中文](../ch/README.md) | [한국어](../ko/README.md)

---

### 主な機能
- **ビジュアルドラッグ＆ドロップエディタ**: キャンバス上で直感的に要素を配置・編集できます。
- **豊富なウィジェット**: 
  - **GitHub 統計**: コミット数、スター数、リポジトリ数、フォロワー数。
  - **コントリビューション芝生**: おなじみの活動履歴を可視化。
  - **言語統計**: 使用言語の動的な割合表示。
  - **カスタム要素**: バッジ、進捗バー、図形、アバター、テキスト。
- **スマートレイアウト**: 8pxスナップ、複数選択、元に戻す/やり直し（Undo/Redo）をサポート。
- **テンプレートシステム**: プリセットテンプレートから開始したり、独自のカスタムデザインを保存できます。
- **多言語対応**: ブラウザの言語設定に合わせて、英語、日本語、中国語、韓国語を自動的に切り替えます。
- **CJK フォントサポート**: Noto Sans CJK フォントを使用し、日本語・中国語・韓国語を高品質に SVG レンダリングします。
- **ハイパフォーマンス**: ETag キャッシュと 304 Not Modified サポートにより、高速な画像配信を実現。

### 技術スタック
- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS 4
- **データベース**: SQLite (via `better-sqlite3`)
- **認証**: Auth.js v5 (GitHub Provider)
- **アイコン**: Lucide React

---

## はじめかた

### 構成要件
- Node.js 20.9.0 以上
- npm 10 以上

### ローカル開発
1. **リポジトリをクローン**:
   ```bash
   git clone https://github.com/cyan-cs/RSCG-Readme-Stats-Canvas-for-GitHub.git
   cd RSCG-Readme-Stats-Canvas-for-GitHub
   ```

2. **依存関係をインストール**:
   ```bash
   npm install
   ```

3. **環境変数の設定**:
   `.env.example` をコピーして `.env` を作成します。
   ```bash
   cp .env.example .env
   ```
   GitHub OAuth のクレデンシャルなどの必要な変数を入力してください。

4. **開発サーバーを起動**:
   ```bash
   npm run dev
   ```

### Docker での実行
1. **イメージをビルド**:
   ```bash
   docker build -t profilecanvas .
   ```

2. **コンテナを起動**:
   ```bash
   docker run -p 3000:3000 \
     --env-file .env \
     -v $(pwd)/data:/app/data \
     profilecanvas
   ```
   *注意: カードデータを保存するために `/app/data` ボリュームのマウントが必要です。*

---

## 環境変数

| 変数名 | 説明 |
|----------|-------------|
| `AUTH_GITHUB_ID` | GitHub OAuth アプリのクライアント ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth アプリのクライアントシークレット |
| `AUTH_SECRET` | セッション暗号化用のランダムな文字列 |
| `AUTH_URL` | デプロイ先のベース URL |
| `GITHUB_TOKEN` | (任意) レート制限を緩和するための GitHub PAT |

---

## 📜 ライセンス
このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](../../LICENSE) ファイルを参照してください。
