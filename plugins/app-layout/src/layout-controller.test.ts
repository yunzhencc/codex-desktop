import { describe, expect, it } from 'vitest';
import { getSidebarBounds, getWorkbenchBounds, getWorkspaceWidth, MAIN_MIN_WIDTH } from './layout-controller';

describe('codex layout constraints', () => {
  it('clamps the sidebar while preserving 240px for the remaining shell', () => {
    expect(getSidebarBounds(1600)).toEqual({ defaultSize: 275, maxSize: 520, minSize: 240 });
    expect(getSidebarBounds(600)).toEqual({ defaultSize: 275, maxSize: 360, minSize: 240 });
  });

  it('keeps the workbench within the Codex regular-workspace bounds', () => {
    expect(getWorkbenchBounds(1000, 600)).toEqual({ defaultSize: 500, maxSize: 648, minSize: 320 });
    expect(getWorkbenchBounds(700, 600)).toEqual({ defaultSize: 320, maxSize: 348, minSize: 320 });
  });

  it('uses the actual sidebar width to reserve the main area', () => {
    const workspaceWidth = getWorkspaceWidth(1200, true, 520);

    expect(workspaceWidth).toBe(680);
    expect(MAIN_MIN_WIDTH).toBe(352);
    expect(getWorkbenchBounds(workspaceWidth, 600).maxSize).toBe(328);
  });
});
