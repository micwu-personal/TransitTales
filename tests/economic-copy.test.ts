import { describe, expect, it } from 'vitest';
import { copy } from '../src/economic/copy';

describe('economic child-perspective copy', () => {
  it('describes siblings in the family without making the child a parent', () => {
    expect(copy('zh').familySize).toEqual(['我是独生子女', '我家有两个孩子', '我家有三个孩子']);
  });
});
