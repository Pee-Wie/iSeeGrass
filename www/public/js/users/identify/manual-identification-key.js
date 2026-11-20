'use strict';

const NO_MATCH = {
  scientificName: null,
  fieldNote: 'These features do not match one of the ten species in this key. '
    + 'Do not force a result; use a local field guide or ask a specialist.',
};

const SPECIES = {
  rotundata: {
    scientificName: 'Cymodocea rotundata',
    fieldNote: 'Rounded leaf tip, 7–15 veins, and a well-developed leaf sheath.',
  },
  serrulata: {
    scientificName: 'Cymodocea serrulata',
    fieldNote: 'Serrated leaf tip, broad blade, and 13–17 longitudinal veins.',
  },
  uninervis: {
    scientificName: 'Halodule uninervis',
    fieldNote: 'A central vein and a three-toothed leaf tip.',
  },
  hemprichii: {
    scientificName: 'Thalassia hemprichii',
    fieldNote: 'Serrated strap leaves and a robust rhizome with leaf scars.',
  },
  capricorni: {
    scientificName: 'Zostera capricorni',
    fieldNote: 'Five longitudinal veins, cross-veins, and growth directly from the rhizome.',
  },
  isoetifolium: {
    scientificName: 'Syringodium isoetifolium',
    fieldNote: 'Its leaves are cylindrical in cross-section and taper to a point.',
  },
  ovalis: {
    scientificName: 'Halophila ovalis',
    fieldNote: 'The leaf surface is hairless and has about eight or more cross-veins.',
  },
  minor: {
    scientificName: 'Halophila minor',
    fieldNote: 'The leaf surface is hairless and has fewer than eight cross-veins.',
  },
  spinulosa: {
    scientificName: 'Halophila spinulosa',
    fieldNote: 'The fern-like leaflets are arranged in opposite pairs.',
  },
  tricostata: {
    scientificName: 'Halophila tricostata',
    fieldNote: 'The fern-like leaflets form a fan around the stem.',
  },
};

const QUESTIONS = {
  root: {
    prompt: 'Which description best matches the leaf form?',
    number: 1,
    choices: [
      { label: 'Strap-shaped leaves', illustration: 'strap', next: 'strap-profile' },
      { label: 'Branched leaves', illustration: 'branched', next: 'branched' },
      { label: 'Oval or oblong leaves', illustration: 'oval', next: 'oval-surface' },
      { label: 'Fern-like leaves', illustration: 'fern', next: 'fern-arrangement' },
    ],
  },
  'strap-profile': {
    prompt: 'Is the leaf flat or cylindrical in cross-section?',
    number: 2,
    choices: [
      { label: 'Cylindrical leaf that tapers to a point', illustration: 'cylindrical', outcome: 'isoetifolium' },
      { label: 'Flat, strap-shaped leaf', illustration: 'strap', next: 'strap-traits' },
      { label: 'Neither or unsure', illustration: 'unsure', outcome: null },
    ],
  },
  'strap-traits': {
    prompt: 'Which combination of tip, veins, and attachment matches best?',
    number: 3,
    choices: [
      { label: 'Rounded tip, 7–15 veins, and a clear leaf sheath', illustration: 'rounded-tip', outcome: 'rotundata' },
      { label: 'Serrated tip, broad blade (5–9 mm), 13–17 veins', illustration: 'serrated-tip', outcome: 'serrulata' },
      { label: 'One central vein and a three-toothed tip', illustration: 'trident-tip', outcome: 'uninervis' },
      { label: 'Serrated blade with a robust rhizome showing leaf scars', illustration: 'rhizome', outcome: 'hemprichii' },
      { label: 'Five lengthwise veins, cross-veins, and no upright shoot', illustration: 'cross-veins', outcome: 'capricorni' },
      { label: 'None of these or unsure', illustration: 'unsure', outcome: null },
    ],
  },
  branched: {
    prompt: 'Which branch pattern do you see?',
    number: 2,
    choices: [
      { label: 'Short and mostly straight', illustration: 'branch-short', outcome: null },
      { label: 'Long and spiralled', illustration: 'branch-spiral', outcome: null },
      { label: 'Neither or unsure', illustration: 'unsure', outcome: null },
    ],
  },
  'oval-surface': {
    prompt: 'Are there hairs on the leaf surface?',
    number: 2,
    choices: [
      { label: 'No visible hairs', illustration: 'oval-smooth', next: 'oval-veins' },
      { label: 'Hairs are visible', illustration: 'oval-hairy', outcome: null },
      { label: 'Unsure', illustration: 'unsure', outcome: null },
    ],
  },
  'oval-veins': {
    prompt: 'Count the cross-veins between the lengthwise veins.',
    number: 3,
    choices: [
      { label: 'About eight or more cross-veins', illustration: 'oval-many-veins', outcome: 'ovalis' },
      { label: 'Fewer than eight cross-veins', illustration: 'oval-few-veins', outcome: 'minor' },
      { label: 'Unable to count confidently', illustration: 'unsure', outcome: null },
    ],
  },
  'fern-arrangement': {
    prompt: 'How are the small leaflets arranged on the stem?',
    number: 2,
    choices: [
      { label: 'Opposite pairs along the stem', illustration: 'fern-pairs', outcome: 'spinulosa' },
      { label: 'A fan of leaflets around the stem', illustration: 'fern-fan', outcome: 'tricostata' },
      { label: 'Neither or unsure', illustration: 'unsure', outcome: null },
    ],
  },
};

