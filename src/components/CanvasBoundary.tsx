import { Component, type ReactNode } from 'react';

/** 3D 畫布的錯誤邊界：WebGL 無法建立或執行失敗時，顯示提示而不是整頁空白 */
export class CanvasBoundary extends Component<{ children: ReactNode; label?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.error('[3D]', err); }
  render() {
    if (this.state.failed) {
      return (
        <div className="canvas-fallback">
          <p>{this.props.label ?? '此裝置無法顯示 3D 場景'}</p>
          <small>請確認瀏覽器已開啟硬體加速（WebGL），或改用目錄瀏覽作品。</small>
        </div>
      );
    }
    return this.props.children;
  }
}
