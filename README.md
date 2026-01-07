# Event Sourcing電卓

Event Sourcingパターンを実装した電卓アプリケーションです。全ての操作をイベントとして記録し、イベントのリプレイによって状態を再現します。

## デモ

**🔗 [https://akinoriakatsuka.github.io/es-dentaku/](https://akinoriakatsuka.github.io/es-dentaku/)**

## 特徴

- **Event Sourcingアーキテクチャ**: 全ての操作をイベントとして記録
- **Undo/Redo機能**: 操作の取り消しとやり直しが可能
- **イベント履歴の管理**: 操作ログの表示、エクスポート、インポート
- **セッション永続化**: sessionStorageを使用した状態の保存
- **数式評価**: math.jsを使用した正確な計算

## 機能

### 基本機能
- 四則演算（加算、減算、乗算、除算）
- 小数点入力
- クリア（C）
- バックスペース（←）

### Event Sourcing機能
- **Undo/Redo**: 操作の取り消しと再実行
- **イベント履歴表示**: 全ての操作をタイムスタンプ付きで表示
- **操作ログのエクスポート**: ログをクリップボードにコピー
- **操作ログのインポート**: ログから状態を復元
- **リセット**: 全ての履歴を消去

## 使い方

### ローカルで実行

1. リポジトリをクローン
```bash
git clone <repository-url>
cd dentaku
```

2. ブラウザで開く
```bash
open index.html
```

または、ローカルサーバーを起動
```bash
python -m http.server 8000
# ブラウザで http://localhost:8000 にアクセス
```

### E2Eテスト

Playwrightを使用したE2Eテストが含まれています。

```bash
# 依存関係のインストール
npm install

# テストの実行
npm run test:e2e

# UIモードでテストを実行
npm run test:e2e:ui

# ブラウザを表示してテストを実行
npm run test:e2e:headed
```

#### テストシナリオ
- シナリオ1: 基本的な足し算の計算
- シナリオ2: 複数の演算（掛け算と引き算）
- シナリオ3: クリア機能のテスト
- シナリオ4: Undo/Redo機能のテスト
- シナリオ5: バックスペース機能のテスト

## アーキテクチャ

### イベントタイプ
- `append`: 文字の追加
- `clear`: クリア
- `calculate`: 計算実行
- `backspace`: バックスペース
- `undo`: 取り消し
- `redo`: やり直し

### EventStoreクラス
全てのイベントを管理し、sessionStorageに永続化します。

主なメソッド:
- `add(event)`: イベントの追加
- `clearAll()`: 全イベントの削除
- `canUndo()`: Undo可能かチェック
- `canRedo()`: Redo可能かチェック
- `calculateCurrentIndex()`: 有効なイベントのインデックスを計算

### replay関数
イベント履歴を再生して現在の状態を計算します。Undo/Redoイベントを考慮して有効なイベントのみを適用します。

## 技術スタック

- **HTML/CSS/JavaScript**: フロントエンド
- **math.js**: 数式評価ライブラリ
- **sessionStorage**: ブラウザストレージ
- **Playwright**: E2Eテストフレームワーク

## CI/CD

GitHub Actionsを使用したE2Eテストの自動実行が設定されています。