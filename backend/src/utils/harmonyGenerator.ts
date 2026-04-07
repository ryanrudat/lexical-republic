import prisma from './prisma';
import { getOpenAI, OPENAI_MODEL } from './openai';
import { getWeekConfig } from '../data/week-configs';
import { getStoryPlan } from '../data/storyPlans';
import { getRouteWeeks } from '../data/narrative-routes';
import { getHarmonyCharacters, getCharacterPhase } from '../data/harmonyCharacters';
import {
  getLocationsForWeek,
  getRegulationsForWeek,
  getActiveCitizens,
  WEEKLY_CULTURE,
  APPROVED_MEDIA,
  FOOD_CULTURE,
  DOMESTIC_LIFE,
  COMMUNITY_TRADITIONS,
  CHILDRENS_WORLD,
} from '../data/harmonyWorldBible';
import { STATIC_BULLETINS } from '../data/harmonyBulletins';
import { STATIC_PEARL_TIPS } from '../data/harmonyPearlTips';
import { STATIC_COMMUNITY_NOTICES, STATIC_SECTOR_REPORTS } from '../data/harmonyCommunityContent';
import type { NarrativeRouteId } from '../data/narrative-routes';
import type { BulletinQuestion } from '../data/harmonyBulletins';

/** In-flight generation promises per classId — prevents duplicate concurrent generation. */
const generationLocks = new Map<string, Promise<void>>();

/** Target counts per content type. */
const DEFAULT_CONTENT_COUNTS: Record<string, number> = {
  feed: 5,
  bulletin: 1,
  pearl_tip: 1,
  community_notice: 2,
  sector_report: 1,
  censure_grammar: 2,
  censure_vocab: 2,
  censure_replace: 1,
};

interface GeneratedPost {
  authorLabel: string;
  content: string;
  postType: string;
  pearlNote: string | null;
  censureData: Record<string, unknown> | null;
  bulletinData?: { refNumber: string; questions: BulletinQuestion[] } | null;
}

/**
 * Returns vocabulary context for a given week, falling back through
 * WeekConfig → StoryPlan so it works for all 18 weeks.
 */
function getVocabContext(weekNumber: number) {
  const config = getWeekConfig(weekNumber);
  const story = getStoryPlan(weekNumber);

  return {
    targetWords: config?.targetWords ?? story?.newWords ?? [],
    previousWords: config?.previousWords ?? story?.knownWords ?? [],
    grammarTarget: config?.grammarTarget ?? story?.grammarFocus ?? 'general accuracy',
  };
}

/**
 * Collects all review words from prior route-weeks only.
 * Condensed students don't get words from weeks they skipped.
 */
function getAllReviewWords(weekNumber: number, routeId: string = 'full'): string[] {
  const routeWeeks = getRouteWeeks(routeId);
  const words: string[] = [];
  for (const w of routeWeeks) {
    if (w >= weekNumber) break;
    const ctx = getVocabContext(w);
    words.push(...ctx.targetWords);
  }
  return [...new Set(words)];
}

