import { Button } from '@/components/ui/button';

function App() {
  return (
    <main className="relative min-h-svh">
      <header data-tauri-drag-region className="absolute inset-x-0 top-0 z-10 h-12" />
      <div className="container">
        <h1>Welcome to Tauri + React</h1>
        <Button>测试按钮</Button>
      </div>
    </main>
  );
}

export default App;