export class ManualIdentificationKey {
  constructor() {
    this.restart();
  }

  getQuestion() {
    return this.outcome ? null : QUESTIONS[this.stage];
  }

  getOutcome() {
    return this.outcome;
  }

  canGoBack() {
    return this.previousStages.length > 0;
  }

  selectAnswer(index) {
    const question = this.getQuestion();
    if (!question || !Number.isInteger(index)
        || index < 0 || index >= question.choices.length) {
      throw new RangeError('Answer is not available for the current manual-key question.');
    }

    const choice = question.choices[index];
    this.previousStages.push(this.stage);
    if (choice.next) {
      this.stage = choice.next;
      return;
    }
    this.outcome = choice.outcome ? { ...SPECIES[choice.outcome] } : { ...NO_MATCH };
  }

  goBack() {
    if (!this.canGoBack()) return false;
    this.stage = this.previousStages.pop();
    this.outcome = null;
    return true;
  }

  restart() {
    this.stage = 'root';
    this.outcome = null;
    this.previousStages = [];
  }
}

const ILLUSTRATIONS = {
  strap: '<path class="manual-key-svg__filled" d="M38 92C34 64 18 41 17 12C31 33 42 64 44 92ZM44 92C41 62 33 33 36 7C47 30 49 62 48 92ZM49 92C49 62 47 33 52 9C60 35 58 66 54 92ZM55 92C59 62 67 34 72 12C74 43 65 70 60 92ZM61 92C70 66 81 44 86 19C88 50 75 77 66 92Z"/>',
  branched: '<path d="M49 92C47 73 49 55 50 36M49 72C37 64 29 54 21 42M50 78C63 69 72 57 80 43M49 57C40 47 36 36 34 23M51 53C60 42 65 31 68 18M22 43L13 31M22 43L31 32M80 44L88 31M80 44L70 33M34 24L27 15M34 24L42 15M68 19L61 10M68 19L76 11"/>',
  oval: '<path d="M49 92V53M49 72L29 59M49 67L69 53M49 57L39 42M49 57L59 40"/><ellipse class="manual-key-svg__filled" cx="26" cy="48" rx="10" ry="20" transform="rotate(-34 26 48)"/><ellipse class="manual-key-svg__filled" cx="72" cy="42" rx="10" ry="20" transform="rotate(32 72 42)"/><ellipse class="manual-key-svg__filled" cx="40" cy="31" rx="8" ry="16" transform="rotate(-22 40 31)"/><ellipse class="manual-key-svg__filled" cx="60" cy="29" rx="8" ry="16" transform="rotate(22 60 29)"/>',
  fern: '<path d="M49 92V9M49 76L30 63M49 68L68 55M49 58L30 45M49 49L68 36M49 39L31 26M49 30L67 17"/><ellipse class="manual-key-svg__filled" cx="25" cy="61" rx="8" ry="4" transform="rotate(24 25 61)"/><ellipse class="manual-key-svg__filled" cx="73" cy="53" rx="8" ry="4" transform="rotate(-24 73 53)"/><ellipse class="manual-key-svg__filled" cx="25" cy="43" rx="8" ry="4" transform="rotate(24 25 43)"/><ellipse class="manual-key-svg__filled" cx="73" cy="35" rx="8" ry="4" transform="rotate(-24 73 35)"/><ellipse class="manual-key-svg__filled" cx="26" cy="24" rx="8" ry="4" transform="rotate(24 26 24)"/><ellipse class="manual-key-svg__filled" cx="72" cy="16" rx="8" ry="4" transform="rotate(-24 72 16)"/>',
  cylindrical: '<path d="M34 92C34 65 39 35 48 9M49 92C49 63 50 34 52 9M64 92C62 63 64 34 72 9"/><circle class="manual-key-svg__filled" cx="48" cy="9" r="3"/><circle class="manual-key-svg__filled" cx="52" cy="9" r="3"/><circle class="manual-key-svg__filled" cx="72" cy="9" r="3"/>',
  'rounded-tip': '<path class="manual-key-svg__filled" d="M29 92C29 59 30 32 33 15C34 8 44 8 45 15C48 35 48 65 47 92ZM55 92C54 61 56 33 59 15C60 8 70 8 71 15C74 36 73 66 72 92Z"/>',
  'serrated-tip': '<path class="manual-key-svg__filled" d="M31 92L33 19L37 24L40 13L44 23L48 10L52 22L56 12L60 24L64 16L66 92Z"/>',
  'trident-tip': '<path class="manual-key-svg__filled" d="M34 92L39 21L46 29L50 9L55 29L63 20L67 92Z"/><path d="M39 21L34 13M39 21L45 14M63 20L59 12M63 20L69 13"/>',
  rhizome: '<path d="M15 80H84M30 80V22M48 80V12M66 80V27M30 68H34M48 68H52M66 68H70M48 50H52"/>',
  'cross-veins': '<path class="manual-key-svg__filled" d="M21 92C24 64 29 35 37 12C45 34 45 63 43 92ZM44 92C46 60 51 32 58 10C67 38 67 64 66 92ZM66 92C69 64 74 40 81 20C84 49 82 73 80 92Z"/><path d="M32 36L70 36M30 53L70 53M28 70L69 70M26 86L68 86M40 25L62 25"/>',
  'branch-short': '<path d="M49 92L44 45L25 26M44 45L63 27M42 59L26 43M42 59L60 42"/>',
  'branch-spiral': '<path d="M49 92C27 71 75 62 47 47C19 31 68 26 49 9M35 65C20 51 24 43 33 39M61 49C76 36 69 28 62 25"/>',
  'oval-smooth': '<ellipse class="manual-key-svg__filled" cx="49" cy="32" rx="18" ry="27"/><path d="M49 58V92M49 36L25 51M49 40L74 55"/>',
  'oval-hairy': '<ellipse class="manual-key-svg__filled" cx="49" cy="32" rx="18" ry="27"/><path d="M49 58V92M49 36L25 51M49 40L74 55M30 16L23 10M35 9L31 2M42 5L41 0M56 5L57 0M64 10L69 4M69 18L77 13"/>',
  'oval-many-veins': '<ellipse class="manual-key-svg__filled" cx="49" cy="42" rx="25" ry="34"/><path d="M49 75V8M32 20L65 60M28 32L68 52M28 46L68 34M34 62L64 20"/>',
  'oval-few-veins': '<ellipse class="manual-key-svg__filled" cx="49" cy="42" rx="25" ry="34"/><path d="M49 75V8M29 31L68 49M31 54L65 29"/>',
  'fern-pairs': '<path d="M49 92V8M49 70L26 59M49 70L72 59M49 51L26 40M49 51L72 40M49 32L29 21M49 32L69 21"/><ellipse class="manual-key-svg__filled" cx="24" cy="58" rx="8" ry="4"/><ellipse class="manual-key-svg__filled" cx="74" cy="58" rx="8" ry="4"/><ellipse class="manual-key-svg__filled" cx="24" cy="39" rx="8" ry="4"/><ellipse class="manual-key-svg__filled" cx="74" cy="39" rx="8" ry="4"/>',
  'fern-fan': '<path d="M49 92V44M49 66L22 36M49 66L34 28M49 66L49 22M49 66L64 28M49 66L77 36"/><ellipse class="manual-key-svg__filled" cx="21" cy="33" rx="9" ry="4"/><ellipse class="manual-key-svg__filled" cx="33" cy="25" rx="9" ry="4"/><ellipse class="manual-key-svg__filled" cx="49" cy="19" rx="9" ry="4"/><ellipse class="manual-key-svg__filled" cx="65" cy="25" rx="9" ry="4"/><ellipse class="manual-key-svg__filled" cx="78" cy="33" rx="9" ry="4"/>',
  unsure: '<circle cx="49" cy="45" r="31"/><path d="M39 36C40 22 61 22 62 36C63 44 49 46 49 56M49 68V69"/>',
};

