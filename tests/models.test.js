import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTier, inferTierFromName, TIERS } from '../src/lib/models.js';

test('registry resolves claude tiers to floating aliases', () => {
  for (const t of TIERS) {
    const r = resolveTier(t, { platform: 'claude' });
    assert.ok(r.alias, `${t} resolves`);
    assert.doesNotMatch(r.alias, /\d{8}/);
  }
  assert.equal(resolveTier('light', { platform: 'claude' }).alias, 'haiku');
});

test('project config overrides registry', () => {
  const r = resolveTier('deep', { platform: 'claude', projectModels: { claude: { deep: 'fable' } } });
  assert.deepEqual([r.alias, r.source], ['fable', 'project config']);
  const flat = resolveTier('deep', { platform: 'claude', projectModels: { deep: 'opus' } });
  assert.equal(flat.alias, 'opus');
});

test('explicit wins over everything; unknown tier throws', () => {
  assert.equal(resolveTier('light', { explicit: 'x' }).alias, 'x');
  assert.throws(() => resolveTier('huge'));
});

test('inferTierFromName only answers when unambiguous', () => {
  const fam = ['nano', 'mini', '', 'pro'];
  assert.equal(inferTierFromName('gpt-9-nano', fam), 'light');
  assert.equal(inferTierFromName('gpt-9-pro', fam), 'deep');
  assert.equal(inferTierFromName('gpt-9-mini', fam), 'standard');
  assert.equal(inferTierFromName('gpt-9', fam), null);
  assert.equal(inferTierFromName('gpt-9-mini-pro', fam), null);
});
