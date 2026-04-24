# Project Update Log

Last updated: 2026-03-13

## 2026-03-13 — Multi-Gate System, Documentation Update

### Multiple Simultaneous Task Gates
- **Change**: Upgraded from single `taskGateIndex Int?` to `taskGates Int[]` array on `ClassWeekUnlock`. Teachers can now set gates at any combination of positions between storyboard steps.
- **Student gating logic**: Student is blocked when their `currentTaskIndex` matches any gate in the array. Passing a gate position doesn't re-block.
- **Teacher UI**: Gate markers toggle independently (click to activate/deactivate). Gate control bar shows count + labels. "Advance" removes the lowest gate; "Remove All" clears everything.
- **Backend**: PATCH endpoint accepts `{ taskGates: number[] }`, deduplicates and sorts. Socket broadcasts full array.
- **PEARL bark**: Only fires when student transitions from gated → ungated (was previously firing on every gate update).
- **Migration**: `20260312072042_multi_task_gates` — drops `taskGateIndex`, adds `taskGates Int[] @default([])`.
- **Files**: schema.prisma, classes.ts, shifts.ts, shiftQueue.ts (types), teacher.ts (API), shiftQueueStore.ts, App.tsx, ShiftStoryboard.tsx

## 2026-03-12 — Task Gating, Class Monitor Filter, TOEIC Vocab, Ministry Naming, Storyboard Videos

### Task Gating System (Teacher Pace Control)
- **New feature**: Per-class, per-week task gating. Teacher places gate markers between storyboard steps — students hit "Station Hold" overlay with Party-style rotating messages until teacher advances.
- **Real-time**: `session:gate-updated` socket event broadcasts to `class:${classId}` room. All waiting students proceed instantly.
- **PEARL bark**: Students get in-world notification when gate lifts.
- **Student gate screen**: "AWAITING CLEARANCE" badge, lock icon, amber pulse animation, rotating dystopian messages (8-second cycle).
- **Files**: New `TaskGateOverlay.tsx`, modified schema.prisma, classes.ts, shifts.ts, shiftQueueStore.ts, App.tsx, ShiftStoryboard.tsx, ShiftQueue.tsx, teacher.ts, shiftQueue.ts types

### Gate Marker Visibility Fix
- **Bug**: GateMarker between storyboard steps used `opacity-0 group-hover:opacity-100`, making gates invisible unless hovered.
- **Fix**: Replaced with always-visible `bg-slate-50 text-slate-400` styling with dashed border lines.

### Class-Filtered Live Class Monitor
- **Change**: Live Class Monitor now filters students by the selected class in the teacher dashboard.
- **"Students" button**: On ClassManager class cards, now sets `selectedClassId` in Zustand store and smooth-scrolls to the ClassMonitor section.
- **Removed**: "All Classes" dropdown option (monitor always shows selected class).

### TOEIC-First Vocabulary Documentation
- **New principle**: TOEIC-aligned words come first in `targetWords`; world-building/story words come second.
- **Week 1 vocabulary breakdown**: Documented the full 25-word split (10 targetWords, 10 dictionary targets, 6 world-building). Week 1 is locked as narrative-first exception.
- **Files**: docs/world-and-story.md, CLAUDE.md (locked decision added)

### Ministry Naming Fix
- **Change**: All instances of "Ministry for Healthy and Safe Information" → "Ministry for Healthy and Safe Communication" across codebase.
- **Files**: TerminalView.tsx, seed.ts, World_Canon.md, Dplay_Source_Integration_Notes.md

### Storyboard & Video Clip System Enhancements (from prior session)
- **Storyboard derived from WeekConfig**: Steps now match actual student tasks instead of hardcoded 7-step sequence.
- **Auto-create Mission records**: Opening storyboard ensures DB records exist for all WeekConfig tasks.
- **Video clip per step**: Upload or embed URL, with hide/show toggle (`videoClipHidden`).
- **Movie theater mode**: Full-screen black overlay with CRT monitor during task clip playback.
- **Seed preservation**: Re-running seed preserves existing `teacherOverride` data.

## 2026-03-10 — Chromebook Compatibility, Task Randomization, Touch Support, Task Controls Fix

