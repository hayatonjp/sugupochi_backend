# Sugupochi Backend

投票システムのバックエンドAPIです。Cloudflare WorkersとD1データベースを使用して構築されています。

## 機能

- 投票（ポール）の作成
- 投票の取得
- 投票の実行
- JST（日本標準時）対応の日時処理

## 技術スタック

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **Language**: TypeScript

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### 開発環境の起動

```bash
npm run dev
```

### デプロイ

```bash
npm run deploy
```

### 型定義の生成

[Cloudflare Workersの設定に基づいて型を生成/同期する場合](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
npm run cf-typegen
```

## API エンドポイント

- `POST /api/polls` - 新しい投票を作成
- `GET /api/polls/{uuid}` - 投票の詳細を取得
- `POST /api/polls/{uuid}/vote` - 投票を実行
- `GET /api/polls/{uuid}/vote/complete` - 投票管理画面の投票の詳細を取得
- `GET /api/polls/{uuid}/create/complete` - 投票管理画面遷移時の投票の詳細を取得
- `GET /api/polls/{uuid}/results` - 投票結果画面遷移時の集計結果を取得

## データベーススキーマ

- `polls` - 投票の基本情報
- `poll_options` - 投票の選択肢
- `votes` - 投票結果

## 環境変数

- `FRONTEND_URL` - フロントエンドのURL（CORS設定用）

## 開発

`CloudflareBindings`をジェネリックとして使用してHonoをインスタンス化してください：

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
