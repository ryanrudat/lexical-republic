/**
 * Porter Stemmer — reduces English words to morphological roots.
 * Based on Martin Porter's 1980 algorithm.
 * Used for target vocabulary matching so inflected forms
 * (arrived, arriving, submitted, etc.) count as using the base word.
 */

const step2list: Record<string, string> = {
  ational: 'ate', tional: 'tion', enci: 'ence', anci: 'ance',
  izer: 'ize', bli: 'ble', alli: 'al', entli: 'ent', eli: 'e',
  ousli: 'ous', ization: 'ize', ation: 'ate', ator: 'ate',
  alism: 'al', iveness: 'ive', fulness: 'ful', ousness: 'ous',
  aliti: 'al', iviti: 'ive', biliti: 'ble', logi: 'log',
};

const step3list: Record<string, string> = {
  icate: 'ic', ative: '', alize: 'al', iciti: 'ic',
  ical: 'ic', ful: '', ness: '',
};

const c = '[^aeiou]';          // consonant
const v = '[aeiouy]';          // vowel
const C = c + '[^aeiouy]*';    // consonant sequence
const V = v + '[aeiou]*';      // vowel sequence

const mgr0 = new RegExp('^(' + C + ')?' + V + C);                // [C]VC — m > 0
const meq1 = new RegExp('^(' + C + ')?' + V + C + '(' + V + ')?$'); // [C]VC[V] — m = 1
const mgr1 = new RegExp('^(' + C + ')?' + V + C + V + C);        // [C]VCVC — m > 1
const s_v  = new RegExp('^(' + C + ')?' + v);                     // vowel in stem

export function porterStem(w: string): string {
  if (w.length < 3) return w;

  let stem = w.toLowerCase();
  let re: RegExp;
  let re2: RegExp;

  // Step 1a
  if (/sses$/.test(stem)) stem = stem.replace(/sses$/, 'ss');
  else if (/ies$/.test(stem)) stem = stem.replace(/ies$/, 'i');
  else if (!/ss$/.test(stem)) stem = stem.replace(/s$/, '');

  // Step 1b
  re = /^(.+?)eed$/;
  re2 = /^(.+?)(ed|ing)$/;
  if (re.test(stem)) {
    const fp = re.exec(stem)!;
    if (mgr0.test(fp[1])) stem = stem.slice(0, -1);
  } else if (re2.test(stem)) {
    const fp = re2.exec(stem)!;
    stem = fp[1];
    if (s_v.test(stem)) {
      if (/(at|bl|iz)$/.test(stem)) stem += 'e';
      else if (/([^aeiouylsz])\1$/.test(stem)) stem = stem.slice(0, -1);
      else if (new RegExp('^' + C + v + '[^aeiouwxy]$').test(stem)) stem += 'e';
    }
  }

  // Step 1c
  if (/y$/.test(stem) && s_v.test(stem.slice(0, -1))) {
    stem = stem.slice(0, -1) + 'i';
  }

  // Step 2
  re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
  if (re.test(stem)) {
    const fp = re.exec(stem)!;
    if (mgr0.test(fp[1])) stem = fp[1] + step2list[fp[2]];
  }

  // Step 3
  re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
  if (re.test(stem)) {
    const fp = re.exec(stem)!;
    if (mgr0.test(fp[1])) stem = fp[1] + step3list[fp[2]];
  }

  // Step 4
  re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
  re2 = /^(.+?)(s|t)(ion)$/;
  if (re.test(stem)) {
    const fp = re.exec(stem)!;
    if (mgr1.test(fp[1])) stem = fp[1];
  } else if (re2.test(stem)) {
    const fp = re2.exec(stem)!;
    stem = fp[1] + fp[2];
    // mgr1 check: keep stem as-is if m > 1 (already set above)
  }

  // Step 5a
  re = /^(.+?)e$/;
  if (re.test(stem)) {
    const fp = re.exec(stem)!;
    if (mgr1.test(fp[1]) ||
        (meq1.test(fp[1]) && !new RegExp('^' + C + v + '[^aeiouwxy]$').test(fp[1]))) {
      stem = fp[1];
    }
  }

  // Step 5b
  if (/ll$/.test(stem) && mgr1.test(stem)) stem = stem.slice(0, -1);

  return stem;
}

/**
 * Check whether a student's text uses a target vocabulary word,
 * accepting any inflected or common derived form.
 */
export function matchesTargetWord(text: string, targetWord: string): boolean {
  const targetStem = porterStem(targetWord.toLowerCase());
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  return words.some(w => porterStem(w.replace(/[^a-z]/g, '')) === targetStem);
}