### Chromebook / Short Viewport Fixes
- **Proceed button relocated**: "PROCEED TO YOUR STATION" and "SKIP (TEST)" buttons moved from below the CRT monitor into the video player area itself (absolutely positioned inside the clip-path screen region). Ensures visibility on Chromebook viewports where the monitor image fills most of the screen.
- **Approach**: User preferred keeping the full-size monitor rather than constraining it with `max-height`. Button now overlays at `bottom-[8%]` inside the CRT screen with frosted green background + blur.

### TaskCard Dropdown Clipping Fix
- **Bug**: ErrorCorrectionDoc's word-correction dropdown was clipped by `overflow-hidden` on the parent TaskCard container.
- **Fix**: Removed `overflow-hidden` from TaskCard's main div. Wrapped the "APPROVED" stamp watermark in its own `overflow-hidden` container so the stamp still clips correctly without affecting child dropdowns.
- **File**: `frontend/src/components/shift-queue/TaskCard.tsx`

### Option Randomization (All Quiz/Match Tasks)
- **WordMatch**: Added Fisher-Yates shuffle for both word column (`shuffledWords`) and definition column (`shuffledDefs`) — both independently shuffled on mount via `useRef`.
- **VocabClearance**: Item order shuffled + option order within each item shuffled. `correctIndex` remapped after shuffling.
- **ErrorCorrectionDoc**: `normalizeErrors()` now shuffles dropdown option order and remaps `correctIndex`.
- All three use the same `shuffle<T>()` utility (Fisher-Yates).

### Writing Prompt Simplification (Vocabulary-Focused)
- **Change**: Shift report prompts across all 3 weeks changed from content-recall ("describe what happened during your shift") to vocabulary-usage ("Write your shift report using 3 to 5 sentences. Try to use as many of the target words as possible").
- **Lane 1 guided questions**: Changed from comprehension-based ("What did you learn about the Ministry?") to vocabulary-pairing exercises ("Write a sentence using 'arrive' and 'check'").
- **Lane 1 hints**: Simplified to basic sentence starters ("I arrived at..." / "First, I had to...").
- **Pedagogy**: Aligns with Involvement Load Hypothesis — "need + search + evaluate" engagement with target vocabulary is more effective for A2-B1 learners than content recall.
- **Files**: `backend/src/data/week-configs/week1.ts`, `week2.ts`, `week3.ts`

### PEARL Writing Evaluation Updated
- Backend evaluation criteria in `POST /api/submissions/evaluate` updated to match vocabulary-focused prompts.
- AI rubric now evaluates vocabulary usage and natural integration rather than content accuracy.
- **File**: `backend/src/routes/submissions.ts`

### Teacher Task Controls Fix (Server Persistence)
- **Bug**: Skip Task, Reset Task, Reset Shift, and Send to Task only updated local Zustand state — refreshing the page or reconnecting reset everything back to onboarding.
- **Fix**: All shiftQueueStore control functions now persist to the server:
  - `skipCurrentTask()`: Async — calls `submitMissionScore()` with score 0 + `{ skipped: true }`
  - `goToTask()`: Async — persists all skipped tasks before the target
  - `resetShift()`: Async — calls new `resetWeekScores()` API to delete mission scores
  - Added `reloadFromServer()` for state sync
- **New backend endpoint**: `DELETE /api/shifts/weeks/:weekId/scores` — deletes all MissionScore records for a given week
- **New frontend API**: `resetWeekScores(weekId)` in `frontend/src/api/shifts.ts`
- **Socket handler**: `onTaskCommand` in App.tsx made async with null weekConfig guard + PEARL feedback
- **Files**: `frontend/src/stores/shiftQueueStore.ts`, `frontend/src/App.tsx`, `backend/src/routes/shifts.ts`, `frontend/src/api/shifts.ts`

### Touch Support for Chromebooks
- Added `active:scale-[0.97]`, `active:scale-95`, `active:bg-*` states across all interactive elements for touchscreen Chromebooks.
- **Files affected** (10+ components): OfficeView, FrostedGlassPlayer, TerminalDesktop, VocabClearance, WordMatch, WordSort, ClozeFill, ComprehensionDoc, ErrorCorrectionDoc, PriorityBriefing, PrioritySort, IntakeForm

