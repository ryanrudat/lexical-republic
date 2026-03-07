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
        "options": ["correct meaning", "wrong meaning A", "wrong meaning B", "wrong meaning C"],
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
- Each post should have a unique citizen designation`;
}

/**
 * Generate Harmony posts for a specific week + class using OpenAI.
 * Returns the generated posts or falls back to minimal static posts.
 */
export async function generateHarmonyPosts(
  weekNumber: number,
  classId: string,
): Promise<void> {
  // Check if posts already exist for this week + class
  const existing = await prisma.harmonyPost.count({
    where: { weekNumber, classId, isGenerated: true },
  });
  if (existing >= 5) return; // Already generated

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

  // Store generated posts
  for (const post of posts) {
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
  }

  console.log(`  Harmony: generated ${posts.length} posts for week ${weekNumber}, class ${classId}`);
}

/**
 * Fallback posts when OpenAI is unavailable.
 * Uses target words in template sentences.
 */
function buildFallbackPosts(weekNumber: number): GeneratedPost[] {
  const { targetWords, grammarTarget } = getVocabContext(weekNumber);
  const w = targetWords;

  const posts: GeneratedPost[] = [];

  // 3 feed posts
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
    pearlNote: `Community post from Citizen-4488 — review for language compliance.`,
    censureData: null,
  });

  // 1 censure_grammar post
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
  }

  // 1 censure_vocab post
  if (w.length >= 3) {
    posts.push({
      authorLabel: `Citizen-${4000 + weekNumber * 30}`,
      content: `I need to ${w[0]} my lunch to the cafeteria before noon.`,
      postType: 'censure_vocab',
      pearlNote: null,
      censureData: {
        errorType: 'vocab',
        errorWord: w[0],
        correction: `"${w[0]}" means to formally hand in work, not to bring food somewhere.`,
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
  // Generate posts for weeks 2 through current (Week 1 is locked)
  for (let w = 2; w <= currentWeekNumber; w++) {
    await generateHarmonyPosts(w, classId);
  }
}
