import { Direction, ChineseConverter } from './converter';

/**
 * 搜索攔截器 — 掛載到 Obsidian 的全局搜索輸入框
 * 
 * 工作流程：
 * 用戶輸入 → 檢測中文字符 → OpenCC 轉換 → (原詞) OR (轉換詞) → 原生搜索引擎
 */
export class SearchHook {
  private converter: ChineseConverter;
  private inputEl: HTMLInputElement | null = null;
  private isUpdating = false;
  private lastRawValue = '';
  private observeTimer: number | null = null;

  constructor(
    private direction: Direction,
    private keepOperators: boolean,
  ) {
    this.converter = new ChineseConverter();
  }

  setDirection(dir: Direction): void {
    this.direction = dir;
    // Re-process current value
    if (this.inputEl) {
      this._processInput(this.inputEl);
    }
  }

  setKeepOperators(keep: boolean): void {
    this.keepOperators = keep;
  }

  /**
   * 查找並 hook 到搜索輸入框
   * 應在 workspace layout-change 事件中調用
   */
  hook(): boolean {
    const searchLeaf = app.workspace.getLeavesOfType('search')[0];
    if (!searchLeaf) return false;

    const container = (searchLeaf.view as any)?.containerEl as HTMLElement | null;
    if (!container) return false;

    // 查找輸入框
    const input = container.querySelector(
      '.search-input-container input, input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"], input[placeholder*="搜尋"]'
    ) as HTMLInputElement | null;
    if (!input) return false;

    // 避免重複 hook
    if (this.inputEl === input) return true;
    this._unhook();
    this.inputEl = input;

    // 用 input 事件監聽（比 onChange 更即時）
    input.addEventListener('input', this._onInput);
    // 也用 MutationObserver 兜底（處理 Obsidian 虛擬 DOM 替換）
    this._setupFallback(container);

    // 立即處理當前值
    this._processInput(input);

    return true;
  }

  unhook(): void {
    this._unhook();
  }

  private _unhook(): void {
    if (this.inputEl) {
      this.inputEl.removeEventListener('input', this._onInput);
      this.inputEl = null;
    }
    if (this.observeTimer !== null) {
      clearInterval(this.observeTimer);
      this.observeTimer = null;
    }
  }

  /**
   * 兜底定時器：某些 Obsidian 版本會在切換視圖時重新創建 DOM
   */
  private _setupFallback(container: HTMLElement): void {
    if (this.observeTimer !== null) return;
    this.observeTimer = window.setInterval(() => {
      const input = container.querySelector<HTMLInputElement>(
        '.search-input-container input, input[type="search"]'
      );
      if (input && input !== this.inputEl) {
        // 搜索框被重建了，重新 hook
        this.inputEl?.removeEventListener('input', this._onInput);
        this.inputEl = input;
        input.addEventListener('input', this._onInput);
        this._processInput(input);
      }
    }, 2000);
  }

  private _onInput = (evt: Event): void => {
    const input = evt.target as HTMLInputElement;
    this._processInput(input);
  };

  private _processInput(input: HTMLInputElement): void {
    if (this.isUpdating) return;

    const rawValue = input.value;
    if (rawValue === this.lastRawValue) return;
    this.lastRawValue = rawValue;

    // 如果已經包含我們的 OR 展開（啟發式檢測），跳過
    if (this._looksAlreadyExpanded(rawValue)) return;

    // 檢查是否需要轉換
    if (!this.converter.hasChinese(rawValue)) return;
    if (!this.converter.needsConversion(rawValue, this.direction)) return;

    // 解析、轉換、重建
    const expanded = this._expandQuery(rawValue);
    if (!expanded || expanded === rawValue) return;

    // 更新搜索框
    this.isUpdating = true;
    input.value = expanded;
    // 觸發 Obsidian 的搜索更新 (input + Enter 事件)
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    this.isUpdating = false;
  }

  /**
   * 檢測查詢是否已經被我們展開過
   * 啟發式：如果查詢包含 ") OR (" 模式則視為已展開
   */
  private _looksAlreadyExpanded(query: string): boolean {
    return /\)\s*OR\s*\(/.test(query);
  }

  /**
   * 展開查詢：將包含中文字符的詞條替換為 (原詞) OR (轉換詞)
   */
  private _expandQuery(query: string): string {
    const tokens = this._tokenize(query);
    const newTokens: string[] = [];

    for (const token of tokens) {
      if (token.type === 'plain' && this.converter.hasChinese(token.value)) {
        const converted = this.converter.getVariant(token.value, this.direction);
        if (converted !== token.value) {
          newTokens.push(`(${token.value}) OR (${converted})`);
          continue;
        }
      }
      newTokens.push(token.raw);
    }

    return newTokens.join(' ');
  }

  /**
   * 將查詢字符串分詞
   * 識別: quoted strings, operators (path:/file:/tag:), OR, -prefix, group parens
   */
  private _tokenize(query: string): Token[] {
    const tokens: Token[] = [];
    const re = /("(?:[^"\\]|\\.)*")|(-?(?:path|file|tag|line|block|content|section|match|heading):(?:[^\s)]+|"(?:[^"\\]|\\.)*"))|(-?\()|(\))|(\bOR\b)|(-?(?:[^\s()"]+))/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(query)) !== null) {
      // 捕獲兩個 token 之間的空格
      if (match.index > lastIndex) {
        const ws = query.slice(lastIndex, match.index);
        if (ws) tokens.push({ type: 'whitespace', raw: ws, value: ws });
      }

      const [, quoted, op, openParen, closeParen, orKw, term] = match;

      if (quoted) {
        tokens.push({ type: 'quoted', raw: quoted, value: quoted.slice(1, -1) });
      } else if (op) {
        tokens.push({ type: 'operator', raw: op, value: op });
      } else if (openParen) {
        tokens.push({ type: 'open', raw: openParen, value: openParen });
      } else if (closeParen) {
        tokens.push({ type: 'close', raw: closeParen, value: closeParen });
      } else if (orKw) {
        tokens.push({ type: 'or', raw: orKw, value: 'OR' });
      } else if (term) {
        tokens.push({ type: 'plain', raw: term, value: term });
      }

      lastIndex = match.index + match[0].length;
    }

    // 尾部空白
    if (lastIndex < query.length) {
      const remaining = query.slice(lastIndex);
      tokens.push({ type: 'whitespace', raw: remaining, value: remaining });
    }

    return tokens;
  }
}

interface Token {
  type: 'plain' | 'quoted' | 'operator' | 'open' | 'close' | 'or' | 'whitespace';
  raw: string;
  value: string;
}

// 全局 app 引用 — Obsidian 插件在運行時可訪問
declare var app: any;