function buildGenerationPrompt(weekNumber: number, routeId: string = 'full'): string {
  const { targetWords, grammarTarget } = getVocabContext(weekNumber);
  const allReview = getAllReviewWords(weekNumber, routeId);

  // World bible enrichment
  const locations = getLocationsForWeek(weekNumber);
  const regulations = getRegulationsForWeek(weekNumber);
  const culture = WEEKLY_CULTURE[weekNumber];
  const characters = getHarmonyCharacters();
  const characterContext = characters.map(c => {
    const phase = getCharacterPhase(c, weekNumber, routeId as NarrativeRouteId);
    return `- ${c.id} (${c.role}): Voice: ${c.voiceRules} Mood: "${phase.mood}". ${phase.promptFragment}`;
  }).join('\n');

  // Active background citizens for this week
  const activeCitizens = getActiveCitizens(weekNumber)
    .filter(c => !characters.some(ch => ch.id === c.id))
    .map(c => `- ${c.id}: ${c.trait} (${c.tower})`)
    .join('\n');

  // World texture for the prompt
  const foodNames = FOOD_CULTURE.cafeteriaDishes.map(d => d.name).join(', ');
  const mediaNames = APPROVED_MEDIA.television.map(t => t.name).join(', ');
  const hobbyNames = DOMESTIC_LIFE.approvedHobbies.map(h => h.name).join(', ');

  return `You are generating social media posts for "Harmony" — the state-controlled social network in a dystopian world called the Lexical Republic.

CRITICAL RULE: Write about PEOPLE, not about vocabulary. Every post must express a character's inner life, daily experience, or emotional state. Target words should appear naturally as part of that expression — never as the reason for the post. NEVER write a post that reads like a vocabulary exercise.

═══ WORLD ═══
Citizens live in Residential Towers 11-15, work as Clarity Associates at Central Filing Hall, eat at Cafeteria Block 7, and socialize at Sector 4 Community Center and Recreation Yard 3. The tone is "forced happy" — citizens sound polite and compliant on the surface. Think Orwell meets social media, played through mundane daily life.

DAILY LIFE (use these details naturally):
- Food: ${foodNames}
- Tea: Clarity Tea at 10:00 & 15:00 — this week: "${culture?.clarityTeaFlavor ?? 'Standard Blend'}". ${FOOD_CULTURE.clarityTeaLore.slice(0, 100)}
- Media: ${mediaNames}
- Hobbies: ${hobbyNames}
- Home: ${DOMESTIC_LIFE.towerLiving[1]} ${DOMESTIC_LIFE.towerLiving[2]}
- Pets: ${DOMESTIC_LIFE.pets.slice(0, 120)}
- Children: ${CHILDRENS_WORLD.academy.slice(0, 80)} ${CHILDRENS_WORLD.mascot.slice(0, 60)}
- Traditions: ${COMMUNITY_TRADITIONS.monthlyDessert.slice(0, 80)} ${COMMUNITY_TRADITIONS.morningAnnouncements.slice(0, 100)}

Locations: ${locations.map(l => l.name).join(', ')}
Regulations: ${regulations.map(r => r.code).join(', ')}
Slogan: "${culture?.slogan ?? 'Harmony Through Clarity'}"

═══ CHARACTERS ═══
${characterContext}

BACKGROUND CITIZENS (pick 1-2 for feed posts):
${activeCitizens}

═══ VOCABULARY ═══
Week ${weekNumber} target words: ${targetWords.join(', ')}
Grammar focus: ${grammarTarget}
Review words from previous weeks: ${allReview.length > 0 ? allReview.join(', ') : 'none'}

VOCABULARY BALANCE (per post):
- 3-5 CURRENT target words (primary exposure — required)
- 1-2 REVIEW words from previous weeks (spaced repetition — encouraged, not forced)
- Review words should appear in NEW contexts, different from when they were first introduced. If "arrive" was learned in a work context, recycle it in a domestic or social context ("the cat arrives at my door every morning"). This context variation builds deeper word knowledge.
- Recent review words (last 1-2 weeks) should appear more often than older review words.
- NEVER force a review word. If it doesn't serve the character, leave it out.

═══ GOOD vs BAD POSTS ═══

GOOD (character-first, life beyond work):
"The morning light arrived through my tower window at 06:14. I followed my standard routine — tea, desk check, walk to Filing Hall. I cannot describe how satisfying a confirmed schedule feels."
→ We learn about this person. Target words serve the character.

GOOD (mundane texture):
"The lady in Cafeteria Block 7 slipped me an extra bread roll. Should I report it? It's not standard procedure. I'll check the handbook later. My feet hurt."
→ Humor, relatability, a small human moment. Words are natural.

BAD (vocabulary drill):
"I arrived early and followed every step on the checklist. My supervisor confirmed my assignment before I could submit anything. The standard is clear: check your work twice."
→ No person, no feeling, no life. Just target words connected by grammar.

═══ POST TOPICS (vary across these) ═══
Morning routines and tower life | Cafeteria food opinions | Clarity Tea rituals | Walking groups | TV shows (Our Harmonious Kitchen, Sparky) | Knitting, calligraphy, puzzles | Balcony plants and birds | Children's achievements | Family memories and recipes | The window table mystery | Small beautiful things on the commute | Being tired after a long shift

═══ GENERATION INSTRUCTIONS ═══

1. THREE "feed" posts from different citizens. Each:
   - Is about the character's LIFE, not just work
   - Uses 3-5 target words naturally
   - Is 2-3 sentences, max 280 characters
   - Contains at least one specific, mundane, human detail
   - Uses "Citizen-XXXX" format for designations

2. ONE "feed" post from Citizen-4488:
   - A quietly unsettling personal story using target words
   - ONE deliberate grammar error matching "${grammarTarget}"
   - Ends with self-reassurance ("Everything is fine", "I should not worry")
   - References missing neighbor, the cat, or something absent

3. TWO "censure_grammar" — contain 1-2 grammar errors related to "${grammarTarget}"
4. TWO "censure_vocab" — use a target word INCORRECTLY (wrong meaning)
5. ONE "censure_replace" — vague word where a specific target word should go

RESPOND WITH VALID JSON:
{
  "posts": [
    {
      "authorLabel": "Citizen-XXXX",
      "content": "the post text",
      "postType": "feed",
      "pearlNote": "brief PEARL observation or null",
      "censureData": null
    },
    {
      "authorLabel": "Citizen-XXXX",
      "content": "text WITH the error included",
      "postType": "censure_grammar",
      "pearlNote": null,
      "censureData": {
        "errorType": "grammar",
        "errorWord": "the incorrect word/phrase",
        "correction": "the correct version",
        "explanation": "brief grammar rule explanation",
        "options": ["option A", "option B", "option C", "option D"],
        "correctIndex": 0
      }
    },
    {
      "authorLabel": "Citizen-XXXX",
      "content": "text with vocab misuse",
      "postType": "censure_vocab",
      "pearlNote": null,
      "censureData": {
        "errorType": "vocab",
        "errorWord": "the misused word",
        "correction": "what it should be or how it should be used",
        "explanation": "why the usage is wrong",
        "options": ["To formally hand in work (correct)", "To carry something (wrong)", "To eat at a restaurant (wrong)", "To clean a surface (wrong)"],
        "correctIndex": 0
      }
    },
    {
      "authorLabel": "Citizen-XXXX",
      "content": "text with a [BLANK] where target word goes",
      "postType": "censure_replace",
      "pearlNote": null,
      "censureData": {
        "errorType": "replace",
        "blankWord": "the generic word that should be replaced",
        "correction": "the correct target word",
        "explanation": "why this word fits",
        "options": ["target word 1", "target word 2", "target word 3", "target word 4"],
        "correctIndex": 0
      }
    }
  ]
}

IMPORTANT:
- Posts: 2-3 sentences, max 280 characters each
- A2-B1 English for Taiwanese Grade 10 students
- Each post must contain at least one specific, mundane, human detail
- censure_vocab options MUST be full definition sentences, NOT single words
- censure_grammar options MUST be single words/phrases showing different forms
- censure_replace options MUST be single target vocabulary words
- All citizen designations use "Citizen-XXXX" format (4-digit, zero-padded)`;
}

