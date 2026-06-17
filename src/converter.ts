import s2tData from './data/s2t.json';
import t2sData from './data/t2s.json';

export type Direction = 's2t' | 't2s' | 'bidirectional';

/**
 * 字符級繁簡轉換引擎
 * 純字對字轉換，不含短語/慣用語
 */
export class ChineseConverter {
  private s2tMap: Map<string, string>;
  private t2sMap: Map<string, string>;

  constructor() {
    this.s2tMap = new Map(Object.entries(s2tData));
    this.t2sMap = new Map(Object.entries(t2sData));
  }

  /**
   * 根據指定方向轉換字符串中的中文字符
   */
  convert(text: string, direction: Direction): string {
    switch (direction) {
      case 's2t':
        return this._convertWithMap(text, this.s2tMap);
      case 't2s':
        return this._convertWithMap(text, this.t2sMap);
      case 'bidirectional':
        return this._convertWithMap(text, this.s2tMap);
    }
  }

  /**
   * 獲取文本中中文字符的另一種寫法（簡/繁）
   * 返回轉換後的完整字符串
   */
  getVariant(text: string, direction: Direction): string {
    return this.convert(text, direction);
  }

  /**
   * 判斷字符串是否包含中文字符
   */
  hasChinese(text: string): boolean {
    return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text);
  }

  /**
   * 判斷字符串是否需要轉換（包含可轉換的中文字符）
   */
  needsConversion(text: string, direction: Direction): boolean {
    const map = direction === 't2s' ? this.t2sMap : this.s2tMap;
    for (const ch of text) {
      if (map.has(ch)) return true;
    }
    return false;
  }

  private _convertWithMap(text: string, map: Map<string, string>): string {
    let result = '';
    for (const ch of text) {
      result += map.get(ch) ?? ch;
    }
    return result;
  }
}
