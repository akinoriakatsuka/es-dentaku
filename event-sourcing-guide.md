# Event Sourcing電卓の実装解説

## はじめに

このドキュメントでは、JavaScriptで実装されたEvent Sourcing（イベントソーシング）パターンを用いた電卓アプリケーションの仕組みを解説します。

## Event Sourcingとは

Event Sourcingは、アプリケーションの状態を直接保存するのではなく、**状態の変化をイベントとして記録**し、それらのイベントを再生することで現在の状態を再構築するデザインパターンです。

### 従来の状態管理との違い

```javascript
// 従来の方法: 現在の状態を直接保存
let currentValue = "123";
currentValue = "1234"; // 古い値は失われる

// Event Sourcing: 変更をイベントとして記録
events = [
  { type: "append", value: "1" },
  { type: "append", value: "2" },
  { type: "append", value: "3" },
  { type: "append", value: "4" }
];
```

## コアコンポーネント

### 1. CalculationEvent クラス

`index.html:65-71`

```javascript
class CalculationEvent {
    constructor(type, value = null) {
        this.type = type; // "append", "clear", "calculate"
        this.value = value;
        this.timestamp = new Date().toLocaleTimeString();
    }
}
```

**役割**: 電卓で発生するあらゆる操作をイベントとして表現します。

**イベントタイプ**:
- `append`: 文字の追加（数字や演算子）
- `clear`: クリア操作
- `calculate`: 計算実行
- `backspace`: 一文字削除
- `undo`: 元に戻す
- `redo`: やり直し

### 2. Expression クラス

`index.html:73-144`

**数式を表現するドメインモデル**です。EventStoreから数式表現の責務を分離し、電卓の式に関するロジックを集約しています。

#### コンストラクタ

```javascript
constructor(eventStore) {
    this.eventStore = eventStore;
}
```

- EventStoreへの参照を保持
- EventStoreのイベントを使って数式の状態を管理

#### calculateActiveFlags() メソッド

```javascript
calculateActiveFlags() {
    const events = this.eventStore.events;
    let activeFlags = events.map(() => true);

    events.forEach((event, index) => {
        if (event.type === 'undo') {
            // 最後の有効なイベント（undo/redo以外）を無効化
            for (let i = index - 1; i >= 0; i--) {
                if (activeFlags[i] && events[i].type !== 'undo' && events[i].type !== 'redo') {
                    activeFlags[i] = false;
                    break;
                }
            }
        } else if (event.type === 'redo') {
            // 最初の無効なイベント（undo/redo以外）を有効化
            for (let i = 0; i < index; i++) {
                if (!activeFlags[i] && events[i].type !== 'undo' && events[i].type !== 'redo') {
                    activeFlags[i] = true;
                    break;
                }
            }
        }
    });

    return activeFlags;
}
```

**重要な設計ポイント**:
- Undo/Redoもイベントとして記録
- 状態を削除せず、フラグで管理
- 全てのイベントが保持されるため完全な履歴追跡が可能

#### replay() メソッド

**Event Sourcingの核心**: イベント列から現在の状態を再構築します。

```javascript
replay() {
    const events = this.eventStore.events;
    const activeFlags = this.calculateActiveFlags();

    // 有効なイベントのみを使って計算
    let expr = "";
    events.forEach((event, index) => {
        if (!activeFlags[index]) return;
        if (event.type === "append") expr += event.value;
        if (event.type === "clear") expr = "";
        if (event.type === "calculate") {
            try {
                expr = math.evaluate(expr).toString();
            } catch (e) {
                alert('不正な数式表現です');
            }
        }
        if (event.type === "backspace" && expr.length > 0)
            expr = expr.slice(0, -1);
    });
    return expr;
}
```

**処理フロー**:
1. 全イベントに対して有効/無効フラグを計算（`calculateActiveFlags()`）
2. 有効なイベントのみを順に実行して状態を構築
3. 計算結果の文字列を返す

#### canUndo() / canRedo() メソッド

```javascript
canUndo() {
    const events = this.eventStore.events;
    const activeFlags = this.calculateActiveFlags();
    return activeFlags.some((active, i) =>
        active && events[i].type !== 'undo' && events[i].type !== 'redo'
    );
}

canRedo() {
    const events = this.eventStore.events;
    const activeFlags = this.calculateActiveFlags();
    return activeFlags.some((active, i) =>
        !active && events[i].type !== 'undo' && events[i].type !== 'redo'
    );
}
```

- Undo/Redo可能かどうかを判定
- UIのボタン有効/無効の制御に使用

### 3. EventStore クラス

`index.html:146-166`

**イベントの永続化のみを担当**する、シンプルで明確な責務を持つクラスです。

#### コンストラクタ

```javascript
constructor() {
    const saved = sessionStorage.getItem('calcEvents');
    this.events = saved ? JSON.parse(saved) : [];
}
```

- `sessionStorage`からイベント履歴を復元
- ブラウザを閉じるまでデータを保持

#### save() メソッド

```javascript
save() {
    sessionStorage.setItem('calcEvents', JSON.stringify(this.events));
}
```

- イベント配列をストレージに永続化

#### add() メソッド

```javascript
add(event) {
    this.events.push(event);
    this.save();
}
```

- 新しいイベントを追加
- 自動的にストレージに保存

#### clearAll() メソッド

```javascript
clearAll() {
    this.events = [];
    this.save();
}
```

- 全てのイベントをクリア
- ストレージもクリア

## 主要機能の実装

### 文字入力・計算操作

```javascript
function appendChar(char) {
    store.add(new CalculationEvent("append", char));
    updateDisplay();
}

function calcResult() {
    const expression = new Expression(store);
    const currentExpr = expression.replay();
    try {
        math.evaluate(currentExpr);
        store.add(new CalculationEvent("calculate"));
        updateDisplay();
    } catch {
        alert('expression is invalid');
    }
}
```

