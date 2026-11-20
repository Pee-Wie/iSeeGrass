import test from 'node:test';
import assert from 'node:assert/strict';
import { ManualIdentificationKey } from '../www/public/js/users/identify/manual-identification-key.js';

const paths = [
  [[0, 0], 'Syringodium isoetifolium'],
  [[0, 1, 0], 'Cymodocea rotundata'],
  [[0, 1, 1], 'Cymodocea serrulata'],
  [[0, 1, 2], 'Halodule uninervis'],
  [[0, 1, 3], 'Thalassia hemprichii'],
  [[0, 1, 4], 'Zostera capricorni'],
  [[2, 0, 0], 'Halophila ovalis'],
  [[2, 0, 1], 'Halophila minor'],
  [[3, 0], 'Halophila spinulosa'],
  [[3, 1], 'Halophila tricostata'],
];

test('the manual key returns exactly the ten selected species', () => {
  for (const [answers, expectedSpecies] of paths) {
    const key = new ManualIdentificationKey();
    for (const answer of answers) key.selectAnswer(answer);
    assert.equal(key.getOutcome().scientificName, expectedSpecies);
  }
});

test('the key refuses unsupported traits and branched outcomes', () => {
  for (const answers of [[1, 0], [1, 1], [1, 2], [0, 2], [2, 1], [2, 2], [3, 2]]) {
    const key = new ManualIdentificationKey();
    for (const answer of answers) key.selectAnswer(answer);
    assert.equal(key.getOutcome().scientificName, null);
    assert.match(key.getOutcome().fieldNote, /ten species/);
  }
});

test('users can go back and change an answer', () => {
  const key = new ManualIdentificationKey();
  key.selectAnswer(0);
  key.selectAnswer(1);
  key.selectAnswer(0);
  assert.equal(key.getOutcome().scientificName, 'Cymodocea rotundata');

  assert.equal(key.goBack(), true);
  key.selectAnswer(4);
  assert.equal(key.getOutcome().scientificName, 'Zostera capricorni');
});

test('invalid answers are rejected', () => {
  const key = new ManualIdentificationKey();
  assert.throws(() => key.selectAnswer(4), RangeError);
});
