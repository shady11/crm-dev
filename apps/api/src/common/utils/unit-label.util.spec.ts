import { unitLabel } from './unit-label.util';

describe('unitLabel', () => {
  it('names the block with the number, since numbers repeat across blocks', () => {
    expect(unitLabel({ number: '302', block: { name: 'А' } })).toBe('А / 302');
  });

  it('falls back to the bare number when the block is not loaded', () => {
    expect(unitLabel({ number: '302' })).toBe('302');
    expect(unitLabel({ number: '302', block: null })).toBe('302');
  });
});
