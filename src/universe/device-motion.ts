export type DeviceMotionMode = 'look' | 'inspect';
export type DeviceMotionStatus = 'idle' | 'requesting' | 'waiting' | 'active' | 'paused' | 'denied' | 'unavailable' | 'insecure' | 'no-events' | 'disposed';
export type DeviceMotionSource = 'orientation' | 'gravity' | null;
export interface DeviceMotionState {
  readonly status: DeviceMotionStatus;
  readonly mode: DeviceMotionMode;
  readonly source: DeviceMotionSource;
  /** Relative, filtered radians. Positive yaw turns right; positive pitch looks down. */
  readonly yaw: number;
  readonly pitch: number;
  /** Unit-radius virtual inspection offset: +x right, -z forward, y always zero. NOT position or integrated acceleration. */
  readonly inspection: Readonly<{ x: number; y: number; z: number }>;
}
export const DEVICE_MOTION_LIMITS = Object.freeze({ yaw: Math.PI / 2, pitch: Math.PI / 3, inspection: 1, tilt: Math.PI / 6 });
export interface DeviceMotionOptions {
  mode?: DeviceMotionMode;
  /** Maximum wait for permission or usable readings; default 2500 ms. */
  timeoutMs?: number;
}
type PermissionConstructor = { requestPermission?: () => Promise<string> };
type SensorWindow = Window & {
  DeviceOrientationEvent?: PermissionConstructor;
  DeviceMotionEvent?: PermissionConstructor;
  orientation?: number;
};
type Reading = { heading: number; pitch: number; roll: number; headingBased: boolean };
const radians = Math.PI / 180;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const deadzone = (angle: number) => Math.sign(angle) * Math.max(0, Math.abs(angle) - radians);

/**
 * Call enable() directly in a click/tap handler (both iOS prompts are invoked before any await).
 * Its true result means subscribed, not that readings arrived: use state.status === 'active'.
 * Apply pose additively to ordinary camera controls; never apply it to route/map coordinates.
 * Hidden/pagehide pauses and unsubscribes; foreground requires explicit enable(), reusing grants.
 * Updates are event-driven; this controller never owns a render/animation loop.
 */
