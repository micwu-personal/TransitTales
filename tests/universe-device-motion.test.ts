import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDeviceMotionController, DEVICE_MOTION_LIMITS } from '../src/universe/device-motion';

class TrackedTarget extends EventTarget {
  subscriptions = new Map<string, Set<EventListenerOrEventListenerObject>>();
  override addEventListener(name: string, listener: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    if (listener) {
      const entries = this.subscriptions.get(name) ?? new Set(); entries.add(listener); this.subscriptions.set(name, entries);
    }
    super.addEventListener(name, listener, options);
  }
  override removeEventListener(name: string, listener: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    if (listener) this.subscriptions.get(name)?.delete(listener);
    super.removeEventListener(name, listener, options);
  }
  get count() { return [...this.subscriptions.values()].reduce((sum, entries) => sum + entries.size, 0); }
}
function environment() {
  const host = Object.assign(new TrackedTarget(), {
    isSecureContext: true,
    DeviceOrientationEvent: {} as { requestPermission?: () => Promise<string> },
    DeviceMotionEvent: {} as { requestPermission?: () => Promise<string> },
    screen: { orientation: { angle: 0 } },
  });
  const page = Object.assign(new TrackedTarget(), { hidden: false });
  vi.stubGlobal('window', host); vi.stubGlobal('document', page);
  const update = vi.fn(), controller = createDeviceMotionController(update);
  function event(name: string, values: Record<string, unknown>) { host.dispatchEvent(Object.assign(new Event(name), values)); }
  function orient(alpha = 0, beta = 0, gamma = 0) { event('deviceorientation', { alpha, beta, gamma }); }
  function advance(alpha = 0, beta = 0, gamma = 0, count = 12) {
    for (let i = 0; i < count; i++) { vi.advanceTimersByTime(100); orient(alpha, beta, gamma); }
  }
  return { host, page, update, controller, event, orient, advance };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Opt-in universe device motion', () => {
  it('is inert until enabled, invokes both iOS permissions during the gesture, and waits for real readings', async () => {
    vi.useFakeTimers(); const { host, page, controller, orient, update } = environment();
    host.DeviceOrientationEvent.requestPermission = vi.fn(async () => 'granted');
    host.DeviceMotionEvent.requestPermission = vi.fn(async () => 'granted');
    expect(controller.state.status).toBe('idle'); expect(host.count + page.count).toBe(0);
    orient(); expect(update).not.toHaveBeenCalled();
    const enabled = controller.enable();
    expect(host.DeviceOrientationEvent.requestPermission).toHaveBeenCalledOnce();
    expect(host.DeviceMotionEvent.requestPermission).toHaveBeenCalledOnce();
    expect(controller.state.status).toBe('requesting');
    expect(await enabled).toBe(true); expect(controller.state.status).toBe('waiting');
    orient(20, 30, 5); expect(controller.state.status).toBe('active');
    expect(controller.state.yaw).toBe(0); expect(controller.state.pitch).toBe(0);
    expect(controller.state.source).toBe('orientation'); expect(vi.getTimerCount()).toBe(1);
    controller.dispose();
  });
  it('reports denial and exceptions with complete cleanup', async () => {
    vi.useFakeTimers(); const { host, page, controller } = environment();
    host.DeviceOrientationEvent.requestPermission = vi.fn(async () => 'denied');
    host.DeviceMotionEvent.requestPermission = vi.fn(() => { throw new Error('blocked'); });
    expect(await controller.enable()).toBe(false); expect(controller.state.status).toBe('denied');
    expect(host.count + page.count).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['denied', 'pending'])('does not block usable orientation on %s motion permission', async permission => {
    vi.useFakeTimers(); const { host, controller, orient } = environment();
    host.DeviceOrientationEvent.requestPermission = vi.fn(async () => 'granted');
    host.DeviceMotionEvent.requestPermission = vi.fn(() => permission === 'pending' ? new Promise<string>(() => {}) : Promise.resolve('denied'));
    expect(await controller.enable()).toBe(true);
    for (let i = 0; i < 5; i++) { orient(); vi.advanceTimersByTime(1000); }
    expect(controller.state.status).toBe('active');
    controller.dispose();
  });
  it('provides gravity tilt look controls when orientation is denied, without using linear acceleration', async () => {
    vi.useFakeTimers(); const { host, controller, event } = environment();
    host.DeviceOrientationEvent.requestPermission = vi.fn(async () => 'denied');
    expect(await controller.enable()).toBe(true);
    event('devicemotion', { acceleration: { x: 8, y: 0, z: 0 }, accelerationIncludingGravity: null });
    expect(controller.state.status).toBe('waiting');
    event('devicemotion', { accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 } });
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(100);
      event('devicemotion', { accelerationIncludingGravity: { x: 3, y: -3, z: 8.85 } });
    }
    expect(controller.state.source).toBe('gravity'); expect(controller.state.yaw).toBeGreaterThan(.2);
    expect(controller.state.pitch).toBeGreaterThan(.2); expect(controller.state.inspection).toEqual({ x: 0, y: 0, z: 0 });
    controller.dispose();
  });
  it('detects absent APIs, server environments and insecure context without prompting', async () => {
    const { host, controller } = environment();
    delete (host as Partial<typeof host>).DeviceOrientationEvent; delete (host as Partial<typeof host>).DeviceMotionEvent;
    expect(await controller.enable()).toBe(false); expect(controller.state.status).toBe('unavailable');
    host.DeviceOrientationEvent = { requestPermission: vi.fn(async () => 'granted') }; host.isSecureContext = false;
    expect(await controller.enable()).toBe(false); expect(controller.state.status).toBe('insecure');
    expect(host.DeviceOrientationEvent.requestPermission).not.toHaveBeenCalled();
    vi.stubGlobal('window', undefined);
    const server = createDeviceMotionController(vi.fn()); expect(await server.enable()).toBe(false);
    expect(server.state.status).toBe('unavailable');
  });
  it('ignores missing/nonfinite readings, free-fall and strong acceleration', async () => {
    vi.useFakeTimers(); const { controller, event } = environment(); await controller.enable();
    for (const value of [null, undefined, NaN, Infinity, '20']) {
      event('deviceorientation', { alpha: 0, beta: value, gamma: 0 });
      event('deviceorientation', { alpha: 0, beta: 0, gamma: value });
      event('devicemotion', { accelerationIncludingGravity: { x: value, y: 0, z: 9.81 } });
    }
    for (const z of [0, 1, 30]) event('devicemotion', { accelerationIncludingGravity: { x: 0, y: 0, z } });
    expect(controller.state.status).toBe('waiting');
    expect(controller.state.yaw).toBe(0); expect(controller.state.pitch).toBe(0);
    controller.dispose();
  });
  it('uses orientation tilt even when compass heading is unavailable', async () => {
    vi.useFakeTimers(); const { controller, event } = environment(); await controller.enable();
    event('deviceorientation', { alpha: null, beta: 0, gamma: 0 });
    for (let i = 0; i < 12; i++) {
      vi.advanceTimersByTime(100); event('deviceorientation', { alpha: null, beta: 15, gamma: 15 });
    }
    expect(controller.state.status).toBe('active'); expect(controller.state.yaw).toBeGreaterThan(.2);
    expect(controller.state.pitch).toBeGreaterThan(.2); controller.dispose();
  });
  it('wraps heading across north instead of jumping a full revolution', async () => {
    vi.useFakeTimers(); const { controller, orient, advance } = environment(); await controller.enable();
    orient(359); advance(1);
    expect(Math.abs(controller.state.yaw)).toBeCloseTo(Math.PI / 180, 4);
    advance(359); expect(controller.state.yaw).toBeCloseTo(0, 4); controller.dispose();
  });
  it('filters small jitter and bounds extreme finite view readings', async () => {
    vi.useFakeTimers(); const { controller, orient, advance } = environment(); await controller.enable(); orient();
    advance(.4, .4, .4); expect(controller.state.yaw).toBe(0); expect(controller.state.pitch).toBe(0);
    vi.advanceTimersByTime(10); orient(120, 1000, -1000);
    expect(Math.abs(controller.state.yaw)).toBeGreaterThan(0);
    expect(Math.abs(controller.state.yaw)).toBeLessThan(DEVICE_MOTION_LIMITS.yaw);
    advance(120, 1000, -1000);
    expect(Math.abs(controller.state.yaw)).toBeLessThanOrEqual(DEVICE_MOTION_LIMITS.yaw);
    expect(Math.abs(controller.state.pitch)).toBeLessThanOrEqual(DEVICE_MOTION_LIMITS.pitch);
    expect(controller.state.pitch).toBeCloseTo(DEVICE_MOTION_LIMITS.pitch, 4); controller.dispose();
  });
  it('recalibrates on screen rotation and maps portrait/landscape tilt to screen axes', async () => {
    vi.useFakeTimers(); const { host, controller, orient, advance } = environment(); await controller.enable();
    orient(); advance(0, 15, 0); expect(controller.state.pitch).toBeGreaterThan(.2);
    host.screen.orientation.angle = 90; orient();
    expect(controller.state.pitch).toBe(0); expect(controller.state.yaw).toBe(0);
    advance(0, 0, 15); expect(controller.state.pitch).toBeGreaterThan(.2);
    controller.setMode('inspect'); advance(0, 15, 0);
    expect(controller.state.inspection.x).toBeLessThan(-.4);
    host.screen.orientation.angle = 270; orient(); advance(0, 0, 15);
    expect(controller.state.pitch).toBeLessThan(-.2); controller.dispose();
  });
  it('uses legacy screen orientation when modern angle is absent', async () => {
    vi.useFakeTimers(); const { host, controller, orient, advance } = environment();
    delete (host.screen as Partial<typeof host.screen>).orientation;
    Object.assign(host, { orientation: -90 }); await controller.enable(); orient(); advance(0, 0, 15);
    expect(controller.state.pitch).toBeLessThan(-.2); controller.dispose();
  });
  it('keeps inspection in a unit disk with no integration, drift, route coordinates or vertical movement', async () => {
    vi.useFakeTimers(); const { controller, orient, advance } = environment(); await controller.enable(); orient();
    controller.setMode('inspect'); advance(0, 90, 90, 30);
    expect(Math.hypot(controller.state.inspection.x, controller.state.inspection.z)).toBeCloseTo(1, 6);
    expect(controller.state.inspection.y).toBe(0);
    const stationary = controller.state; vi.advanceTimersByTime(2000); expect(controller.state).toBe(stationary);
    advance(0, 90, 90, 30); expect(controller.state.inspection).toEqual(stationary.inspection);
    advance(0, 0, 0, 30); expect(Math.hypot(controller.state.inspection.x, controller.state.inspection.z)).toBeLessThan(.0001);
    controller.setMode('look'); advance(0, 90, 90);
    expect(controller.state.inspection).toEqual({ x: 0, y: 0, z: 0 }); controller.dispose();
  });
  it('recenters against latest reading and publishes detached immutable poses', async () => {
    vi.useFakeTimers(); const { controller, orient, advance } = environment(); await controller.enable(); orient();
    controller.setMode('inspect'); advance(40, 20, 20); const previous = controller.state;
    expect(previous.pitch).toBeGreaterThan(0); expect(Object.isFrozen(previous)).toBe(true);
    expect(Object.isFrozen(previous.inspection)).toBe(true);
    controller.recenter(); expect(controller.state.yaw).toBe(0); expect(controller.state.pitch).toBe(0);
    expect(controller.state.inspection).toEqual({ x: 0, y: 0, z: 0 });
    advance(40, 20, 20); expect(controller.state.yaw).toBe(0); expect(controller.state.pitch).toBe(0);
    expect(previous.pitch).toBeGreaterThan(0); controller.dispose();
  });
  it('prefers orientation over gravity and recalibrates cleanly when it first becomes available', async () => {
    vi.useFakeTimers(); const { controller, orient, event } = environment(); await controller.enable();
    event('devicemotion', { accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 } });
    orient(120, 70, 10); expect(controller.state.source).toBe('orientation'); expect(controller.state.pitch).toBe(0);
    const pose = controller.state;
    event('devicemotion', { accelerationIncludingGravity: { x: 5, y: 5, z: 7 } });
    expect(controller.state).toBe(pose); controller.dispose();
  });
  it('unsubscribes on hidden/pagehide and resumes only explicitly with cached permissions', async () => {
    vi.useFakeTimers(); const { host, page, controller, orient } = environment();
    host.DeviceOrientationEvent.requestPermission = vi.fn(async () => 'granted');
    host.DeviceMotionEvent.requestPermission = vi.fn(async () => 'granted');
    await controller.enable(); orient(); page.hidden = true; page.dispatchEvent(new Event('visibilitychange'));
    expect(controller.state.status).toBe('paused'); expect(host.count + page.count).toBe(0);
    page.hidden = false; page.dispatchEvent(new Event('visibilitychange')); orient();
    expect(controller.state.status).toBe('paused');
    await controller.enable(); orient();
    expect(host.DeviceOrientationEvent.requestPermission).toHaveBeenCalledOnce();
    expect(host.DeviceMotionEvent.requestPermission).toHaveBeenCalledOnce();
    host.dispatchEvent(new Event('pagehide')); expect(controller.state.status).toBe('paused');
    expect(host.count + page.count).toBe(0); expect(vi.getTimerCount()).toBe(0); controller.dispose();
  });
  it('cancels in-flight permission on stop/dispose and does not revive stale requests', async () => {
    vi.useFakeTimers(); const { host, page, controller } = environment(); let grant!: (value: string) => void;
    delete (host as Partial<typeof host>).DeviceMotionEvent;
    host.DeviceOrientationEvent.requestPermission = vi.fn(() => new Promise<string>(resolve => { grant = resolve; }));
    const pending = controller.enable(); expect(controller.enable()).toBe(pending);
    controller.stop(); grant('granted'); expect(await pending).toBe(false); await Promise.resolve();
    expect(controller.state.status).toBe('idle'); expect(host.count + page.count).toBe(0);
    const second = controller.enable(); controller.dispose(); grant('granted'); expect(await second).toBe(false);
    await Promise.resolve(); expect(controller.state.status).toBe('disposed');
    expect(await controller.enable()).toBe(false); controller.stop(); controller.recenter(); controller.setMode('inspect');
    expect(controller.state.status).toBe('disposed'); expect(host.count + page.count).toBe(0);
  });
  it('stops opted-in listeners and neutralizes offsets without an animation loop', async () => {
    vi.useFakeTimers(); const { host, page, controller, orient, advance, update } = environment();
    const raf = vi.fn(); vi.stubGlobal('requestAnimationFrame', raf);
    await controller.enable(); orient(); controller.setMode('inspect'); advance(20, 20, 20);
    controller.stop(); const count = update.mock.calls.length; advance(100, 80, 80);
    expect(update).toHaveBeenCalledTimes(count); expect(host.count + page.count).toBe(0);
    expect(controller.state.yaw).toBe(0); expect(controller.state.inspection).toEqual({ x: 0, y: 0, z: 0 });
    expect(raf).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0); controller.dispose();
  });
  it('fails within a bounded timeout when APIs exist but emit no usable events', async () => {
    vi.useFakeTimers(); const { host, page, controller, event } = environment(); await controller.enable();
    event('deviceorientation', { alpha: null, beta: null, gamma: null });
    vi.advanceTimersByTime(2499); expect(controller.state.status).toBe('waiting');
    vi.advanceTimersByTime(1); expect(controller.state.status).toBe('no-events');
    expect(host.count + page.count).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it('releases stale poses when a previously working sensor stops sending readings', async () => {
    vi.useFakeTimers(); const { host, page, controller, orient, advance } = environment();
    await controller.enable(); orient(); controller.setMode('inspect'); advance(20, 20, 20);
    expect(controller.state.inspection.x).toBeGreaterThan(0);
    vi.advanceTimersByTime(2499); expect(controller.state.status).toBe('active');
    vi.advanceTimersByTime(1); expect(controller.state.status).toBe('no-events');
    expect(controller.state.yaw).toBe(0); expect(controller.state.inspection).toEqual({ x: 0, y: 0, z: 0 });
    expect(host.count + page.count).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it('does not downgrade active pose or duplicate subscriptions on a late second permission grant', async () => {
    vi.useFakeTimers(); const { host, controller, orient } = environment(); let grant!: (value: string) => void;
    host.DeviceMotionEvent.requestPermission = vi.fn(() => new Promise<string>(resolve => { grant = resolve; }));
    await controller.enable(); orient(); const pose = controller.state;
    grant('granted'); await Promise.resolve(); await Promise.resolve();
    expect(controller.state).toBe(pose); expect(controller.state.status).toBe('active');
    await controller.enable(); expect(host.subscriptions.get('deviceorientation')?.size).toBe(1);
    expect(host.subscriptions.get('devicemotion')?.size).toBe(1); controller.dispose();
  });
  it('bounds an indefinitely pending permission and rejects hidden enable without prompts', async () => {
    vi.useFakeTimers(); const { host, page, controller } = environment();
    delete (host as Partial<typeof host>).DeviceMotionEvent;
    host.DeviceOrientationEvent.requestPermission = vi.fn(() => new Promise<string>(() => {}));
    page.hidden = true; expect(await controller.enable()).toBe(false);
    expect(host.DeviceOrientationEvent.requestPermission).not.toHaveBeenCalled(); page.hidden = false;
    const pending = controller.enable(); vi.advanceTimersByTime(2500);
    expect(await pending).toBe(false); expect(controller.state.status).toBe('no-events');
    expect(host.count + page.count).toBe(0);
  });
});
