import { App, PluginSettingTab, Setting } from 'obsidian';
import type STSearchPlugin from './main';

export interface STSearchSettings {
  /** 轉換方向 */
  direction: 's2t' | 't2s' | 'bidirectional';
  /** 是否啟用 */
  enabled: boolean;
  /** 是否保留運算符不轉換 */
  keepOperators: boolean;
  /** 隱式模式：搜索欄仍顯示原詞，但結果包含繁簡 */
  silentMode: boolean;
  /** 展開防抖延遲（毫秒） */
  debounceMs: number;
}

export const DEFAULT_SETTINGS: STSearchSettings = {
  direction: 'bidirectional',
  enabled: true,
  keepOperators: true,
  silentMode: false,
  debounceMs: 800,
};

export class STSearchSettingTab extends PluginSettingTab {
  private plugin: STSearchPlugin;

  constructor(app: App, plugin: STSearchPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── 頁面標題 ──
    containerEl.createEl('h2', {
      text: 'Simplified–Traditional Search',
    });
    containerEl.createEl('p', {
      text: '在 Obsidian 全局搜索中自動匹配簡體與繁體中文，讓你輸入任何一種寫法都能找到所有結果。',
      cls: 'setting-item-description',
    });

    // ── 插件狀態條 ──
    const statusBar = containerEl.createEl('div', {
      cls: 'setting-item',
    });
    const statusText = statusBar.createEl('span', {
      text: this.plugin.settings.enabled ? '● 插件運行中' : '○ 插件已停用',
    });
    statusText.style.cssText = `
      font-weight: 600;
      color: ${this.plugin.settings.enabled ? 'var(--color-green, #4caf50)' : 'var(--color-red, #f44336)'};
      padding: 8px 0;
      display: inline-block;
    `;

    // ════════════════════════════════════════
    //  基本設置
    // ════════════════════════════════════════
    containerEl.createEl('h3', { text: '基本設置' });

    new Setting(containerEl)
      .setName('啟用插件')
      .setDesc('關閉後插件不影響搜索行為，所有設置保留。')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enabled)
          .onChange(async value => {
            this.plugin.settings.enabled = value;
            await this.plugin.saveSettings();
            this.plugin.reevaluate();
            // 刷新頁面以更新狀態條
            this.display();
          })
      );

    new Setting(containerEl)
      .setName('轉換方向')
      .setDesc('選擇搜索時如何匹配繁簡中文。')
      .addDropdown(dropdown =>
        dropdown
          .addOption('bidirectional', '雙向匹配 ⭐ 推薦')
          .addOption('s2t', '簡體→繁體（搜「剑」找「劍」）')
          .addOption('t2s', '繁體→簡體（搜「劍」找「剑」）')
          .setValue(this.plugin.settings.direction)
          .onChange(async value => {
            this.plugin.settings.direction = value as 's2t' | 't2s' | 'bidirectional';
            await this.plugin.saveSettings();
            this.plugin.reevaluate();
          })
      );

    new Setting(containerEl)
      .setName('保留搜索運算符')
      .setDesc('開啟後 path:、tag:、file: 等運算符後的值也會被轉換。')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.keepOperators)
          .onChange(async value => {
            this.plugin.settings.keepOperators = value;
            await this.plugin.saveSettings();
            this.plugin.reevaluate();
          })
      );

    // ════════════════════════════════════════
    //  顯示與行為
    // ════════════════════════════════════════
    containerEl.createEl('h3', { text: '顯示與行為' });

    new Setting(containerEl)
      .setName('隱式模式')
      .setDesc('搜索欄只顯示你輸入的原文（如「剑」），不顯示展開結果。搜索結果仍會同時包含繁簡匹配。')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.silentMode)
          .onChange(async value => {
            this.plugin.settings.silentMode = value;
            await this.plugin.saveSettings();
            this.plugin.reevaluate();
          })
      );

    new Setting(containerEl)
      .setName('展開延遲')
      .setDesc('打字結束後等待多少毫秒再展開查詢。數值越小展開越快，但容易在打字中途誤展開。推薦 600–1000ms。')
      .addSlider(slider =>
        slider
          .setLimits(200, 2000, 100)
          .setValue(this.plugin.settings.debounceMs)
          .setDynamicTooltip()
          .onChange(async value => {
            this.plugin.settings.debounceMs = value;
            await this.plugin.saveSettings();
            this.plugin.reevaluate();
          })
      );

    // ════════════════════════════════════════
    //  關於
    // ════════════════════════════════════════
    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: '關於' });

    const about = containerEl.createEl('div', { cls: 'setting-item' });
    about.createEl('p', {
      text: '字符映射表基於 OpenCC（開放中文轉換）官方數據，包含 4,011 個簡→繁及 4,142 個繁→簡字符映射。',
    });
    about.createEl('p', {
      text: '插件僅處理字對字轉換，不含短語/慣用語層級。完全離線運行，零外部請求。',
    });

    const githubLink = about.createEl('a', {
      text: '📦 GitHub 原始碼',
      href: 'https://github.com/Yorkli1/obsidian-simplified-traditional-search',
    });
    githubLink.style.cssText = `
      display: inline-block;
      margin-top: 4px;
      color: var(--text-accent);
    `;

    // ── 使用範例 ──
    containerEl.createEl('h3', { text: '使用範例' });

    const examples = containerEl.createEl('div', { cls: 'setting-item' });
    examples.createEl('p', { text: '在全局搜索（Cmd+Shift+F）中輸入：' });

    const exampleList = examples.createEl('ul');
    const addExample = (input: string, result: string) => {
      const li = exampleList.createEl('li');
      li.createEl('code', { text: input });
      li.appendText(' → ');
      li.createEl('code', { text: result });
    };

    addExample('剑', '(剑) OR (劍)');
    addExample('剑法', '(剑法) OR (劍法)');
    addExample('龍門', '(龍門) OR (龙门)');
    addExample('學習 Python', '(學習) OR (学习) Python');

    examples.createEl('p', {
      text: '連續打字時插件會等你停頓後再展開，不用擔心打到一半被打斷。',
    });
    examples.createEl('p', {
      text: '展開後可以繼續追加文字，插件會自動重新整理為完整的繁簡查詢。',
    });
  }
}
