import { getConfig, updateConfig } from '../../src/utils/config';

describe('Config', () => {
  beforeEach(() => {
    // 重置配置为默认值
    updateConfig({
      plugins: ['google'],
      showPhonetic: true,
      showExamples: true,
      maxExamples: 3
    });
  });

  it('should return default config', () => {
    const config = getConfig();
    expect(config).toBeDefined();
    expect(config.plugins).toContain('google');
    expect(config.showPhonetic).toBe(true);
    expect(config.showExamples).toBe(true);
    expect(config.maxExamples).toBe(3);
  });

  it('should update config', () => {
    const newConfig = {
      plugins: ['bing'],
      showPhonetic: false,
      maxExamples: 5
    };
    updateConfig(newConfig);
    const config = getConfig();
    expect(config.plugins).toContain('bing');
    expect(config.showPhonetic).toBe(false);
    expect(config.maxExamples).toBe(5);
  });

  it('should handle partial config updates', () => {
    const originalConfig = getConfig();
    const partialUpdate = {
      showPhonetic: false
    };
    updateConfig(partialUpdate);
    const updatedConfig = getConfig();
    expect(updatedConfig.showPhonetic).toBe(false);
    expect(updatedConfig.plugins).toEqual(originalConfig.plugins);
    expect(updatedConfig.maxExamples).toBe(originalConfig.maxExamples);
  });
}); 