### Login Page Music Replacement
- Replaced `The_Iron_Grip_Overture.mp3` with `Synthetic_Serenity.mp3` as background music on the login page.
- **File**: `frontend/src/pages/Login.tsx`

### Welcome Video — Visual Polish
- Added CRT vignette overlay (`box-shadow: inset`) for gradient edge blending with monitor frame.
- Added subtle screen glare (`radial-gradient` overlay).
- Playback controls (rewind, pause/play) made visible with `opacity-40` baseline (previously `opacity-0`).
- Volume knob repositioned and styled as vintage brass knob on the bezel.

## 2026-03-10 — Frontend Build Fix, Welcome Video System, Retro Monitor Frame

### Critical Frontend Build Fix
- **Root cause found**: `ClarityQueueApp.tsx` had a mismatched JSX tag — retheme changed `<>` to `<div className="...">` but left closing as `</>`. This TypeScript build error **silently blocked ALL Railway frontend deploys** since the retheme commit. Railway kept serving the old pre-retheme bundle.
- **Impact**: All prior session fixes (video playback, delete button, full pastel retheme, autoplay handling) were invisible to users because the frontend never rebuilt.
- **Fix**: Single line change — `</>` → `</div>` in ClarityQueueApp.tsx.

### Welcome Video — Retro Monitor Frame
- **Design**: Welcome video now plays inside a retro CRT monitor image (`public/images/welcome-monitor.jpg`).
- **Technique**: `clip-path: polygon()` with 13 coordinate points traces the exact shape of the glossy black CRT screen opening. Video fills the full image area, polygon clips to screen shape.
- **CRT effects**: Scanline overlay (repeating-linear-gradient, opacity 4%) + radial glare gradient for retro tube feel.
- **Progress bar**: Overlaid on the monitor's green LED strip position — fills left-to-right as video plays with green glow.
- **Volume toggle**: Mute/unmute button inside the screen area (bottom-right).
- **Autoplay handling**: Detects browser autoplay rejection, shows "Begin Orientation" play button overlay.
- **Fallback**: If no video uploaded, shows green CRT text "WELCOME TO THE MINISTRY" inside screen.
- **Proceed button**: Only appears after video ends, below the monitor image.
- **CA-1 test bypass**: "SKIP (TEST)" button below monitor for test user.
- **Files**: `frontend/src/components/welcome/WelcomeVideoModal.tsx`, `frontend/public/images/welcome-monitor.jpg`

### Welcome Video Backend Fixes (from prior session, now deployed)
- `GET /api/dictionary/welcome-video` route moved BEFORE `router.use(authenticate)` — `<video>` tags can't send auth headers.
- `DELETE /api/dictionary/welcome-video` endpoint added for teachers.
- Upload path resolution fixed with `path.isAbsolute()` check for Railway's `/data/uploads`.
- Frontend `resolveUploadUrl()` extended to handle `/api/` paths.
- Video served via static `/uploads/welcome/welcome-video.mp4` path (express.static, no auth needed).
- Teacher ShiftsTab: video existence check (HEAD), upload, delete button with status indicator.

## 2026-03-09 — Full Shift Queue Retheme, Teacher Class/Student Management, WordMatch Fix

