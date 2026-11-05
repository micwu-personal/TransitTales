import { Font, RenderContext, TextFormatter, type FontInfo, type GroupAttributes, type TextMeasure } from 'vexflow';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const number = (value: number) => {
  if (!Number.isFinite(value)) throw new RangeError('Non-finite engraving coordinate');
  return String(Math.round(value * 10000) / 10000);
};
type State = { fill: string; stroke: string; background: string; lineWidth: number; lineCap: CanvasLineCap; dash: number[]; sx: number; sy: number; font: FontInfo };

/** VexFlow's path renderer without SVGContext's document / text measurement dependency.
 * Musical outlines, spacing and engraving remain entirely VexFlow's responsibility. */
export class NotationContext extends RenderContext {
  private state: State = { fill: 'currentColor', stroke: 'currentColor', background: 'transparent', lineWidth: 1, lineCap: 'butt', dash: [], sx: 1, sy: 1, font: { family: 'serif', size: 10 } };
  private stack: State[] = [];
  private path = '';
  private output: string[] = [];
  private point(x: number, y: number): string { return `${number(x * this.state.sx)} ${number(y * this.state.sy)}`; }
  markup(): string { return this.output.join(''); }
  clear(): void { this.output = []; }
  setFillStyle(style: string): this { this.state.fill = style; return this; }
  setBackgroundFillStyle(style: string): this { this.state.background = style; return this; }
  setStrokeStyle(style: string): this { this.state.stroke = style; return this; }
  setShadowColor(_color: string): this { return this; }
  setShadowBlur(blur: number): this {
    if (blur !== 0) throw new RangeError('Notation does not support shadow effects');
    return this;
  }
  setLineWidth(width: number): this { this.state.lineWidth = width; return this; }
  setLineCap(cap: CanvasLineCap): this { this.state.lineCap = cap; return this; }
  setLineDash(dash: number[]): this { this.state.dash = [...dash]; return this; }
  scale(x: number, y: number): this { this.state.sx *= x; this.state.sy *= y; return this; }
  resize(_width: number, _height: number): this { return this; }
  rect(x: number, y: number, width: number, height: number): this {
    return this.moveTo(x, y).lineTo(x + width, y).lineTo(x + width, y + height).lineTo(x, y + height).closePath();
  }
  fillRect(x: number, y: number, width: number, height: number): this {
    this.output.push(`<rect x="${number(Math.min(x, x + width) * this.state.sx)}" y="${number(Math.min(y, y + height) * this.state.sy)}" width="${number(Math.abs(width * this.state.sx))}" height="${number(Math.abs(height * this.state.sy))}" fill="${escape(this.state.fill)}"/>`);
    return this;
  }
  clearRect(x: number, y: number, width: number, height: number): this {
    this.save().setFillStyle(this.state.background).fillRect(x, y, width, height).restore();
    return this;
  }
  beginPath(): this { this.path = ''; return this; }
  moveTo(x: number, y: number): this { this.path += `M${this.point(x, y)} `; return this; }
  lineTo(x: number, y: number): this { this.path += `L${this.point(x, y)} `; return this; }
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number): this {
    this.path += `C${this.point(a, b)} ${this.point(c, d)} ${this.point(x, y)} `; return this;
  }
  quadraticCurveTo(a: number, b: number, x: number, y: number): this {
    this.path += `Q${this.point(a, b)} ${this.point(x, y)} `; return this;
  }
  arc(x: number, y: number, radius: number, start: number, end: number, counterclockwise: boolean): this {
    const tau = Math.PI * 2;
    const sweep = counterclockwise ? 0 : 1;
    let delta = counterclockwise ? start - end : end - start;
    if (Math.abs(end - start) >= tau) delta = tau;
    else delta = ((delta % tau) + tau) % tau;
    this.moveTo(x + radius * Math.cos(start), y + radius * Math.sin(start));
    const segment = (angle: number, large: number) => {
      this.path += `A${number(radius * this.state.sx)} ${number(radius * this.state.sy)} 0 ${large} ${sweep} ${this.point(x + radius * Math.cos(angle), y + radius * Math.sin(angle))} `;
    };
    if (delta >= tau) {
      segment(start + (counterclockwise ? -Math.PI : Math.PI), 0);
      segment(start, 0);
    } else if (delta > 0) segment(end, delta > Math.PI ? 1 : 0);
    return this;
  }
  closePath(): this { this.path += 'Z '; return this; }
  fill(attributes?: Record<string, unknown>): this {
    if (attributes && Object.keys(attributes).length) throw new RangeError('Unsupported engraving fill attributes');
    this.output.push(`<path d="${this.path.trim()}" fill="${escape(this.state.fill)}" stroke="none"/>`);
    return this;
  }
  stroke(): this {
    const dash = this.state.dash.length ? ` stroke-dasharray="${this.state.dash.map(number).join(' ')}"` : '';
    this.output.push(`<path d="${this.path.trim()}" fill="none" stroke="${escape(this.state.stroke)}" stroke-width="${number(this.state.lineWidth * this.state.sx)}" stroke-linecap="${this.state.lineCap}"${dash}/>`);
    return this;
  }
  fillText(_text: string, _x: number, _y: number): this {
    throw new RangeError('Music must be engraved with embedded glyph outlines, not text fonts');
  }
  measureText(text: string): TextMeasure {
    const formatter = TextFormatter.create(this.state.font);
    const extent = formatter.getYForStringInPx(text);
    return { x: 0, y: -extent.yMax, width: formatter.getWidthForTextInPx(text), height: extent.height };
  }
  save(): this { this.stack.push({ ...this.state, dash: [...this.state.dash], font: { ...this.state.font } }); return this; }
  restore(): this {
    const state = this.stack.pop();
    if (!state) throw new RangeError('Unbalanced engraving context');
    this.state = state; return this;
  }
  openGroup(cls?: string, _id?: string, _attrs?: GroupAttributes): void {
    const id = _id?.startsWith('score-glyph-') ? ` id="${escape(_id)}"` : '';
    this.output.push(cls ? `<g class="vf-${escape(cls)}"${id}>` : `<g${id}>`);
  }
  closeGroup(): void { this.output.push('</g>'); }
  add(_child: unknown): void { throw new RangeError('DOM nodes are not supported by the outline renderer'); }
  set fillStyle(style: string | CanvasGradient | CanvasPattern) {
    if (typeof style !== 'string') throw new RangeError('Only solid notation fills are supported');
    this.setFillStyle(style);
  }
  get fillStyle(): string { return this.state.fill; }
  set strokeStyle(style: string | CanvasGradient | CanvasPattern) {
    if (typeof style !== 'string') throw new RangeError('Only solid notation strokes are supported');
    this.setStrokeStyle(style);
  }
  get strokeStyle(): string { return this.state.stroke; }
  setFont(font?: string | FontInfo, size?: string | number, weight?: string | number, style?: string): this {
    this.state.font = typeof font === 'object' ? { ...font } : font && size === undefined ? Font.fromCSSString(font) : { family: font, size, weight, style };
    return this;
  }
  getFont(): string { return Font.toCSSString(this.state.font); }
}