/**
 * Collect pre-written static content for new post types (bulletins, tips, notices, reports).
 * Also includes existing static censure items and feed fallbacks.
 */
function buildStaticPosts(weekNumber: number): GeneratedPost[] {
  const posts: GeneratedPost[] = [];

  // Bulletins
  for (const b of STATIC_BULLETINS[weekNumber] ?? []) {
    posts.push({
      authorLabel: b.authorLabel,
      content: b.content,
      postType: 'bulletin',
      pearlNote: b.pearlNote,
      censureData: null,
      bulletinData: { refNumber: b.refNumber, questions: b.questions },
    });
  }

  // PEARL tips
  for (const t of STATIC_PEARL_TIPS[weekNumber] ?? []) {
    posts.push({
      authorLabel: t.authorLabel,
      content: t.content,
      postType: 'pearl_tip',
      pearlNote: t.pearlNote,
      censureData: null,
      bulletinData: null,
    });
  }

  // Community notices
  for (const n of STATIC_COMMUNITY_NOTICES[weekNumber] ?? []) {
    posts.push({
      authorLabel: n.authorLabel,
      content: n.content,
      postType: 'community_notice',
      pearlNote: n.pearlNote,
      censureData: null,
      bulletinData: null,
    });
  }

  // Sector reports
  for (const r of STATIC_SECTOR_REPORTS[weekNumber] ?? []) {
    posts.push({
      authorLabel: r.authorLabel,
      content: r.content,
      postType: 'sector_report',
      pearlNote: r.pearlNote,
      censureData: null,
      bulletinData: null,
    });
  }

  // Static censure items (weeks 1-3)
  for (const c of STATIC_CENSURE_ITEMS[weekNumber] ?? []) {
    posts.push(c);
  }

  return posts;
}

/**
 * Generate Harmony posts for a specific week + class.
 * Uses per-type counting: loads static content first, then AI-generates any remaining needs.
 */