### Shift Queue "Forced Happy" Retheme (16 components)
- **Problem**: All shift queue task components used dark CRT terminal styling (ios-glass-card, neon-cyan/mint/pink colors, dseg7 font, text-white/* opacity) which contradicted the "forced happy" totalitarian government iOS aesthetic.
- **Solution**: Systematic retheme of ALL 16 shift queue components to light pastel palette:
  - Cream backgrounds (#F5F1EB, #FAFAF7), white cards, warm gray borders (#D4CFC6, #E8E4DC)
  - Sky-600 primary actions, emerald success states, rose error states, amber warnings
  - TerminalAppFrame stays dark (device chrome), content area is cream/white (government app content)
- **Files rethemed**: ShiftClosing, ClarityQueueApp, ShiftQueue, TaskCard, IntakeForm, ClozeFill, VocabClearance, WordMatch, DocumentCard, ErrorCorrectionDoc, ComprehensionDoc, DocumentReview, ShiftReport, PriorityBriefing, PrioritySort, ContradictionReport, WordSort, LaneScaffolding, TargetWordHighlighter, WritingEvaluator
- Removed all references to: `ios-glass-card`, `ios-glass-pill`, `ios-glass-pill-action`, `ios-glass-input`, `font-dseg7`, `text-neon-*`, `text-white/*`, `border-neon-*`, `bg-neon-*`, `text-terminal-*`, `ios-text-glow`
- Removed "LANGUAGE LAB" location label from shift queue header

### WordMatch Task Fix + Redesign
- **Bug**: Matching interaction completely broken due to inverted ternary logic — `pair.definition === pairs.find(p => p.word === defWord)?.definition ? false : defWord === word` — correct matches returned false.
- **Fix**: Simplified to `const isCorrect = selectedWord === defWord` with clean direct state management.
- **Redesign**: Rewrote from scratch with light pastel theme, proper tap-to-match interaction, visual feedback for correct/wrong matches.

### Teacher Class & Student Management
- **Class deletion**: `DELETE /api/classes/:classId` — cascade deletes enrollments, week unlocks, harmony posts.
- **Student removal from class**: `DELETE /api/classes/:classId/students/:studentId` — removes enrollment only.
- **Permanent student deletion**: `DELETE /api/teacher/students/:studentId` — cascade deletes Pair record + 11 related tables (pairDictionaryProgress, missionScore, recording, pearlConversation, narrativeChoice, harmonyPost, harmonyCensureResponse, classEnrollment, characterMessage, citizen4488Interaction, shiftResult).
- **Bulk student deletion**: `DELETE /api/teacher/students` — iterates all pairs + legacy users for full wipe.
- **ClassManager.tsx**: Full rewrite — expandable Students panel per class (individual Remove buttons), expandable Weeks panel, Delete class button with red confirmation dialog.
- **ClassMonitor.tsx**: Added per-student "Delete" link + "Delete All" button in header, both with destructive confirmation dialogs.
- **Key insight**: Class deletion only removes ClassEnrollment (the link), NOT User/Pair account records. Separate student deletion endpoints were needed for permanent removal.

## 2026-03-06 — Harmony UI Redesign, PEARL Guardrails Hardening, Data Fixes, Hybrid Class Design

### PEARL AI Guardrails Hardened (4-layer defense)
- **Layer 3a (pre-filter)**: Expanded from 14 to 22 regex patterns. Now catches copy-pasted quiz question formats ("Which word means...", "Choose the correct...", fill-in-the-blank underscores).
- **Layer 3b (task context injection)**: Strengthened for quiz tasks (`vocab_clearance`, `document_review`, `grammar`). When student is on a quiz, AI gets aggressive "CRITICAL — QUIZ IN PROGRESS" instruction forbidding definitions, synonyms, and target word mentions.
- **Layer 4 (post-response filter, NEW)**: After AI responds, checks if response contains any of the target vocabulary words while student is on a quiz task. If leaked, response is replaced with an in-character deflection. Catches cases where GPT ignores system prompt.
- Bug found in production: student copy-pasted "Which word means 'to reach a place after traveling'?" and PEARL gave a full explanation pointing to "arrive". Layer 3a now catches the "which word means" format instantly.

### Harmony UI Redesign (frontend)
- **Thread/reply view**: Tap any post → see replies + compose reply. Back button returns to feed.
- **Citizen-4488 visual distinction**: Amber border/dot/text, "COMMUNITY POST — REVIEW FOR LANGUAGE COMPLIANCE" notice on NPC posts.
- **Censure action buttons**: APPROVE / CORRECT / FLAG on all NPC posts, wired to backend `/censure` endpoint with Citizen-4488 interaction logging.
- **Target word highlighting**: Focus words highlighted in cyan, review words in amber within post content.
- **Collapsible vocabulary section**: Show/hide toggle to save screen space.
- **Reply count indicators**: Posts show count, clicking opens thread.
- **API cleanup**: Added `censurePost` to `harmony.ts` API module.

### Data Consistency Fixes (seed)
- **TOEIC category casing**: Normalized 29 Title Case entries (`'General Business'` → `'business'`, `'Office Procedures'` → `'procedures'`, etc.) to match teacher dashboard dropdown options.
- **Duplicate `confirm` removed**: Was seeded in both Week 1 and Week 3; `confirm` is a Week 1 target word only.
- **Harmony vocabulary spine aligned**: `getHarmonyReviewContext()` now pulls from WeekConfig `targetWords` (what students practice in shift tasks) instead of storyPlans `newWords` (narrative anchor words). Falls back to storyPlans for weeks 4+ without a WeekConfig.
- **Harmony seed posts rewritten**: All 9 posts now naturally use actual shift target words (arrive, follow, check, report, submit, etc.) instead of story anchor words (compliance, directive, protocol, clearance). PEARL notes document which target words appear in each post.

### Hybrid Class Design (planning — not yet implemented in code)
- Established pedagogical framework for blended physical + digital learning.
- Key principle: "Teacher introduces. App drills. Physical activities produce."
- Designed 4-phase hybrid shift template for 50-minute classes:
  1. **Ministry Briefing** (teacher-led, 12-15 min): retrieval drill, new word introduction, Clip A + discussion
  2. **Field Assignment** (physical in-world activity, 10-12 min): rotating Ministry procedures
  3. **Station Work** (app-driven, 15-18 min): vocab_clearance MCQ + core analysis task
  4. **Debrief + Clock-Out** (hybrid, 8-10 min): Clip B reveal + Shift Report writing or verbal exit
- Designed 6 physical "Ministry Procedures" activity types: Oral Compliance Review, Evidence Board, Citizen Debrief, Ministry Dictation, Priority Board, Public Address Drill.
- Mapped Week 1 → Oral Compliance Review, Week 2 → Evidence Board, Week 3 → Priority Board.
- Identified minimal app changes needed: compact intake_form mode, `teacherLed` task gating, teacher "advance to Station Work" signal.
- Vocabulary encounter chain: 12+ encounters per word across teacher intro, pronunciation drill, physical activity, MCQ, document reading, writing, Harmony.
- Next steps: decide restructure depth (light/medium/full), generate printable Ministry materials, consider teacher Session Control panel.

## 2026-03-06 — Harmony Weekly Review Feed + Story/Vocab Wiring

### Harmony as Weekly Vocabulary Review Surface
- Harmony feed now uses the student pair's current shift progression to decide what posts are visible.
- Feed response now returns current-week `focusWords` and previous-week `reviewWords` so Harmony functions as retrieval practice, not just ambient flavor.
- Harmony is unlocked from Shift 1 instead of waiting until Shift 3.

### Seeded Story/Vocabulary Integration
- Added shared `WEEK_STORY_PLANS` source so Harmony review context and seeded narrative posts use the same weekly story words.
- Added week-tagged Harmony seed posts for Weeks 1-3 with visible author labels (`Citizen-2104`, `CA-18`, `Citizen-4488`, etc.) instead of anonymous NPC posts.
- Seeded posts now deliberately recycle prior-week anchor vocabulary inside new-week Harmony content:
  - Week 1 posts circulate `directive`, `protocol`, `compliance`, `clearance`
  - Week 2 posts introduce `contradiction`, `missing`, `notice`, `revision` while carrying Week 1 terms
  - Week 3 posts introduce `clarify`, `queue`, `priority`, `dispatch` while carrying Week 2 terms

### Runtime/Backend Changes
- Added Harmony post metadata fields for `authorLabel` and `weekNumber`.
- New Harmony API behavior:
  - filter seeded posts by current unlocked week
  - preserve class scoping
  - assign student-created posts to the student's current week
  - inherit `weekNumber` on replies
- Added shared progression helper so week-aware logic is not duplicated between Dictionary and Harmony routes.

### Verification Notes
- Backend build, frontend build, Prisma client generation, and database seed completed successfully after implementation.
- Local Prisma migration engine returned a generic schema-engine error during `migrate deploy`; migration SQL was still added to the repo, and the two Harmony columns were applied directly to the local dev DB to verify seed/runtime behavior end to end.

### Remaining Follow-Up
- ~~Align live Week 1-3 queue `targetWords` and `previousWords` with the canonical story-plan anchor vocabulary~~ — DONE: `getHarmonyReviewContext()` now pulls from WeekConfig targetWords. Harmony seed posts rewritten with actual shift target words.

## 2026-03-06 — Student Work Persistence, Teacher Grades, Vocab Stemmer

### Student Data Persistence
- Student writing text now saved in `MissionScore.details` JSON blob (writingSubmissions, justifications, writingText) across all writing tasks (IntakeForm, PriorityBriefing, ContradictionReport, PrioritySort, ShiftReport)
- Concern score hydrated from DB on login/refresh (was always 0 before)
- Fixed stale closure bugs in IntakeForm, PriorityBriefing, PrioritySort where last card's writing was lost

### Teacher Grade Management
- 4 new backend endpoints: edit score, delete score, reset week progress (cascade), override concern
- Gradebook rewrite: detects dual week types (ShiftQueue weeks 1-3 vs PhaseRunner weeks 4+), inline score editing, per-task writing viewer, week reset with confirmation
- Moved welcome video upload from Dictionary tab to Shifts tab
- Fixed Dictionary tab readability (dark theme → light palette)
- Removed fake test pairs CA-2 through CA-5 from seed

### Porter Stemmer for Vocabulary Matching
- Replaced ad-hoc suffix regex (which failed on e-dropping, consonant doubling) with Porter Stemmer (1980)
- Applied to both frontend `TargetWordHighlighter` chips and backend `POST /api/submissions/evaluate`
- "arrived", "submitted", "following" all correctly match their base target words
- Aligned with CEFR A2-B1 word family standards (Bauer & Nation, 1993 Level 2)
- Shared stemmer: `frontend/src/utils/stemmer.ts` and `backend/src/utils/stemmer.ts`

## 2026-02-11 — Timeline + Media Authoring Lock
- Added fixed 18-shift story/learning/environment media plan:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Story_Learning_Environment_Timeline.md`
- Locked authoring order so media plan is defined before activity design:
  - `/Users/ryanrudat/Desktop/Lexical Republic/SCRIPT_AND_VOCAB_BUILD_ORDER.md`
- Confirmed operational preference:
  - keep teacher video upload open
  - run class flow in sequence (`clip_a -> activity -> clip_b`)
- Added downloadable Canva production script pack for Weeks 1-3:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Canva_Production_Scripts_Weeks_01_03.md`
- Added downloadable Word exports for script distribution:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Canva_Production_Scripts_Weeks_01_03.docx`
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Weeks_01_03_Script_Pack.docx`

## 2026-02-11 — Content/Design Progress
- Locked guided student flow and teacher-controlled sequence (`clip_a -> activity -> clip_b`).
- Added dual video pipeline (embed + true upload) and Three.js TV playback support.
- Built Week 1-3 lesson packages in script-first format.
- Integrated Desktop Dplan canon into Week 1-3 scripts.
- Added semester outcomes framework aligned to 50-minute class reality.

## 2026-02-11 — Knowledge/Canon Documentation
- Added world canon summary:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/World_Canon.md`
- Added script writing style + vocabulary control guide:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Script_Writing_Style_Guide.md`
- Added Desktop source integration notes:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Dplay_Source_Integration_Notes.md`
- Updated core knowledge files:
  - `/Users/ryanrudat/Desktop/Lexical Republic/memory.md` _(merged into CLAUDE.md on 2026-02-13)_
  - `/Users/ryanrudat/Desktop/Lexical Republic/SCRIPT_AND_VOCAB_BUILD_ORDER.md`
  - `/Users/ryanrudat/Desktop/Lexical Republic/TAIWAN_G10_VOCAB_WORKING_LIST.md`
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Semester_Outcomes_Framework.md`

## Next Confirmed Step
- Write Weeks 4-6 full script packs using fixed media timeline
- Define per-week vocabulary ladders (TOEIC target words vs world-building words) for all 18 shifts
- Hybrid class model app changes (compact intake_form, teacher "advance to Station Work" signal — multi-gate system now implemented)
- Printable Ministry materials (Vocabulary Cards, Evidence Board memos, Priority Board case cards, Conversation Frame cards)
- Persistent file storage for Railway (S3/R2) — currently uses Railway volume
- Expand dictionary seed data beyond Weeks 1-3 (currently 49 words, target ~120+ across 18 weeks)
