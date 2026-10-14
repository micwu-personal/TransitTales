import type { ArcRotateCamera } from './babylon';

export interface CameraControls {
  resetCamera(): void;
  zoomCamera(direction: 'in' | 'out'): void;
}

export function cameraAnchorVisible(x: number, y: number, depth: number, width: number, height: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y) && depth >= 0 && depth <= 1
    && x >= 0 && x <= width && y >= 0 && y <= height;
}

export function clearCameraInertia(camera: ArcRotateCamera): void {
  camera.inertialAlphaOffset = 0; camera.inertialBetaOffset = 0; camera.inertialRadiusOffset = 0;
  camera.inertialPanningX = 0; camera.inertialPanningY = 0;
}

// Preserve magnification rather than a pixel/radius offset when the viewport or orbit changes.
export function fitCameraZoom(camera: ArcRotateCamera, reference: number, previous = 0): void {
  const ratio = previous > 0 ? camera.radius / previous : 1;
  camera.lowerRadiusLimit = Math.max(16, reference * 0.5);
  camera.upperRadiusLimit = reference * 1.5;
  camera.radius = Math.max(camera.lowerRadiusLimit, Math.min(camera.upperRadiusLimit, reference * ratio));
  if (previous > 0) camera.inertialRadiusOffset *= reference / previous;
}

export function zoomCamera(camera: ArcRotateCamera, direction: 'in' | 'out'): void {
  camera.inertialRadiusOffset = 0;
  camera.radius = Math.max(camera.lowerRadiusLimit ?? 16,
    Math.min(camera.upperRadiusLimit ?? Infinity, camera.radius * (direction === 'in' ? 1 / 1.2 : 1.2)));
}

export function attachCameraControls(camera: ArcRotateCamera, canvas: HTMLCanvasElement): void {
  camera.panningSensibility = 0;
  camera.wheelDeltaPercentage = 0.025;
  camera.useNaturalPinchZoom = true;
  camera.inertia = 0.65;
  camera.attachControl(canvas, false);
}