export async function generateHarmonyPosts(
  weekNumber: number,
  classId: string,
  routeId: string = 'full',
): Promise<void> {
  // Count existing posts by type for this week+class
  const existingCounts = await prisma.harmonyPost.groupBy({
    by: ['postType'],
    where: { weekNumber, classId },
    _count: true,
  });
  const countMap = new Map(existingCounts.map(e => [e.postType, e._count]));

  // Determine which types still need content
  const needed: Record<string, number> = {};
  for (const [type, target] of Object.entries(DEFAULT_CONTENT_COUNTS)) {
    const existing = countMap.get(type) ?? 0;
    if (existing < target) {
      needed[type] = target - existing;
    }
  }

  if (Object.keys(needed).length === 0) return; // All types populated

  // 1. Load static content first
  const staticPosts = buildStaticPosts(weekNumber);

  // Track what static content satisfies
  const remaining = { ...needed };
  const toInsert: GeneratedPost[] = [];

  for (const post of staticPosts) {
    if ((remaining[post.postType] ?? 0) > 0) {
      toInsert.push(post);
      remaining[post.postType]!--;
    }
  }

  // 2. AI-generate anything still needed (feed posts + censure items primarily)
  const needsAI = Object.values(remaining).some(n => n > 0);
  if (needsAI) {
    const openai = getOpenAI();
    if (openai) {
      try {
        const prompt = buildGenerationPrompt(weekNumber, routeId);
        const completion = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Generate Harmony posts for Week ${weekNumber}.` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 3000,
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) throw new Error('Empty AI response');

        const parsed = JSON.parse(raw);
        const aiPosts: GeneratedPost[] = Array.isArray(parsed.posts)
          ? parsed.posts.map((p: any) => ({ ...p, bulletinData: null }))
          : [];

        for (const post of aiPosts) {
          if ((remaining[post.postType] ?? 0) > 0) {
            toInsert.push(post);
            remaining[post.postType]!--;
          }
        }
      } catch (err) {
        console.error('Harmony AI generation failed, using fallback:', err);
      }
    }

    // 3. Final fallback for any still-needed feed/censure posts
    const fallbackPosts = buildFallbackPosts(weekNumber);
    for (const post of fallbackPosts) {
      if ((remaining[post.postType] ?? 0) > 0) {
        toInsert.push(post);
        remaining[post.postType]!--;
      }
    }
  }

  // Insert all collected posts
  let inserted = 0;
  for (const post of toInsert) {
    await prisma.harmonyPost.create({
      data: {
        authorLabel: post.authorLabel,
        content: post.content,
        postType: post.postType,
        status: 'approved',
        pearlNote: post.pearlNote,
        censureData: (post.censureData ?? undefined) as any,
        bulletinData: (post.bulletinData ?? undefined) as any,
        weekNumber,
        classId,
        isGenerated: !staticPosts.includes(post),
      },
    });
    inserted++;
  }

  if (inserted > 0) {
    console.log(`  Harmony: generated ${inserted} posts for week ${weekNumber}, class ${classId}`);
  }
}

/* ─── Week-specific static censure content ─────────────────────── */

const STATIC_CENSURE_ITEMS: Record<number, GeneratedPost[]> = {
  1: [
    // ── Grammar: present-simple errors ──────────────────────────────
    {
      authorLabel: 'Citizen-3050',
      content: 'Every morning I arrives at the Ministry and check my assignment list. It is the standard way to begin.',
      postType: 'censure_grammar',
      pearlNote: null,
      censureData: {
        errorType: 'grammar',
        errorWord: 'arrives',
        correction: 'arrive',
        explanation: 'With "I" we use the base form of the verb: "I arrive", not "I arrives".',
        options: ['arrive', 'arrives', 'arriving', 'arrived'],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-0033',
      content: 'The supervisor describe the new procedure to us every Monday. She is very careful about the standard.',
      postType: 'censure_grammar',
      pearlNote: null,
      censureData: {
        errorType: 'grammar',
        errorWord: 'describe',
        correction: 'describes',
        explanation: '"The supervisor" is third person singular and requires "describes" with an -s.',
        options: ['describes', 'describe', 'describing', 'described'],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-0041',
      content: 'Our team submit every report on time. We always confirm the details before sending anything.',
      postType: 'censure_grammar',
      pearlNote: null,
      censureData: {
        errorType: 'grammar',
        errorWord: 'submit',
        correction: 'submits',
        explanation: '"Our team" is a singular collective noun and needs "submits" in present simple.',
        options: ['submits', 'submit', 'submitting', 'submitted'],
        correctIndex: 0,
      },
    },

    // ── Vocab: target word misuse ───────────────────────────────────
    {
      authorLabel: 'Citizen-4030',
      content: 'I need to approve my lunch box before going to the cafeteria. I am always hungry by noon.',
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: 'approve',
        correction: '"Approve" means to officially accept or agree to something, not to prepare food.',
        explanation: 'The word "approve" is used incorrectly here. It means to officially accept, not to prepare.',
        options: [
          'To officially accept or agree to something',
          'To prepare or pack something',
          'To eat or consume quickly',
          'To throw something away',
        ],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-5180',
      content: 'Please arrive the documents on the shelf so they look neat and organized for the supervisor.',
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: 'arrive',
        correction: '"Arrive" means to reach or come to a place, not to arrange things.',
        explanation: 'The word "arrive" is used incorrectly here. It means to reach a destination, not to organize.',
        options: [
          'To reach or come to a place',
          'To arrange or organize things',
          'To copy or duplicate something',
          'To throw something away',
        ],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-6221',
      content: 'She confirmed the entire room by closing all the windows and locking the door.',
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: 'confirmed',
        correction: '"Confirm" means to verify or establish that something is true, not to secure a room.',
        explanation: 'The word "confirm" is used incorrectly here. It means to verify, not to make secure.',
        options: [
          'To verify or establish that something is true',
          'To make a place safe or secure',
          'To paint or decorate a room',
          'To heat or cool a space',
        ],
        correctIndex: 0,
      },
    },

    // ── Replace: fill in the blank ──────────────────────────────────
    {
      authorLabel: 'Citizen-7100',
      content: 'I need to [give] my report to the supervisor before the end of my shift. She requires all documents by 5 PM.',
      postType: 'censure_replace',
      pearlNote: null,
      censureData: {
        errorType: 'replace',
        blankWord: 'give',
        correction: 'submit',
        explanation: '"Submit" means to formally hand in work or documents, which fits this context better than "give".',
        options: ['submit', 'arrive', 'describe', 'assign'],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-8055',
      content: 'The manager will [look at] every document to make sure they follow the standard. Nothing is sent without review.',
      postType: 'censure_replace',
      pearlNote: null,
      censureData: {
        errorType: 'replace',
        blankWord: 'look at',
        correction: 'check',
        explanation: '"Check" means to examine something carefully to verify it is correct — more precise than "look at".',
        options: ['check', 'follow', 'confirm', 'report'],
        correctIndex: 0,
      },
    },
  ],

  // ═══ Week 2: past-simple-vs-present ═══════════════════════════════
  2: [
    // ── Grammar: past-simple-vs-present errors ──────────────────────
    {
      authorLabel: 'Citizen-2780',
      content: 'Yesterday the supervisor notice a mistake in my report. She asked me to fix it immediately.',
      postType: 'censure_grammar',
      pearlNote: null,
      censureData: {
        errorType: 'grammar',
        errorWord: 'notice',
        correction: 'noticed',
        explanation: '"Yesterday" signals past tense. The verb must be "noticed" (past simple), not "notice" (present).',
        options: ['noticed', 'notice', 'notices', 'noticing'],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-0027',
      content: 'Last week the Ministry remove three citizens from our department. We were not informed why.',
      postType: 'censure_grammar',
      pearlNote: null,
      censureData: {
        errorType: 'grammar',
        errorWord: 'remove',
        correction: 'removed',
        explanation: '"Last week" requires past simple. The correct form is "removed", not "remove".',
        options: ['removed', 'remove', 'removes', 'removing'],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-0019',
      content: 'I update all the records this morning before my break. Everything is now in order.',
      postType: 'censure_grammar',
      pearlNote: null,
      censureData: {
        errorType: 'grammar',
        errorWord: 'update',
        correction: 'updated',
        explanation: '"This morning" (completed action) requires past simple: "updated", not "update".',
        options: ['updated', 'update', 'updates', 'updating'],
        correctIndex: 0,
      },
    },

    // ── Vocab: target word misuse ───────────────────────────────────
    {
      authorLabel: 'Citizen-3344',
      content: 'Please compare this box to the storage room. It is too heavy for one person.',
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: 'compare',
        correction: '"Compare" means to examine differences between two things, not to move or carry.',
        explanation: 'The word "compare" is used incorrectly. It means to look at similarities and differences.',
        options: [
          'To examine differences or similarities between two things',
          'To carry or move something to a new place',
          'To open or unlock a container',
          'To break something into pieces',
        ],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-4510',
      content: 'I will require my lunch at 12:30 today. The cafeteria has a new menu this week.',
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: 'require',
        correction: '"Require" means to need something or make it necessary, not to eat or have a meal.',
        explanation: 'The word "require" is used incorrectly. It means to need or demand, not to consume.',
        options: [
          'To need something or make it necessary',
          'To eat or have a meal',
          'To cook or prepare food',
          'To order or purchase something',
        ],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-5890',
      content: 'She informed the entire room with beautiful flowers. It looked wonderful for the ceremony.',
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: 'informed',
        correction: '"Inform" means to tell someone about something, not to decorate.',
        explanation: 'The word "inform" is used incorrectly. It means to give information, not to decorate a space.',
        options: [
          'To tell someone about something or give information',
          'To decorate or fill a space with items',
          'To clean or tidy a room',
          'To paint or color a surface',
        ],
        correctIndex: 0,
      },
    },

    // ── Replace: fill in the blank ──────────────────────────────────
    {
      authorLabel: 'Citizen-6200',
      content: 'The old machine was broken, so we had to [put in] a new one. The technician finished by noon.',
      postType: 'censure_replace',
      pearlNote: null,
      censureData: {
        errorType: 'replace',
        blankWord: 'put in',
        correction: 'replace',
        explanation: '"Replace" means to put something new in the place of something old — more precise than "put in".',
        options: ['replace', 'notice', 'include', 'inform'],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-7310',
      content: 'Citizens must [ask for] permission before leaving the building. This is a strict rule.',
      postType: 'censure_replace',
      pearlNote: null,
      censureData: {
        errorType: 'replace',
        blankWord: 'ask for',
        correction: 'request',
        explanation: '"Request" means to formally ask for something — more appropriate in official contexts than "ask for".',
        options: ['request', 'change', 'remove', 'update'],
        correctIndex: 0,
      },
    },
  ],

  // ═══ Week 3: modals ═══════════════════════════════════════════════
  3: [
    // ── Grammar: modal errors ───────────────────────────────────────
    {
      authorLabel: 'Citizen-3820',
      content: 'Citizens should maintains a clean workspace at all times. The Ministry expects order.',
      postType: 'censure_grammar',
      pearlNote: null,
      censureData: {
        errorType: 'grammar',
        errorWord: 'maintains',
        correction: 'maintain',
        explanation: 'After a modal verb like "should", use the base form: "should maintain", not "should maintains".',
        options: ['maintain', 'maintains', 'maintained', 'maintaining'],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-0042',
      content: 'You must to complete all forms before your shift ends. There are no exceptions.',
      postType: 'censure_grammar',
      pearlNote: null,
      censureData: {
        errorType: 'grammar',
        errorWord: 'to complete',
        correction: 'complete',
        explanation: '"Must" is followed directly by the base verb: "must complete", not "must to complete".',
        options: ['complete', 'to complete', 'completing', 'completed'],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-0038',
      content: 'We can identifies errors faster with the new system. It was installed last week.',
      postType: 'censure_grammar',
      pearlNote: null,
      censureData: {
        errorType: 'grammar',
        errorWord: 'identifies',
        correction: 'identify',
        explanation: 'After "can", use the base form of the verb: "can identify", not "can identifies".',
        options: ['identify', 'identifies', 'identified', 'identifying'],
        correctIndex: 0,
      },
    },

    // ── Vocab: target word misuse ───────────────────────────────────
    {
      authorLabel: 'Citizen-4920',
      content: 'I will delay my co-worker to the supervisor for her excellent work. She deserves recognition.',
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: 'delay',
        correction: '"Delay" means to make something happen later than planned, not to recommend someone.',
        explanation: 'The word "delay" is used incorrectly. It means to postpone, not to recommend or praise.',
        options: [
          'To make something happen later than planned',
          'To recommend or introduce someone',
          'To praise or congratulate someone',
          'To replace someone in a role',
        ],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-5630',
      content: 'Please separate the meeting to 3 PM. We need more time to prepare the documents.',
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: 'separate',
        correction: '"Separate" means to divide or keep things apart, not to move an event to a different time.',
        explanation: 'The word "separate" is used incorrectly. It means to divide, not to reschedule.',
        options: [
          'To divide or keep things apart from each other',
          'To move an event to a different time',
          'To cancel or end something',
          'To begin or start something new',
        ],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-6740',
      content: 'He forwarded the broken chair by adding glue and new screws. It looks good now.',
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: 'forwarded',
        correction: '"Forward" means to send something on to another person or place, not to repair.',
        explanation: 'The word "forward" is used incorrectly. It means to send onward, not to fix or repair.',
        options: [
          'To send something on to another person or destination',
          'To fix or repair something that is broken',
          'To build or construct something new',
          'To destroy or take apart something',
        ],
        correctIndex: 0,
      },
    },

    // ── Replace: fill in the blank ──────────────────────────────────
    {
      authorLabel: 'Citizen-7850',
      content: 'All associates must [answer] to messages from the Ministry within 24 hours. Silence is not acceptable.',
      postType: 'censure_replace',
      pearlNote: null,
      censureData: {
        errorType: 'replace',
        blankWord: 'answer',
        correction: 'respond',
        explanation: '"Respond" means to reply or react to something formally — more precise than "answer" in official contexts.',
        options: ['respond', 'forward', 'delay', 'separate'],
        correctIndex: 0,
      },
    },
    {
      authorLabel: 'Citizen-8440',
      content: 'The team should [look over] each document before sending it to the Ministry. Errors must not pass.',
      postType: 'censure_replace',
      pearlNote: null,
      censureData: {
        errorType: 'replace',
        blankWord: 'look over',
        correction: 'review',
        explanation: '"Review" means to examine something carefully and formally — more precise than "look over".',
        options: ['review', 'process', 'schedule', 'complete'],
        correctIndex: 0,
      },
    },
  ],
};

/**
 * Fallback posts when OpenAI is unavailable.
 * Uses target words in template sentences + static censure content.
 */
function buildFallbackPosts(weekNumber: number): GeneratedPost[] {
  const { targetWords, grammarTarget } = getVocabContext(weekNumber);
  const w = targetWords;

  const posts: GeneratedPost[] = [];

  // Feed posts — character-first with world texture
  if (w.length >= 4) {
    // A citizen with a morning routine
    const padNum1 = String(2000 + weekNumber * 100 + 4).padStart(4, '0');
    posts.push({
      authorLabel: `Citizen-${padNum1}`,
      content: `I ${w[0]} at Tower 14 every morning to the smell of Harmony Congee from the corridor. I ${w[1]} the same path to Filing Hall. The ${w[9] ?? 'standard'} route takes twelve minutes. I always ${w[2]} for the small bird on the balcony of Floor 6. She is always there.`,
      postType: 'feed',
      pearlNote: `Shift ${weekNumber} review feed: target words in context.`,
      censureData: null,
    });

    // A citizen with an opinion about the cafeteria
    const padNum2 = String(3300 + weekNumber * 10).padStart(4, '0');
    posts.push({
      authorLabel: `Citizen-${padNum2}`,
      content: `The Wednesday Noodle Bowl is different and no one can tell me why. I ${w[1]} this every week. Today I tried to ${w[2]} with the cafeteria board but it was the same as yesterday. Some things you just ${w[3]}.`,
      postType: 'feed',
      pearlNote: null,
      censureData: null,
    });

    // A citizen who is tired but kind
    const padNum3 = String(6600 + weekNumber * 10).padStart(4, '0');
    posts.push({
      authorLabel: `Citizen-${padNum3}`,
      content: `Long shift today. The Clarity Tea at 15:00 was the only good part. My neighbor lent me her Approved Poetry Anthology. I should ${w[0]} it tomorrow. Some days you just need a quiet evening and a warm cup. Corridor lights dim at 22:00 but I was already asleep.`,
      postType: 'feed',
      pearlNote: null,
      censureData: null,
    });
  }

  // Citizen-4488 post — escalating unease, same neighbor thread
  const citizen4488Posts: Record<number, string> = {
    1: `My neighbor used to ${w[0] ?? 'arrive'} at the community center every Tuesday with her small gray cat waiting at home. Her chair is empty now. I should not worry. The Ministry ${w[2] ?? 'check'}s these things. The cat still waits. Everything is fine.`,
    2: `I ${w[0] ?? 'notice'}d my neighbor's ink stones are still on the shelf at the community center. Nobody has ${w[5] ?? 'change'}d anything since she left. I ${w[4] ?? 'request'}ed information but was not ${w[9] ?? 'inform'}ed. The cat follows me home now. Everything is fine.`,
    3: `They ${w[0] ?? 'process'}ed the community center's remaining items yesterday. My neighbor's things are gone now. I should not ${w[3] ?? 'delay'} my own routine to think about it. I must ${w[8] ?? 'maintain'} my schedule. The cat sleeps at my door. I ${w[1] ?? 'complete'}d the adoption form. Everything is fine.`,
  };
  const c4488Content = citizen4488Posts[weekNumber] ?? citizen4488Posts[1]!;
  posts.push({
    authorLabel: 'Citizen-4488',
    content: c4488Content,
    postType: 'feed',
    pearlNote: weekNumber === 1
      ? 'Community post from Citizen-4488 — references absent neighbor.'
      : weekNumber === 2
        ? 'Citizen-4488 activity logged. Continued references to absent neighbor.'
        : 'Citizen-4488 flagged for Pattern-7 monitoring. Compliance within parameters.',
    censureData: null,
  });

  // Censure items: use static content if available, else generic
  const staticCensure = STATIC_CENSURE_ITEMS[weekNumber];
  if (staticCensure) {
    posts.push(...staticCensure);
  } else {
    // Generic censure fallback for weeks without static content
    if (w.length >= 2) {
      posts.push({
        authorLabel: `Citizen-${String(3000 + weekNumber * 50).padStart(4, '0')}`,
        content: `Yesterday I ${w[0]} the new documents. The team have ${w[1]} everything already.`,
        postType: 'censure_grammar',
        pearlNote: null,
        censureData: {
          errorType: 'grammar',
          errorWord: 'have',
          correction: 'has',
          explanation: `"The team" is singular and requires "has" not "have" (${grammarTarget}).`,
          options: ['has', 'have', 'having', 'had'],
          correctIndex: 0,
        },
      });
      posts.push({
        authorLabel: `Citizen-${String(3100 + weekNumber * 50).padStart(4, '0')}`,
        content: `She always ${w[0]} the reports but never ${w[1]} them on time. The supervisor say nothing about it.`,
        postType: 'censure_grammar',
        pearlNote: null,
        censureData: {
          errorType: 'grammar',
          errorWord: 'say',
          correction: 'says',
          explanation: `"The supervisor" is third person singular and needs "says" (${grammarTarget}).`,
          options: ['says', 'say', 'saying', 'said'],
          correctIndex: 0,
        },
      });
    }

    if (w.length >= 3) {
      posts.push({
        authorLabel: `Citizen-${String(4000 + weekNumber * 30).padStart(4, '0')}`,
        content: `I need to ${w[0]} my lunch to the cafeteria before noon.`,
        postType: 'censure_vocab',
        pearlNote: null,
        censureData: {
          errorType: 'vocab',
          errorWord: w[0],
          correction: `"${w[0]}" does not mean to carry or bring something.`,
          explanation: `The word "${w[0]}" is used incorrectly in this context.`,
          options: [
            `To formally hand in work or documents`,
            `To carry something to a place`,
            `To eat at a restaurant`,
            `To clean a surface`,
          ],
          correctIndex: 0,
        },
      });
      posts.push({
        authorLabel: `Citizen-${String(4100 + weekNumber * 30).padStart(4, '0')}`,
        content: `Please ${w[2]} the chair closer to the window. It is too far away.`,
        postType: 'censure_vocab',
        pearlNote: null,
        censureData: {
          errorType: 'vocab',
          errorWord: w[2],
          correction: `"${w[2]}" does not mean to move or push something.`,
          explanation: `The word "${w[2]}" is used incorrectly in this context.`,
          options: [
            `The correct meaning of "${w[2]}"`,
            `To move or push something`,
            `To paint or color something`,
            `To break or destroy something`,
          ],
          correctIndex: 0,
        },
      });
    }

    if (w.length >= 4) {
      posts.push({
        authorLabel: `Citizen-${String(5000 + weekNumber * 20).padStart(4, '0')}`,
        content: `I need to [do] my ${w[1]} before the deadline. The supervisor expects quality work.`,
        postType: 'censure_replace',
        pearlNote: null,
        censureData: {
          errorType: 'replace',
          blankWord: 'do',
          correction: w[3],
          explanation: `"${w[3]}" is more specific and precise than "do" in this context.`,
          options: [w[3], w[0], w[1], w[2]],
          correctIndex: 0,
        },
      });
    }
  }

  return posts;
}

/**
 * Ensure posts exist for all weeks up to and including the given week.
 * Called lazily when a student opens Harmony.
 * Uses an in-memory lock per classId to prevent duplicate concurrent generation.
 */
export async function ensureHarmonyPostsExist(
  currentWeekNumber: number,
  classId: string,
  routeId: string = 'full',
): Promise<void> {
  const existing = generationLocks.get(classId);
  if (existing) {
    await existing;
    return;
  }

  const work = (async () => {
    try {
      const routeWeeks = getRouteWeeks(routeId);
      const visibleWeeks = routeWeeks.filter(w => w <= currentWeekNumber);
      for (const w of visibleWeeks) {
        await generateHarmonyPosts(w, classId, routeId);
      }
    } finally {
      generationLocks.delete(classId);
    }
  })();

  generationLocks.set(classId, work);
  await work;
}