export function createDeviceMotionController(onUpdate: (state: DeviceMotionState) => void, options: DeviceMotionOptions = {}) {
  const host = typeof window === 'undefined' ? undefined : window as SensorWindow;
  const page = typeof document === 'undefined' ? undefined : document;
  const timeoutMs = finite(options.timeoutMs) ? Math.max(100, Math.min(10000, options.timeoutMs)) : 2500;
  let mode = options.mode ?? 'look', status: DeviceMotionStatus = 'idle', source: DeviceMotionSource = null;
  let yaw = 0, pitch = 0, x = 0, z = 0, generation = 0, disposed = false, subscribed = false;
  let center: Reading | null = null, latest: Reading | null = null, lastTime = 0, screenAngle = 0, headingDelta = 0;
  let timer: ReturnType<typeof setTimeout> | undefined, pending: Promise<boolean> | null = null;
  let settle: ((value: boolean) => void) | null = null;
  const grants = new Set<'orientation' | 'motion'>();
  const listeners: Array<() => void> = [];
  let state: DeviceMotionState = snapshot();
  function snapshot(): DeviceMotionState {
    return Object.freeze({ status, mode, source, yaw, pitch, inspection: Object.freeze({ x, y: 0, z }) });
  }
  function emit() { state = snapshot(); onUpdate(state); }
  function listen(target: EventTarget, name: string, handler: EventListener) {
    target.addEventListener(name, handler);
    listeners.push(() => target.removeEventListener(name, handler));
  }
  function resolveEnable(value: boolean) {
    const resolve = settle; settle = null; pending = null; resolve?.(value);
  }
  function neutral() { yaw = pitch = x = z = headingDelta = 0; }
  function deactivate(next: DeviceMotionStatus) {
    generation++; clearTimeout(timer); timer = undefined;
    for (const remove of listeners.splice(0)) remove();
    subscribed = false; resolveEnable(false); center = latest = null; source = null; neutral();
    status = next; emit();
  }
  function angle() {
    const value = host?.screen?.orientation?.angle ?? host?.orientation;
    return finite(value) ? wrap(value * radians) : 0;
  }
  function calibrate() {
    center = latest ? { ...latest } : null; neutral(); lastTime = Date.now(); emit();
  }
  function receive(reading: Reading, nextSource: Exclude<DeviceMotionSource, null>) {
    if (!subscribed) return;
    const currentAngle = angle();
    if (source !== nextSource || currentAngle !== screenAngle || latest?.headingBased !== reading.headingBased) {
      center = latest = null; neutral();
    }
    screenAngle = currentAngle; source = nextSource;
    if (center && latest) headingDelta = clamp(headingDelta + wrap(reading.heading - latest.heading), DEVICE_MOTION_LIMITS.yaw + radians);
    latest = reading;
    clearTimeout(timer);
    timer = setTimeout(() => deactivate('no-events'), timeoutMs);
    status = 'active';
    if (!center) { calibrate(); return; }
    const targetYaw = clamp(deadzone(headingDelta), DEVICE_MOTION_LIMITS.yaw);
    const targetPitch = clamp(deadzone(reading.pitch - center.pitch), DEVICE_MOTION_LIMITS.pitch);
    const targetX = deadzone(reading.roll - center.roll) / DEVICE_MOTION_LIMITS.tilt;
    const targetZ = -deadzone(reading.pitch - center.pitch) / DEVICE_MOTION_LIMITS.tilt;
    const radius = Math.max(1, Math.hypot(targetX, targetZ));
    const now = Date.now(), weight = 1 - Math.exp(-Math.max(1, Math.min(100, now - lastTime)) / 80);
    lastTime = now;
    yaw += (targetYaw - yaw) * weight; pitch += (targetPitch - pitch) * weight;
    x = mode === 'inspect' ? x + (targetX / radius - x) * weight : 0;
    z = mode === 'inspect' ? z + (targetZ / radius - z) * weight : 0;
    emit();
  }
  function screenTilt(pitchValue: number, rollValue: number) {
    const rotation = angle(), cosine = Math.cos(rotation), sine = Math.sin(rotation);
    return { pitch: pitchValue * cosine + rollValue * sine, roll: rollValue * cosine - pitchValue * sine };
  }
  const orientation: EventListener = event => {
    const value = event as DeviceOrientationEvent;
    if (!finite(value.beta) || !finite(value.gamma)) return;
    const tilt = screenTilt(clamp(value.beta, 180) * radians, clamp(value.gamma, 90) * radians);
    receive({ ...tilt, heading: finite(value.alpha) ? -wrap(value.alpha * radians) : tilt.roll, headingBased: finite(value.alpha) }, 'orientation');
  };
  const motion: EventListener = event => {
    if (source === 'orientation') return;
    const gravity = (event as DeviceMotionEvent).accelerationIncludingGravity;
    if (!gravity || !finite(gravity.x) || !finite(gravity.y) || !finite(gravity.z)) return;
    // Reject free-fall and strong translation: only a near-gravity vector is a useful tilt fallback.
    const length = Math.hypot(gravity.x, gravity.y, gravity.z);
    if (length < 7.5 || length > 12) return;
    const tilt = screenTilt(Math.atan2(-gravity.y, Math.hypot(gravity.x, gravity.z)), Math.atan2(gravity.x, Math.hypot(gravity.y, gravity.z)));
    receive({ ...tilt, heading: tilt.roll, headingBased: false }, 'gravity');
  };
  const pause: EventListener = () => deactivate('paused');
  const visibility: EventListener = () => { if (page?.hidden) deactivate('paused'); };
  function subscribe(kind: 'orientation' | 'motion') {
    if (!host) return;
    listen(host, kind === 'orientation' ? 'deviceorientation' : 'devicemotion', kind === 'orientation' ? orientation : motion);
    subscribed = true; status = 'waiting';
    resolveEnable(true); emit();
  }
  function enable(): Promise<boolean> {
    if (disposed) return Promise.resolve(false);
    if (pending) return pending;
    if (subscribed) return Promise.resolve(true);
    if (!host || !page) { deactivate('unavailable'); return Promise.resolve(false); }
    if (host.isSecureContext === false) { deactivate('insecure'); return Promise.resolve(false); }
    if (page.hidden) { deactivate('paused'); return Promise.resolve(false); }
    const sensors = ([['orientation', host.DeviceOrientationEvent], ['motion', host.DeviceMotionEvent]] as const).filter((entry) => entry[1] != null);
    if (!sensors.length) { deactivate('unavailable'); return Promise.resolve(false); }
    const ticket = ++generation;
    status = 'requesting'; source = null; neutral();
    pending = new Promise<boolean>(resolve => { settle = resolve; });
    const result = pending;
    listen(page, 'visibilitychange', visibility); listen(host, 'pagehide', pause);
    timer = setTimeout(() => { if (ticket === generation) deactivate('no-events'); }, timeoutMs);
    let remaining = sensors.length, denied = false;
    // Invoke every permission API synchronously, preserving transient user activation on iOS.
    const requests = sensors.map(([kind, api]) => {
      try { return { kind, request: Promise.resolve(grants.has(kind) || !api?.requestPermission ? 'granted' : api.requestPermission()) }; }
      catch { return { kind, request: Promise.reject(new Error('Permission request failed')) }; }
    });
    for (const { kind, request } of requests) {
      void request.then(permission => {
        if (ticket !== generation) return;
        if (permission === 'granted') {
          grants.add(kind);
          // A late second grant must not downgrade an already active controller.
          if (status === 'active') listen(host, kind === 'orientation' ? 'deviceorientation' : 'devicemotion', kind === 'orientation' ? orientation : motion);
          else subscribe(kind);
        } else denied = true;
      }, () => { if (ticket === generation) denied = true; }).then(() => {
        if (ticket === generation && --remaining === 0 && !subscribed) deactivate(denied ? 'denied' : 'unavailable');
      });
    }
    emit(); return result;
  }
  return {
    get state() { return state; },
    enable,
    stop() { if (!disposed) deactivate('idle'); },
    recenter() { if (!disposed) calibrate(); },
    setMode(next: DeviceMotionMode) { if (!disposed) { mode = next; x = z = 0; emit(); } },
    dispose() { if (!disposed) { disposed = true; deactivate('disposed'); } },
  };
}