function illustrationSvg(name) {
  const paths = ILLUSTRATIONS[name] ?? ILLUSTRATIONS.unsure;
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Schematic seagrass illustration" focusable="false">
    <path d="M17 92H82" class="manual-key-svg__rhizome"/>
    <g class="manual-key-svg__leaf">${paths}</g>
  </svg>`;
}

export function openManualIdentificationDialog({ onSelect, onClose } = {}) {
  const key = new ManualIdentificationKey();
  const returnFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'manual-key-dialog';
  dialog.setAttribute('aria-labelledby', 'manualKeyTitle');
  dialog.innerHTML = `
    <div class="manual-key-dialog__header">
      <div>
        <p class="manual-key-dialog__eyebrow">INDO-PACIFIC FIELD KEY</p>
        <h2 id="manualKeyTitle">Manual identification</h2>
      </div>
      <button class="manual-key-dialog__close" type="button" aria-label="Close manual identification key">×</button>
    </div>
    <div class="manual-key-dialog__body" aria-live="polite"></div>
    <div class="manual-key-dialog__footer">
      <button class="manual-key-dialog__back" type="button">Back</button>
      <button class="manual-key-dialog__restart" type="button">Start over</button>
    </div>`;
  document.body.appendChild(dialog);

  const body = dialog.querySelector('.manual-key-dialog__body');
  const backButton = dialog.querySelector('.manual-key-dialog__back');
  const restartButton = dialog.querySelector('.manual-key-dialog__restart');

  const close = () => {
    if (dialog.open) dialog.close();
    dialog.remove();
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
    onClose?.();
  };
  dialog.querySelector('.manual-key-dialog__close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) close();
  });

  const render = () => {
    body.replaceChildren();
    const outcome = key.getOutcome();
    if (outcome) {
      const result = document.createElement('section');
      result.className = outcome.scientificName
        ? 'manual-key-result'
        : 'manual-key-result manual-key-result--unsupported';
      const heading = document.createElement('h3');
      heading.textContent = outcome.scientificName || 'No supported match';
      const note = document.createElement('p');
      note.textContent = outcome.fieldNote;
      result.append(heading, note);
      if (outcome.scientificName) {
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'manual-key-result__save';
        saveButton.textContent = 'Save this manual identification';
        saveButton.addEventListener('click', () => {
          onSelect?.(outcome);
          close();
        });
        result.append(saveButton);
      }
      body.append(result);
      backButton.disabled = !key.canGoBack();
      return;
    }

    const question = key.getQuestion();
    const step = document.createElement('p');
    step.className = 'manual-key-dialog__step';
    step.textContent = `Step ${question.number} · Indo-Pacific`;
    const prompt = document.createElement('h3');
    prompt.className = 'manual-key-dialog__prompt';
    prompt.textContent = question.prompt;
    const note = document.createElement('p');
    note.className = 'manual-key-dialog__hint';
    note.textContent = 'Choose the closest visible trait. Illustrations are schematic; if unsure, stop.';
    const grid = document.createElement('div');
    grid.className = 'manual-key-choices';

    question.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'manual-key-choice';
      button.innerHTML = illustrationSvg(choice.illustration);
      const label = document.createElement('span');
      label.textContent = choice.label;
      button.append(label);
      button.addEventListener('click', () => {
        key.selectAnswer(index);
        render();
      });
      grid.append(button);
    });

    body.append(step, prompt, note, grid);
    backButton.disabled = !key.canGoBack();
    grid.querySelector('button')?.focus();
  };

  backButton.addEventListener('click', () => {
    if (key.goBack()) render();
  });
  restartButton.addEventListener('click', () => {
    key.restart();
    render();
  });

  dialog.addEventListener('close', () => {
    dialog.remove();
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
  }, { once: true });

  render();
  dialog.showModal();
  dialog.querySelector('.manual-key-choice')?.focus();
  return dialog;
}
