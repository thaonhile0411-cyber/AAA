# US-303: Writing question bank and idea suggestions

Scope: Sprint 2, Feature 8 in the Sprint Backlog's **Feature** sub-tab. The Product Backlog places this story in Epic 3. AI essay assessment is the separate US-304 story.

## Run locally

Use Node.js 22.18+ (Node 24 is supported). Docker, XAMPP, Supabase credentials and an AI key are not needed to preview this module.

```powershell
cd D:\XAMPP\htdocs\BTTH3_PHP\AAA-writing
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:3000/writing`. The shared sidebar and dashboard Writing card also link to the bank. Login, profile and the authenticated dashboard still require the team's Supabase setup. The public Writing catalog does not access private account data.

## Implementation

- `/writing`: search and intersecting filters for task, topic, target band and question type, with reset and empty states.
- `/writing/[promptId]`: clear task instructions, topic, time guidance and minimum word count. Unknown prompt IDs return 404.
- Ten original practice prompts cover all six Academic Task 1 graphic types and all four requested Task 2 essay types. Each has four outline sections, five vocabulary entries with definitions/examples, and a full-length sample.
- The companion offers combined Suggestions & Vocabulary, Outline Suggestions, Vocab Keys and Sample Essays tabs. Users can collapse/expand the panel; keyboard users can switch tabs with arrows, Home and End.
- Samples highlight vocabulary and cohesive devices in separate styles, with definitions on vocabulary hover and an option to hide highlights. Band labels are teaching targets, not independently assessed scores.
- Task 1 graphics are local SVGs with accessible descriptions. Clicking a graphic opens a centered native dialog with 50–300% zoom, reset, scrolling, Escape/backdrop dismissal and focus restoration. SVG avoids pixelation and remote-image dependencies.
- Drafting has a live word count, per-prompt browser recovery and text download. Browser storage failures are reported without clearing the editor. Drafts save on input and are never submitted to a service. They are browser-local, not account-synced; use download for a portable copy. Shared-browser users should clear their draft after use.

Content lives in `src/features/writing/prompts.ts`; add prompts with unique IDs and the `WritingPrompt` shape. Graphic layouts live in `PromptGraphic.tsx` and must be updated alongside their descriptions and samples when datasets change. This is a bundled starter catalog, so no database migration is required.

## Acceptance checks

### Reference resources

The user supplied these DOL English catalogs, reviewed during implementation:

- [Task 1 samples](https://tuhoc.dolenglish.vn/category/tong-hop-bai-mau-ielts-writing-task-1-sample)
- [Task 2 samples](https://tuhoc.dolenglish.vn/category/tong-hop-bai-mau-ielts-writing-task-2-sample)

Both catalogs organise sample responses by question type and topic and link to supporting outlines and vocabulary. The bank includes direct links for further reading. Its bundled prompts, charts, outlines and samples remain original teaching materials; no DOL essays or graphics are republished. DOL's Two-part questions category is additional to the four Task 2 types required by this story and is outside the current starter catalog.

### Manual scenarios

1. Open `/writing`, select Task 2 and Technology, and open **Technology in the classroom**. The combined tab shows Introduction, Body 1, Body 2 and Conclusion plus five specialised vocabulary entries.
2. Switch between all support tabs, collapse/expand the companion and verify the draft stays intact.
3. Open Sample Essays. Confirm both vocabulary and cohesive devices are highlighted, and toggle highlights off/on.
4. Open `/writing/paper-recycling`, click the process diagram, zoom in/out and reset. Confirm all six stages remain legible, scroll at high zoom, and press Escape to close. Focus returns to the graphic button.
5. Type different drafts on two prompts, navigate away immediately and revisit/reload. Each prompt restores its own draft and word count. Download the draft as text.
6. Combine filters, search for an unknown term, reset filters and test a nonexistent prompt URL.
7. Check desktop and narrow-screen layouts, keyboard navigation and modal focus containment.

```powershell
npm test
npm run lint
npm exec next typegen
npm run typecheck
npm run build
```

The team's Definition of Done additionally requires teammate review, branch integration and verification in a shared build/preview before marking the story Done.
