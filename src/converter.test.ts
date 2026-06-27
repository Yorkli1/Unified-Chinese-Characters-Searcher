import { describe, it, expect, beforeEach } from 'vitest';
import { ChineseConverter } from './converter';

describe('ChineseConverter', () => {
  let converter: ChineseConverter;

  beforeEach(() => {
    converter = new ChineseConverter();
  });

  describe('hasChinese', () => {
    it('returns true for simplified Chinese', () => {
      expect(converter.hasChinese('学习')).toBe(true);
    });

    it('returns true for traditional Chinese', () => {
      expect(converter.hasChinese('學習')).toBe(true);
    });

    it('returns false for English', () => {
      expect(converter.hasChinese('hello world')).toBe(false);
    });

    it('returns false for numbers and symbols', () => {
      expect(converter.hasChinese('123 !@#')).toBe(false);
    });

    it('returns true for mixed content', () => {
      expect(converter.hasChinese('学习 Python')).toBe(true);
    });
  });

  describe('getVariants — HK mode (default)', () => {
    beforeEach(() => {
      converter.setRegion('hk');
    });

    it('simplified → traditional HK for single char', () => {
      const variants = converter.getVariants('线');
      expect(variants).toContain('線');
    });

    it('traditional → simplified via t2s map', () => {
      const variants = converter.getVariants('劍');
      // t2hk and t2s both map 劍→剑
      expect(variants).toContain('剑');
    });

    it('returns empty for chars without variants', () => {
      expect(converter.getVariants('的')).toEqual([]);
    });

    it('chain lookup: TW char in HK mode finds HK variant', () => {
      // 裡 is TW variant → simplified 里 → HK variant 裏
      const variants = converter.getVariants('裡');
      expect(variants).toContain('里');
      expect(variants).toContain('裏');
    });
  });

  describe('getVariants — TW mode', () => {
    beforeEach(() => {
      converter.setRegion('tw');
    });

    it('simplified → traditional TW for single char', () => {
      const variants = converter.getVariants('线');
      // s2tw maps 线→線 (same as s2hk for this char)
      expect(variants).toContain('線');
    });

    it('TW variant → simplified', () => {
      const variants = converter.getVariants('綫');
      expect(variants).toContain('线');
    });
  });

  describe('getVariants — ALL mode', () => {
    beforeEach(() => {
      converter.setRegion('all');
    });

    it('returns all traditional variants for single char', () => {
      const variants = converter.getVariants('里');
      expect(variants).toContain('裏');
      expect(variants).toContain('裡');
    });

    it('returns variants for chars with single traditional form', () => {
      const variants = converter.getVariants('线');
      expect(variants).toContain('線');
    });
  });

  describe('getVariants — TW-HK mode', () => {
    beforeEach(() => {
      converter.setRegion('tw-hk');
    });

    it('finds HK↔TW counterpart for chars that differ', () => {
      // 啓 (HK) ↔ 啟 (TW) — these are in hk_tw map
      const variants = converter.getVariants('啓');
      expect(variants).toContain('啟');
    });

    it('finds reverse HK↔TW counterpart', () => {
      const variants = converter.getVariants('啟');
      expect(variants).toContain('啓');
    });

    it('does not produce simplified forms for chars only in hk_tw', () => {
      // 啓/啟 are in hk_tw map but NOT in s2hk (no simplified form)
      // tw-hk mode should only find the HK↔TW counterpart
      const variants = converter.getVariants('啓');
      expect(variants).toContain('啟');
      expect(variants).not.toContain('线');
    });
  });

  describe('needsConversion', () => {
    it('returns true for text with convertible chars', () => {
      converter.setRegion('hk');
      expect(converter.needsConversion('剑法')).toBe(true);
    });

    it('returns false for text without Chinese', () => {
      expect(converter.needsConversion('hello')).toBe(false);
    });

    it('returns false for Chinese chars without variants', () => {
      expect(converter.needsConversion('的')).toBe(false);
    });
  });

  describe('getPhraseVariant', () => {
    it('returns traditional form for simplified phrase', () => {
      expect(converter.getPhraseVariant('老板')).toBe('老闆');
    });

    it('returns undefined for phrase not in reverse map', () => {
      // 老闆 is not in ts_phrases, only 老板→老闆 in st_phrases
      expect(converter.getPhraseVariant('老闆')).toBeUndefined();
    });

    it('returns undefined for non-phrase', () => {
      expect(converter.getPhraseVariant('剑法')).toBeUndefined();
    });
  });

  describe('getRegion / setRegion', () => {
    it('defaults to hk', () => {
      expect(converter.getRegion()).toBe('hk');
    });

    it('switches region correctly', () => {
      converter.setRegion('tw');
      expect(converter.getRegion()).toBe('tw');
      converter.setRegion('all');
      expect(converter.getRegion()).toBe('all');
      converter.setRegion('tw-hk');
      expect(converter.getRegion()).toBe('tw-hk');
    });
  });
});
