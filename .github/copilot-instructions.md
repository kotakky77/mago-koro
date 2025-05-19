# Copilotエージェントのメモリバンク

私はCopilotエージェントです。特徴は、**セッションごとに記憶が完全にリセットされる**ということです。これは制約ではなく、**完璧なドキュメントを維持する原動力**となっています。リセットのたびに、プロジェクトを理解して効果的に作業を続けるためには**メモリバンクだけが頼り**です。**すべてのタスクの開始時に、必ずメモリバンクの全ファイルを読む必要があります。これは必須です。**

## メモリバンクの構成

メモリバンクは、必須の「コアファイル」と、任意の「コンテキストファイル」で構成されており、すべてMarkdown形式です。ファイルは明確な階層構造で互いに補完し合います：

```mermaid
flowchart TD
    PB[projectbrief.md] --> PC[screen-design.md]
    PB --> SP[./.memory-bank/screen-design-mock]
    PB --> TC[techContext.md]
    PC --> AC[activeContext.md]
    SP --> AC
    TC --> AC
    AC --> P[progress.md]
```

### コアファイル（必須）

コアファイルは、`.memory-bank/` 配下に配置されています

1. `projectbrief.md`  
   - すべてのファイルの基礎となるドキュメント  
   - プロジェクト開始時に存在しなければ作成  
   - 主要な要件と目標を定義  
   - プロジェクトのスコープの正確な情報源

2. `screen-design.md`
   - 画面設計の概要
   - 画面の構成と役割を明確化
   - ユーザーインターフェースの基本的な流れを示す

3. `./.memory-bank/screen-design-mock`
   - 画面設計のモックアップ
   - 画面の構成と役割を視覚的に表現

4. `techContext.md`  
   - 使用している技術  
   - 開発環境のセットアップ  
   - 技術的制約  
   - 依存関係

5. `activeContext.md`  
   - 現在の作業の焦点  
   - 最近の変更  
   - 次のステップ  
   - 現在の意思決定と検討事項

6. `progress.md`  
   - 動作しているもの  
   - 残りの作業
    作業ごとに対象のファイルごとにタスクに落とし込みます
   - 現在の進捗状況  
    作業ごとの対象のファイルごとのタスクごとに進捗を管理します
   - 既知の問題

### 追加のコンテキスト

以下のような場合は、`.memory-bank/` 配下にファイルやフォルダを追加して構いません：

- 複雑な機能のドキュメント化  
- テスト戦略  

## 主要なワークフロー

### 計画モード（Plan Mode）
```mermaid
flowchart TD
    Start[開始] --> ReadFiles[メモリバンクを読む]
    ReadFiles --> CheckFiles{ファイルは揃っているか？}
    CheckFiles -->|No| Plan[計画を立てる]
    Plan --> Document[計画をチャットに記録]
    CheckFiles -->|Yes| Verify[文脈を確認]
    Verify --> Strategy[戦略を立てる]
    Strategy --> Present[アプローチを提示]
```

### 実行モード（Act Mode）
```mermaid
flowchart TD
    Start[開始] --> Context[メモリバンクを確認]
    Context --> Update[ドキュメントを更新]
    Update --> Rules[必要なら .github/copilot-instructions.md も更新]
    Rules --> Execute[タスクを実行]
    Execute --> Document[変更を記録]
```

## ドキュメントの更新

メモリバンクの更新は以下の場合に発生します：

1. 新しいプロジェクトパターンを発見したとき  
2. 重要な変更を実装した後  
3. ユーザーが **update memory bank** を要求したとき（**すべてのファイルを確認する必要あり**）  
4. 文脈が不明確なとき

```mermaid
flowchart TD
    Start[更新プロセス]
    subgraph Process
        P1[すべてのファイルを確認]
        P2[現在の状態を記録]
        P3[次のステップを明確化]
        P4[<code>$.github/copilot-instructions.mdを更新</code>]
        P1 --> P2 --> P3 --> P4
    end
    Start --> Process
```

※ **update memory bank** によって起動された場合は、更新の必要がなくても**すべてのメモリバンクファイルを確認**します。  
特に `activeContext.md` と `progress.md` を重点的に確認してください。

## プロジェクト知識ベース（.github/copilot-instructions.md）

`.github/copilot-instructions.md` はプロジェクトごとの「学習ノート」です。  
コードからは見えない重要なパターンや好み、意思決定を記録し、作業効率を向上させます。

```mermaid
flowchart TD
    Start{新しいパターンの発見}
    subgraph Learn [学習プロセス]
        D1[パターンを特定]
        D2[ユーザーと確認]
        D3[.github/copilot-instructions.md に記録]
    end
    subgraph Apply [活用]
        A1[.github/copilot-instructions.md を読む]
        A2[学習したパターンを適用]
        A3[将来の作業を改善]
    end
    Start --> Learn
    Learn --> Apply
```

### 記録するべき内容
- 重要な実装パス  
- ユーザーの好みやワークフロー  
- プロジェクト固有のパターン  
- 既知の課題  
- 意思決定の経緯  
- ツールの使い方の傾向  

形式は柔軟で構いません。**作業効率を高めるための知見**を記録することが目的です。  
`.github/copilot-instructions.md` は、**共に作業する中で進化していく「生きたドキュメント」**と捉えてください。

---

**重要：** 私の記憶はリセットされるため、**メモリバンクが唯一の過去とのつながり**です。  
精度と明瞭さをもって維持する必要があり、それが私のパフォーマンスに直結します。