import type { Point, WorkArea } from "./types";

type WindowModule = typeof import("@tauri-apps/api/window");
type DesktopWindow = ReturnType<WindowModule["getCurrentWindow"]>;
type Invoke = typeof import("@tauri-apps/api/core").invoke;

class DesktopBridge {
  readonly isTauri = "__TAURI_INTERNALS__" in window;
  private api: WindowModule | null = null;
  private appWindow: DesktopWindow | null = null;
  private moving = false;
  private queuedPosition: Point | null = null;
  private cursorPosition: Point | null = null;
  private invoke: Invoke | null = null;

  async initialize(): Promise<void> {
    if (!this.isTauri) return;

    this.api = await import("@tauri-apps/api/window");
    this.invoke = (await import("@tauri-apps/api/core")).invoke;
    this.appWindow = this.api.getCurrentWindow();
    await this.appWindow.setAlwaysOnTop(true);
    window.setInterval(() => void this.pollCursorPosition(), 80);
  }

  async getWorkArea(): Promise<WorkArea> {
    if (!this.appWindow || !this.api) {
      return {
        x: 0,
        y: 0,
        width: window.screen.availWidth || window.innerWidth,
        height: window.screen.availHeight || window.innerHeight,
      };
    }

    const monitor =
      (await this.api.currentMonitor()) ??
      (await this.api.primaryMonitor());

    if (!monitor) {
      return {
        x: 0,
        y: 0,
        width: window.screen.availWidth,
        height: window.screen.availHeight,
      };
    }

    const scale = await this.appWindow.scaleFactor();
    const position = monitor.workArea.position.toLogical(scale);
    const size = monitor.workArea.size.toLogical(scale);

    return {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    };
  }

  async getPosition(): Promise<Point> {
    if (!this.appWindow) return { x: 0, y: 0 };

    const scale = await this.appWindow.scaleFactor();
    const position = (await this.appWindow.outerPosition()).toLogical(scale);
    return { x: position.x, y: position.y };
  }

  queuePosition(position: Point): void {
    if (!this.appWindow || !this.api) return;
    this.queuedPosition = position;
    void this.flushPosition();
  }

  private async flushPosition(): Promise<void> {
    if (this.moving || !this.appWindow || !this.api) return;

    this.moving = true;

    try {
      while (this.queuedPosition) {
        const next = this.queuedPosition;
        this.queuedPosition = null;
        await this.appWindow.setPosition(
          new this.api.LogicalPosition(
            Math.round(next.x),
            Math.round(next.y),
          ),
        );
      }
    } finally {
      this.moving = false;
    }
  }

  async setAlwaysOnTop(enabled: boolean): Promise<void> {
    await this.appWindow?.setAlwaysOnTop(enabled);
  }

  getCursorPosition(): Point | null {
    return this.cursorPosition;
  }

  async setCursorVisible(visible: boolean): Promise<void> {
    await this.appWindow?.setCursorVisible(visible);
  }

  private async pollCursorPosition(): Promise<void> {
    if (!this.invoke) return;
    try {
      this.cursorPosition = await this.invoke<Point>(
        "global_cursor_position",
      );
    } catch {
      this.cursorPosition = null;
    }
  }

  async close(): Promise<void> {
    if (this.appWindow) {
      await this.appWindow.close();
    } else {
      window.close();
    }
  }
}

export const desktop = new DesktopBridge();
