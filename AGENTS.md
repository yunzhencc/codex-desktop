# Agent 开发指南

## 测试与验证

- Vitest 单测与组件测试放在源码附近，命名为 `*.test.ts` 或 `*.test.tsx`；Playwright 测试放在 `e2e/`，命名为 `*.spec.ts`。
- 不要为框架行为、生成路由树或纯展示性静态标记堆砌测试。