**ポイント**:
- Expressionクラスのインスタンスを作成してreplay()を実行
- 計算が有効な場合のみ"calculate"イベントを追加

### Undo/Redo

```javascript
function undoAction() {
    const expression = new Expression(store);
    if (expression.canUndo()) {
        store.add(new CalculationEvent("undo"));
        updateDisplay();
    }
}

function redoAction() {
    const expression = new Expression(store);
    if (expression.canRedo()) {
        store.add(new CalculationEvent("redo"));
        updateDisplay();
    }
}
```

**特徴**:
- Undo/Redo自体もイベントとして記録されるため、「Undoした」という事実も履歴に残ります
- Expressionクラスを使って実行可能性を判定

### 表示更新

```javascript
function updateDisplay() {
    const expression = new Expression(store);
    document.getElementById("result").value = expression.replay();
    renderEventLog();
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const expression = new Expression(store);
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    if (undoBtn) undoBtn.disabled = !expression.canUndo();
    if (redoBtn) redoBtn.disabled = !expression.canRedo();
}
```

**処理フロー**:
- Expressionクラスのインスタンスを作成
- replay()で現在の式を再構築して画面に表示
- Undo/Redoボタンの有効/無効を更新

### イベントログのエクスポート/インポート

`index.html:230-265`

#### エクスポート（コピー）

```javascript
document.getElementById("copyLogBtn").onclick = function () {
    const logs = store.events.map(e =>
        `[${e.timestamp}] ${e.type} ${e.value !== null ? e.value : ""}`
    ).join("\n");
    navigator.clipboard.writeText(logs).then(() => {
        showToast('操作ログをクリップボードにコピーしました', 'success');
    }).catch(() => {
        showToast('コピーに失敗しました', 'error');
    });
};
```

**出力例**:
```
[12:34:56] append 1
[12:34:57] append +
[12:34:58] append 2
[12:34:59] calculate
```

#### インポート（復元）

```javascript
document.getElementById("importLogBtn").onclick = function () {
    const text = document.getElementById("importLogArea").value;
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const events = [];

    for (const line of lines) {
        const m = line.match(/^\[[^\]]+]\s+(append|clear|calculate|undo|redo|backspace)\s?(.*)$/);
        if (m) {
            const type = m[1];
            let value = m[2].trim();
            if (value === "") value = null;
            events.push({ type, value });
        }
    }

    if (events.length) {
        store.clearAll();
        for (const e of events) {
            store.add(new CalculationEvent(e.type, e.value));
        }
        updateDisplay();
        showToast('操作ログから状態を復元しました', 'success');
    } else {
        showToast('有効な操作ログが見つかりませんでした', 'error');
    }
};
```

**機能**: テキスト形式のイベントログを解析して、アプリケーションの状態を完全に復元します。

## Event Sourcingのメリット

### 1. 完全な監査証跡
すべての操作が時系列で記録されるため、「いつ、何が起こったか」を完全に追跡できます。

### 2. Time Travel デバッグ
任意の時点の状態に戻って確認することが可能です。

### 3. 状態の再現性
イベントログを保存しておけば、同じ状態を別の環境で完全に再現できます。

### 4. Undo/Redoの簡単な実装
状態ではなくイベントを管理するため、Undo/Redoが自然に実装できます。

### 5. イベント駆動アーキテクチャとの親和性
イベントベースなので、将来的にリアルタイム同期や分散システムへの拡張が容易です。

## アーキテクチャ図

```
┌─────────────┐
│ ユーザー操作 │
└──────┬──────┘
       │
       v
┌─────────────────────┐
│  CalculationEvent    │ ← イベント生成
│  { type, value }    │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│    EventStore       │ ← イベント保存
│  - events[]         │
│  - add()            │
│  - save()           │
└──────┬──────────────┘
       │              │
       v              v
┌─────────────────────┐   ┌─────────────────────┐
│  SessionStorage     │   │    Expression       │ ← ドメインモデル
└─────────────────────┘   │  - replay()         │
    ↑ 永続化              │  - canUndo()        │
                          │  - canRedo()        │
                          └──────┬──────────────┘
                                 │
                                 v
                          ┌─────────────────────┐
                          │  updateDisplay()    │ ← UI更新
                          └─────────────────────┘
```

**責務の分離**:
- **EventStore**: イベントの永続化（インフラ層）
- **Expression**: 数式のロジック（ドメイン層）
- **各種関数**: UIとの連携（プレゼンテーション層）

## まとめ

この電卓アプリケーションは、Event Sourcingパターンの核心的な概念を実装しています:

1. **イミュータブルなイベントストリーム**: すべての変更をイベントとして記録
2. **状態の再構築**: `Expression.replay()`メソッドによるイベントからの状態復元
3. **監査証跡**: 完全な操作履歴の保持
4. **Time Travel**: Undo/Redo、ログインポートによる状態復元
5. **責務の分離**: EventStore（永続化）とExpression（ドメインロジック）の明確な分離

### リファクタリングの効果

Expressionクラスの導入により、以下のメリットが得られました:

- **単一責任の原則**: EventStoreは永続化のみ、Expressionは数式ロジックのみを担当
- **テスタビリティ**: ドメインロジックが独立し、テストが容易に
- **可読性**: 責務が明確になり、コードの意図が理解しやすく
- **拡張性**: 新しい数式操作を追加する際、Expressionクラスに集約できる

Event Sourcingは、複雑な状態管理やタイムトラベルデバッグが必要なアプリケーションで特に有効なパターンです。また、ドメイン駆動設計（DDD）との組み合わせにより、より保守性の高いコードを実現できます。
