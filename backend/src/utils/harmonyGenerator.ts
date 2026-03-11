import prisma from './prisma';
import { getOpenAI, OPENAI_MODEL } from './openai';
import { getWeekConfig } from '../data/week-configs';
import { getStoryPlan } from '../data/storyPlans';

interface GeneratedPost {
  authorLabel: string;
  content: string;
  postType: 'feed' | 'censure_grammar' | 'censure_vocab' | 'censure_replace';
  pearlNote: string | null;
  censureData: Record<string, unknown> | null;
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
 * Collects all review words from week 1 to weekNumber-1,
 * to be used in censure queue items for spaced review.
 */
function getAllReviewWords(weekNumber: number): string[] {
  const words: string[] = [];
  for (let w = 1; w < weekNumber; w++) {
    const ctx = getVocabContext(w);
    words.push(...ctx.targetWords);
  }
  return [...new Set(words)];
}

function buildGenerationPrompt(weekNumber: number): string {
  const { targetWords, previousWords, grammarTarget } = getVocabContext(weekNumber);
  const allReview = getAllReviewWords(weekNumber);

  return `You are generating social media posts for "Harmony" — the state-controlled social network in a dystopian world called the Lexical Republic. Citizens post about their daily work processing government documents.

WORLD CONTEXT:
- Citizens work as Clarity Associates processing language documents for the Ministry
- All posts are monitored by PEARL (the AI overseer) and the Ministry
- The tone is "forced happy" dystopian — citizens sound compliant, polite, and obedient on the surface
- Citizen-4488 is a recurring character whose posts hint at something wrong (missing neighbors, removed activities) but always end reassuring themselves everything is fine

WEEK ${weekNumber} CONTEXT:
- Grammar target: ${grammarTarget}
- Target vocabulary (MUST use naturally): ${targetWords.join(', ')}
- Review words from previous weeks: ${allReview.length > 0 ? allReview.join(', ') : 'none (first week)'}

GENERATE exactly this JSON array of posts:

1. Three "feed" posts — compliant citizen posts using 3-5 target words each naturally. Different citizens (use designations like "Citizen-2104", "CA-18", "WA-07"). 2-3 sentences each. Cheerful but subtly dystopian.

2. One "feed" post from Citizen-4488 — uses target words but tells a slightly unsettling personal story. Always ends with self-reassurance ("Everything is fine", "I should not worry", "The Ministry takes care of everyone"). Include ONE deliberate grammar error matching the week's grammar target.

3. Two "censure_grammar" posts — citizen posts that contain 1-2 grammar errors related to "${grammarTarget}". These will be shown to students for correction. Include the error details.

4. Two "censure_vocab" posts — citizen posts that use a target word INCORRECTLY (wrong meaning/context). Students must identify the misuse. Include the error details.

5. One "censure_replace" post — a citizen post using a vague/generic word where a specific target word should go. Students pick the correct replacement.

RESPOND WITH VALID JSON:
{
  "posts": [
    {
      "authorLabel": "Citizen-XXXX or CA-XX",
      "content": "the post text",
      "postType": "feed",
      "pearlNote": "brief PEARL observation or null",
      "censureData": null
    },
    {
      "authorLabel": "...",
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
      "authorLabel": "...",
      "content": "text with vocab misuse",
      "postType": "censure_vocab",
      "pearlNote": null,
      "censureData": {
        "errorType": "vocab",
        "errorWord": "the misused word",
        "correction": "what it should be or how it should be used",
        "explanation": "why the usage is wrong",
        "options": ["To formally hand in work (correct definition sentence)", "To carry something to a place (wrong definition sentence)", "To eat at a restaurant (wrong definition sentence)", "To clean a surface (wrong definition sentence)"],
        "correctIndex": 0
      }
    },
    {
      "authorLabel": "...",
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
- Posts should be 2-3 sentences, max 280 characters each
- Use A2-B1 English appropriate for Taiwanese Grade 10 students
- Target words must appear naturally, not forced
- Censure items need clear, unambiguous errors students can identify
- Each post should have a unique citizen designation
- censure_vocab options MUST be full definition sentences (e.g. "To reach or come to a place"), NOT single words
- censure_grammar options MUST be single words/phrases showing different forms (e.g. "arrives", "arrive", "arriving", "arrived")
- censure_replace options MUST be single target vocabulary words (e.g. "submit", "arrive", "check", "report")`;
}

/**
 * Generate Harmony posts for a specific week + class using OpenAI.
 * Returns the generated posts or falls back to minimal static posts.
 */
export async function generateHarmonyPosts(
  weekNumber: number,
  classId: string,
): Promise<void> {
  // Check censure and feed items separately so we can fill in what's missing
  const [existingCensure, existingFeed] = await Promise.all([
    prisma.harmonyPost.count({
      where: { weekNumber, classId, postType: { not: 'feed' } },
    }),
    prisma.harmonyPost.count({
      where: { weekNumber, classId, postType: 'feed' },
    }),
  ]);

  const needsCensure = existingCensure < 5;
  const needsFeed = existingFeed < 4;

  if (!needsCensure && !needsFeed) return; // Already populated

  const openai = getOpenAI();
  let posts: GeneratedPost[];

  if (openai) {
    try {
      const prompt = buildGenerationPrompt(weekNumber);
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
      posts = Array.isArray(parsed.posts) ? parsed.posts : [];

      if (posts.length === 0) throw new Error('No posts in AI response');
    } catch (err) {
      console.error('Harmony AI generation failed, using fallback:', err);
      posts = buildFallbackPosts(weekNumber);
    }
  } else {
    posts = buildFallbackPosts(weekNumber);
  }

  // Only insert post types that are still needed
  let inserted = 0;
  for (const post of posts) {
    if (post.postType === 'feed' && !needsFeed) continue;
    if (post.postType !== 'feed' && !needsCensure) continue;

    await prisma.harmonyPost.create({
      data: {
        authorLabel: post.authorLabel,
        content: post.content,
        postType: post.postType,
        status: 'approved',
        pearlNote: post.pearlNote,
        censureData: (post.censureData ?? undefined) as any,
        weekNumber,
        classId,
        isGenerated: true,
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
      authorLabel: 'WA-33',
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
      authorLabel: 'CA-41',
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
};

/**
 * Fallback posts when OpenAI is unavailable.
 * Uses target words in template sentences + static censure content.
 */
function buildFallbackPosts(weekNumber: number): GeneratedPost[] {
  const { targetWords, grammarTarget } = getVocabContext(weekNumber);
  const w = targetWords;

  const posts: GeneratedPost[] = [];

  // Feed posts
  if (w.length >= 4) {
    posts.push({
      authorLabel: `Citizen-${2000 + weekNumber * 100 + 4}`,
      content: `I ${w[0]} every morning and ${w[1]} the standard procedure. My supervisor always ${w[2]}s my work before I can ${w[3]}. The system works perfectly.`,
      postType: 'feed',
      pearlNote: `Shift ${weekNumber} review feed: target words in circulation.`,
      censureData: null,
    });
    posts.push({
      authorLabel: `CA-${10 + weekNumber * 3}`,
      content: `New associates should ${w[1]} each step carefully. I always ${w[2]} my documents twice before I ${w[3]} them. This is the approved method.`,
      postType: 'feed',
      pearlNote: null,
      censureData: null,
    });
    posts.push({
      authorLabel: `WA-${20 + weekNumber * 2}`,
      content: `Today I learned to ${w[0]} correctly. My team helped me ${w[4] ?? w[1]} the process. We ${w[5] ?? w[2]} everything on time.`,
      postType: 'feed',
      pearlNote: null,
      censureData: null,
    });
  }

  // Citizen-4488 post
  posts.push({
    authorLabel: 'Citizen-4488',
    content: `My neighbor used to ${w[0] ?? 'work'} at the center every Tuesday. Last week her desk was empty. I should not worry. The Ministry always ${w[2] ?? 'handle'}s these things. Everything is fine.`,
    postType: 'feed',
    pearlNote: `Community post from Citizen-4488 — contains deliberate language anomalies.`,
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
        authorLabel: `Citizen-${3000 + weekNumber * 50}`,
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
        authorLabel: `Citizen-${3100 + weekNumber * 50}`,
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
        authorLabel: `Citizen-${4000 + weekNumber * 30}`,
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
        authorLabel: `Citizen-${4100 + weekNumber * 30}`,
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
        authorLabel: `Citizen-${5000 + weekNumber * 20}`,
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
 */
export async function ensureHarmonyPostsExist(
  currentWeekNumber: number,
  classId: string,
): Promise<void> {
  for (let w = 1; w <= currentWeekNumber; w++) {
    await generateHarmonyPosts(w, classId);
  }
}
