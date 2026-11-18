import { vi } from 'vitest';

// 测试不触网：node-fetch 默认被替换为一个会抛错的桩，任何意外的真实请求都会立即暴露。
// 需要模拟响应的用例用 vi.mocked(fetch).mockImplementationOnce(...) 覆盖。
vi.mock('node-fetch', () => ({
  default: vi.fn(async () => {
    throw new Error('网络请求在测试中被禁用（node-fetch 已被 mock）');
  })
}));
