import { describe, expect, it } from 'vitest';
import { RelatedTagSchema } from './tag';

describe('RelatedTagSchema', () => {
  it('normalizes the related tag id fields to camelCase output', () => {
    const result = RelatedTagSchema.parse({
      id: 'rel-1',
      tagID: 42,
      relatedTagID: 99,
      rank: 3,
    });

    expect(result).toEqual({
      id: 'rel-1',
      tagId: 42,
      relatedTagId: 99,
      rank: 3,
    });
    expect(result).not.toHaveProperty('tagID');
    expect(result).not.toHaveProperty('relatedTagID');
  });
});
