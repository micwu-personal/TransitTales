export function needsSafeStartup(device: { userAgent: string; maxTouchPoints: number; coarsePointer: boolean }): boolean {
  // iPad's desktop-site mode can identify itself as a Mac rather than an iPad.
  return /iPad|iPhone|iPod/i.test(device.userAgent) || device.maxTouchPoints > 0 || device.coarsePointer;
}

export function initialUniverseView(safeStartup: boolean, requestedView: string | null): '2d' | '3d' {
  // A saved/shared URL must not repeatedly trigger the expensive GPU startup on a tablet.
  return safeStartup || requestedView === '2d' ? '2d' : '3d';
}
