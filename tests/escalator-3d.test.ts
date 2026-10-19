import { describe, expect, it, vi } from 'vitest';
import { ArcRotateCamera, Mesh, Scene, Vector3 } from '../src/babylon';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { create3dRenderer, isConstructionTap, layout3dLabels, mallCameraRadius, mallPoint3d, mallStaticSignature } from '../src/escalator/renderer3d';
import { createBoard, verifiedSolution } from '../src/escalator/model';
import { PUZZLES } from '../src/escalator/puzzles';
import { snapshot } from '../src/escalator/view';

const view = () => snapshot(PUZZLES[0], createBoard(), null, 'en', null, null, true, false, false);

describe('3D mall adapter helpers', () => {
  it('preserves seven columns, four floors, and fractional shopper travel', () => {
    const left = mallPoint3d({ x: 0, y: 0 }), right = mallPoint3d({ x: 6, y: 3 });
    expect(left.x).toBe(-right.x);
    expect(right.y - left.y).toBeCloseTo(9.45);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 7; x++) {
      const p = mallPoint3d({ x, y });
      expect(p.z).toBe(0);
      expect(p.y).toBeCloseTo(0.5 + y * 3.15);
      if (x > 0) expect(p.x - mallPoint3d({ x: x - 1, y }).x).toBeCloseTo(2.65);
    }
    const middle = mallPoint3d({ x: 0.5, y: 0.5 }), end = mallPoint3d({ x: 1, y: 1 });
    expect(middle.x).toBeCloseTo((left.x + end.x) / 2);
    expect(middle.y).toBeCloseTo((left.y + end.y) / 2);
  });

  it('rejects orbit drags, held presses and pinch gestures', () => {
    expect(isConstructionTap(0, 100, false)).toBe(true);
    expect(isConstructionTap(6.9, 549, false)).toBe(true);
    expect(isConstructionTap(7, 100, false)).toBe(false);
    expect(isConstructionTap(2, 550, false)).toBe(false);
    expect(isConstructionTap(1, 100, true)).toBe(false);
    expect(isConstructionTap(1, -1, false)).toBe(false);
  });

  it('keeps static geometry independent of animation, language and building state', () => {
    const initial = view(), signature = mallStaticSignature(initial);
    const building = snapshot(PUZZLES[0], verifiedSolution(PUZZLES[0]), null, 'zh-CN', { x: 0, y: 0 }, 'p1', false, true, true);
    expect(mallStaticSignature(building)).toBe(signature);
    expect(mallStaticSignature({ ...initial, puzzle: { ...initial.puzzle, lowCeilings: [{ x: 0.2, y: 0.1, w: 1, h: 1 }] } })).not.toBe(signature);
    expect(mallStaticSignature({ ...initial, puzzle: { ...initial.puzzle, requests: [] } })).not.toBe(signature);
  });

  it('places priority controls first and moves colliding signs without mutating input', () => {
    const labels = [
      { id: 'sign', x: 100, y: 100, width: 90, height: 32, priority: 2 },
      { id: 'landing', x: 100, y: 100, width: 44, height: 44, priority: 0 },
      { id: 'piece', x: 100, y: 100, width: 60, height: 44, priority: 1 },
      { id: 'edge', x: -50, y: 1000, width: 100, height: 34, priority: 3 },
    ];
    const before = structuredClone(labels), positioned = layout3dLabels(labels, 720, 486);
    expect(labels).toEqual(before);
    expect(positioned.map(p => p.id)).toEqual(['landing', 'piece', 'sign', 'edge']);
    for (const label of positioned) {
      expect(label.left).toBeGreaterThanOrEqual(4);
      expect(label.top).toBeGreaterThanOrEqual(4);
      expect(label.left + label.width).toBeLessThanOrEqual(716);
      expect(label.top + label.height).toBeLessThanOrEqual(482);
    }
    for (let i = 0; i < positioned.length; i++) for (let j = i + 1; j < positioned.length; j++) {
      const a = positioned[i], b = positioned[j];
      const overlapX = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
      expect(overlapX <= 0 || overlapY <= 0).toBe(true);
    }
    expect(layout3dLabels(labels, 720, 486)).toEqual(positioned);
  });

  it('bounds landing displacement to ten pixels per axis even when a depth deck is dense', () => {
    const labels = Array.from({ length: 28 }, (_, index) => ({ id: `landing:${index}`, x: 120 + (index % 7) * 27, y: 90 + Math.floor(index / 7) * 30, width: 44, height: 44, priority: 0 }));
    const placed = layout3dLabels(labels, 390, 420, true);
    for (const label of placed) {
      expect(Math.abs(label.left + label.width / 2 - label.x)).toBeLessThanOrEqual(10);
      expect(Math.abs(label.top + label.height / 2 - label.y)).toBeLessThanOrEqual(10);
      expect(label.width).toBe(44); expect(label.height).toBe(44);
    }
  });

  it.each([[320, 420], [364, 420], [390, 420], [720, 486], [1280, 680]])('fits all landing targets and architecture in a %i×%i camera frame', (width, height) => {
    const engine = new NullEngine({ renderWidth: width, renderHeight: height, textureSize: 256, deterministicLockstep: false, lockstepMaxSteps: 4 });
    const scene = new Scene(engine);
    const minimum = mallCameraRadius(width, height);
    const camera = new ArcRotateCamera('test-camera', -1.33, 1.16, minimum + 2.5, new Vector3(0, 5.9, 1.15), scene);
    camera.fov = 0.64; camera.minZ = 0.1; camera.maxZ = 90;
    scene.render();
    const viewport = camera.viewport.toGlobal(width, height);
    const landings = PUZZLES[0].landings.map(point => {
      const p = mallPoint3d(point);
      const screen = Vector3.Project(new Vector3(p.x, p.y, p.z), Matrix.Identity(), scene.getTransformMatrix(), viewport);
      expect(screen.x).toBeGreaterThan(15); expect(screen.x).toBeLessThan(width - 15);
      expect(screen.y).toBeGreaterThan(15); expect(screen.y).toBeLessThan(height - 15);
      return { id: `${point.x},${point.y}`, x: screen.x, y: screen.y + 22, width: 44, height: 44, priority: 0 };
    });
    const positioned = layout3dLabels(landings, width, height);
    expect(positioned).toHaveLength(28);
    for (const target of positioned) {
      expect(target.width).toBe(44); expect(target.height).toBe(44);
      expect(target.left).toBeGreaterThanOrEqual(4); expect(target.top).toBeGreaterThanOrEqual(4);
      expect(target.left + target.width).toBeLessThanOrEqual(width - 4);
      expect(target.top + target.height).toBeLessThanOrEqual(height - 4);
    }
    for (let i = 0; i < positioned.length; i++) for (let j = i + 1; j < positioned.length; j++) {
      const a = positioned[i], b = positioned[j];
      expect(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top).toBe(true);
    }
    for (const p of [new Vector3(-9.55, 12.94, 2.85), new Vector3(9.55, 12.94, 2.85)]) {
      const screen = Vector3.Project(p, Matrix.Identity(), scene.getTransformMatrix(), viewport);
      expect(screen.x).toBeGreaterThan(0); expect(screen.x).toBeLessThan(width);
      expect(screen.y).toBeGreaterThan(0); expect(screen.y).toBeLessThan(height);
    }
    scene.dispose(); engine.dispose();
  });

  it('imports lazily, resets and disposes safely before mounting without a DOM', () => {
    const unavailable = vi.fn(), renderer = create3dRenderer(unavailable);
    renderer.resetCamera();
    renderer.dispose();
    renderer.dispose();
    expect(renderer.mount).toBeTypeOf('function');
    expect(renderer.render).toBeTypeOf('function');
    expect(unavailable).not.toHaveBeenCalled();
    expect(Mesh.MergeMeshes).toBeTypeOf('function');
  });
});
