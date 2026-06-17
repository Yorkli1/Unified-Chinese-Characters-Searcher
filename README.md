# 統一中文搜索工具

> **Unified Chinese Search — 在 Obsidian 全局搜索中自動匹配多種地區的中文，讓你輸入任何一個中文字都能找到所有對應中文的結果**

![Obsidian](https://img.shields.io/badge/Obsidian-Plugin-7C3AED?logo=obsidian)
![Version](https://img.shields.io/github/v/release/Yorkli1/obsidian-simplified-traditional-search)
![License](https://img.shields.io/badge/License-MIT-yellow)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-FF5E5B?logo=ko-fi)](https://ko-fi.com/omgyork)

---

## 功能

當你在 Obsidian 全局搜索（`Cmd+Shift+F`）中輸入關鍵詞時，插件會自動將中文字符擴展為**簡體 + 繁體**兩種寫法，確保不漏掉任何筆記。

| 輸入 | 實際搜索 | 匹配結果 |
|------|---------|---------|
| `剑法` | `(剑法) OR (劍法)` | 同時命中「剑法」和「劍法」 |
| `龍門` | `(龍門) OR (龙门)` | 同時命中兩種寫法 |
| `學習 Python` | `(學習) OR (学习) Python` | 英文保持不變 |

## 安裝

1. 下載最新的 [Release](https://github.com/Yorkli1/obsidian-simplified-traditional-search/releases)
2. 解壓到你的 vault：`.obsidian/plugins/simplified-traditional-search/`
3. Obsidian → 設定 → 第三方插件 → **重新載入插件**
4. 啟用 **Simplified-Traditional Search**

## 設定

| 選項 | 說明 |
|------|------|
| **啟用插件** | 一鍵開關 |
| **簡化搜索欄模式** | 搜索欄只顯示你輸入的原文，不顯示展開結果 |
| **展開延遲** | 打字停頓後多少毫秒展開（預設 800ms） |
| **轉換運算符值** | 是否同時轉換 `path:`、`tag:` 等運算符後的值 |

匹配方式固定為**雙向**：不論用簡體還是繁體搜索，結果都包含兩種寫法。

## 工作原理

```
你打字: 杖与剑的魔剑谭
  │
  ▼
┌─ 安全檢查 ─────────────────┐
│ 值有變化? 是                │
│ 不是退格? 是                │
│ 游標在末尾? 是              │
│ 沒有括號? 是               │
│ 輸入法已確認? 是            │
│ 有中文? 是                 │
│ 需要轉換? 是               │
└─────────────────────────────┘
  │
  ▼
┌─ 防抖 800ms ⏱ ───────────┐
│ 打字中... 重置計時器        │
│ 停頓！展開                 │
└─────────────────────────────┘
  │
  ▼
展開: (杖与剑的魔剑谭) OR (杖與劍的魔劍譚)
  │
  ▼
Obsidian 原生搜索引擎 → 同時命中簡繁結果 ✅
```

展開後若繼續追加文字，插件會自動剝離舊展開、重新等待防抖後再次展開。

## 技術要點

- **字符級轉換** — 4011 個簡→繁 + 4142 個繁→簡映射，源於 [OpenCC](https://github.com/BYVoid/OpenCC) 官方數據
- **防抖展開** — 等用戶停頓後再展開，避免打字中途打斷
- **IME 感知** — 輸入法組合期間不處理，避免拼音/雙拼未選字時誤展開
- **括號檢測** — 展開後的查詢帶括號，插件自動跳過不重複處理
- **展開剝離** — 展開後追加文字會自動還原為純文本重新展開
- **零運行時依賴** — 映射數據直接打包進插件，完全離線運行

## 開發

```bash
git clone https://github.com/Yorkli1/obsidian-simplified-traditional-search.git
cd obsidian-simplified-traditional-search
npm install
npm run dev      # 開發模式（watch）
npm run build    # 生產構建
```

字符映射表從 OpenCC 官方數據庫生成：
```bash
python3 scripts/gen_mappings.py
```

## 支持

如果你覺得這個插件有用，歡迎請我喝杯咖啡 ☕

[![Ko-fi](https://img.shields.io/badge/Ko--fi-請我喝咖啡-FF5E5B?logo=ko-fi)](https://ko-fi.com/omgyork)

## 許可證

MIT License。字符映射數據源於 [OpenCC](https://github.com/BYVoid/OpenCC)（Apache-2.0 License）。
