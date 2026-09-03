class TestResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}

  disconnect() {}
  observe() {}
  unobserve() {}
}

if (!globalThis.ResizeObserver)
  globalThis.ResizeObserver = TestResizeObserver as typeof ResizeObserver;
