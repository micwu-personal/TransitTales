import { describe, expect, it } from 'vitest';
import { BuildHistory, canPlace, evaluate, parseSave, type Kind, type Piece } from '../src/model';
const piece = (kind: Kind, x = 0, z = 0, y = 0): Piece => ({ id: `${kind}-${x}-${z}-${y}`, kind, x, z, y, rotation: 0, color: '#ff6f61' });
describe('building rules', () => {
  it('rejects overlap, accepts stacked pieces and rotated footprints', () => {
    const beam = piece('beam');
    expect(canPlace([], beam)).toBe(true);
    expect(canPlace([beam], piece('tile', 2, 0))).toBe(false);
    expect(canPlace([beam], piece('tile', 2, 0, 1))).toBe(true);
    expect(canPlace([beam], { ...piece('beam', 2, 0), rotation: 1 })).toBe(false);
    expect(canPlace([], piece('tile', 10, 0))).toBe(false);
  });
  it('tracks branching undo and redo with independent snapshots', () => {
    const h = new BuildHistory(); h.set([piece('tile')]); h.set([piece('tile'), piece('arch', 1)]);
    expect(h.undo()).toHaveLength(1); expect(h.redo()).toHaveLength(2); h.undo(); h.set([piece('flower')]);
    expect(h.canRedo).toBe(false); expect(h.pieces[0].kind).toBe('flower');
  });
  it('validates saved data before accepting it', () => {
    expect(parseSave(JSON.stringify({ mode: 'park', pieces: [piece('flower')] }), 'park')).toHaveLength(1);
    expect(parseSave(JSON.stringify({ mode: 'park', pieces: [piece('tile'), piece('flower')] }), 'park')).toBeNull();
    expect(parseSave(JSON.stringify({ mode: 'park', pieces: [piece('tile', 99)] }), 'park')).toBeNull();
    expect(parseSave('{oops', 'park')).toBeNull();
  });
});
describe('world reactions', () => {
  it('rescue requires a complete crossing and a high lookout', () => {
    const bridge = [-2, -1, 0, 1, 2].map(x => piece('tile', x));
    expect(evaluate('rescue', bridge).success).toBe(false);
    expect(evaluate('rescue', [...bridge, piece('pillar', 5, 2, 2)]).success).toBe(true);
    expect(evaluate('rescue', [...bridge.slice(1), piece('pillar', 5, 2, 2)]).success).toBe(false);
  });
  it('park requires a ride, habitat and two paths', () => {
    const things = [piece('wheel'), piece('habitat', 3), piece('path', -5), piece('path', -2)];
    expect(evaluate('park', things).success).toBe(true); expect(evaluate('park', things.slice(0, 3)).success).toBe(false);
  });
  it('solar system and story require their distinct ingredients', () => {
    expect(evaluate('solar', [piece('sun'), piece('planet', 2), piece('planet', 4), piece('moon', 6), piece('comet', 8)]).success).toBe(true);
    expect(evaluate('solar', [piece('sun'), piece('planet', 2), piece('moon', 6), piece('comet', 8)]).success).toBe(false);
    expect(evaluate('parade', [piece('body'), piece('head', 0, 0, 1), piece('hat', 0, 0, 2), piece('star', 3)]).success).toBe(true);
    expect(evaluate('parade', [piece('body'), piece('head', 0, 0, 1), piece('hat', 0, 0, 2)]).success).toBe(false);
    expect(evaluate('parade', [piece('body'), piece('head', 2, 0, 1), piece('hat', 2, 0, 2), piece('star', 3)]).success).toBe(false);
  });
});
