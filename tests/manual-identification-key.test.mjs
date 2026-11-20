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

test('the key refuses unsupported traits and remaining unsure outcomes', () => {
  for (const answers of [[2, 1], [2, 2]]) {
    const key = new ManualIdentificationKey();
    for (const answer of answers) key.selectAnswer(answer);
    assert.equal(key.getOutcome().scientificName, null);
    assert.match(key.getOutcome().fieldNote, /ten species/);
  }
});

test('strap and fern branches omit the neither-or-unsure choice', () => {
  const key = new ManualIdentificationKey();
  key.selectAnswer(0);
  assert.deepEqual(key.getQuestion().choices.map(choice => choice.label), [
    'Cylindrical leaf that tapers to a point',
    'Flat, strap-shaped leaf',
  ]);
  key.restart();
  key.selectAnswer(3);
  assert.deepEqual(key.getQuestion().choices.map(choice => choice.label), [
    'Opposite pairs along the stem',
    'A fan of leaflets around the stem',
  ]);
});

test('branched sub-choices are disabled and identified as out of scope', () => {
  const key = new ManualIdentificationKey();
  key.selectAnswer(1);
  const question = key.getQuestion();

  assert.equal(question.choices.length, 2);
  assert.match(question.availabilityMessage, /assessment scope/);
  assert.ok(question.choices.every(choice => choice.disabled));
  assert.ok(question.choices.every(choice => !/neither|unsure/i.test(choice.label)));
  assert.throws(() => key.selectAnswer(0), RangeError);
});

test('users can go back and change an answer', () => {
  const key = new ManualIdentificationKey();
  assert.equal(key.canGoBack(), false);
  key.selectAnswer(0);
  assert.equal(key.canGoBack(), true);
  key.selectAnswer(1);
  key.selectAnswer(0);
  assert.equal(key.getOutcome().scientificName, 'Cymodocea rotundata');

  assert.equal(key.goBack(), true);
  key.selectAnswer(4);
  assert.equal(key.getOutcome().scientificName, 'Zostera capricorni');
  key.restart();
  assert.equal(key.canGoBack(), false);
});

test('invalid answers are rejected', () => {
  const key = new ManualIdentificationKey();
  assert.throws(() => key.selectAnswer(4), RangeError);
  key.selectAnswer(0);
  assert.throws(() => key.selectAnswer(2), RangeError);
  key.restart();
  key.selectAnswer(3);
  assert.throws(() => key.selectAnswer(2), RangeError);
});
