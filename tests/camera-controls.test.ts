import { describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { ArcRotateCamera, Scene, Vector3 } from '../src/babylon';
import { attachCameraControls, cameraAnchorVisible, clearCameraInertia, fitCameraZoom, zoomCamera } from '../src/camera-controls';
import { cameraCopy } from '../src/camera-copy';

function withCamera(check: (camera: ArcRotateCamera) => void) {
  const engine = new NullEngine(), scene = new Scene(engine);
  try { check(new ArcRotateCamera('test', -1.33, 1.16, 40, Vector3.Zero(), scene)); }
  finally { scene.dispose(); engine.dispose(); }
}

describe('shared 3D zoom controls', () => {
  it('allows useful close-ups and bounded wide views', () => withCamera(camera => {
    fitCameraZoom(camera, 40);
    expect(camera.radius).toBe(40); expect(camera.lowerRadiusLimit).toBe(20); expect(camera.upperRadiusLimit).toBe(60);
    zoomCamera(camera, 'in'); expect(camera.radius).toBeCloseTo(40 / 1.2);
    zoomCamera(camera, 'out'); expect(camera.radius).toBeCloseTo(40);
    for (let i = 0; i < 40; i++) zoomCamera(camera, 'in');
    expect(camera.radius).toBe(20);
    for (let i = 0; i < 40; i++) zoomCamera(camera, 'out');
    expect(camera.radius).toBe(60);
  }));
  it('preserves zoom proportion and inertia across orientation and framing changes', () => withCamera(camera => {
    fitCameraZoom(camera, 40); camera.radius = 28; camera.inertialRadiusOffset = 2;
    fitCameraZoom(camera, 70, 40);
    expect(camera.radius).toBeCloseTo(49); expect(camera.inertialRadiusOffset).toBeCloseTo(3.5);
    fitCameraZoom(camera, 40, 70); expect(camera.radius).toBeCloseTo(28);
  }));
  it('enforces a safe minimum and recovers a complete-frame reset', () => withCamera(camera => {
    fitCameraZoom(camera, 25.5); camera.radius = 2;
    fitCameraZoom(camera, 25.5, 25.5); expect(camera.radius).toBe(16);
    fitCameraZoom(camera, 50); expect(camera.radius).toBe(50);
    camera.inertialAlphaOffset = 1; camera.inertialBetaOffset = 1; camera.inertialRadiusOffset = 1;
    camera.inertialPanningX = 1; camera.inertialPanningY = 1; clearCameraInertia(camera);
    expect([camera.inertialAlphaOffset, camera.inertialBetaOffset, camera.inertialRadiusOffset, camera.inertialPanningX, camera.inertialPanningY]).toEqual([0, 0, 0, 0, 0]);
  }));
  it('enables proportional wheel/natural pinch and prevents page scrolling only on the canvas', () => withCamera(camera => {
    const attach = vi.spyOn(camera, 'attachControl').mockImplementation(() => {}), canvas = {} as HTMLCanvasElement;
    attachCameraControls(camera, canvas);
    expect(attach).toHaveBeenCalledWith(canvas, false); expect(camera.wheelDeltaPercentage).toBe(0.025);
    expect(camera.useNaturalPinchZoom).toBe(true); expect(camera.panningSensibility).toBe(0);
  }));
  it('shows projected controls only for anchors inside the camera frame', () => {
    expect(cameraAnchorVisible(30, 40, 0.5, 390, 440)).toBe(true);
    expect(cameraAnchorVisible(0, 440, 1, 390, 440)).toBe(true);
    for (const [x, y, depth] of [[-1, 40, 0.5], [391, 40, 0.5], [30, -1, 0.5], [30, 441, 0.5], [30, 40, -1], [30, 40, 2], [NaN, 40, 0.5], [30, Infinity, 0.5]]) {
      expect(cameraAnchorVisible(x, y, depth, 390, 440)).toBe(false);
    }
  });
  it('has discoverable zoom labels and gesture guidance in all five locales', () => {
    expect(Object.keys(cameraCopy)).toHaveLength(5);
    for (const text of Object.values(cameraCopy)) {
      expect(text.controls.length).toBeGreaterThan(2); expect(text.zoomIn).not.toBe(text.zoomOut);
      expect(text.hint).toContain('+ / −');
    }
  });
});
