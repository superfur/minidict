// node-fetch v3 是纯 ESM，jest 直接加载会失败。测试不触网，
// 这里提供一个会抛错的桩，确保任何意外的真实请求都会被立即发现。
const fetch = async (): Promise<never> => {
  throw new Error('网络请求在测试中被禁用（node-fetch 已被 mock）');
};

export default fetch;
