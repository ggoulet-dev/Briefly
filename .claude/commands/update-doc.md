Analyze recent code changes and update the project skill documentation accordingly.

## Steps

1. **Detect what changed.** Run `git diff HEAD` and `git diff --cached` to see unstaged and staged changes. Also run `git log --oneline -5` to see recent commits for context. If there are no changes at all, tell the user there's nothing to update and stop.

2. **Read the current documentation.** Read `.claude/skills/skill.md` and identify which resource files in `.claude/skills/resources/` are affected by the changes. Only read the resource files that are relevant — don't read all of them.

3. **Determine what needs updating.** Map the changes to documentation sections:
   - New/modified backend services → `resources/backend-services.md`
   - New/modified pages, components, hooks → `resources/frontend-guide.md`
   - Schema changes or new migrations → `resources/database-schema.md`
   - New/modified API routes → `resources/api-endpoints.md`
   - Job/cron changes → `resources/jobs-and-cron.md`
   - New modules, major architecture shifts → `skill.md` (module map, key concepts)

4. **Apply updates.** Edit only the sections that changed — don't rewrite entire files. Keep the existing style and format. If a completely new module or concept was added, add a new section. If something was removed, remove it from the docs.

5. **Report.** Give a brief summary of what was updated and why.

## Rules

- Only update docs for things that actually changed in the code. Don't speculatively document future plans.
- Keep descriptions concise — match the existing tone (function signatures, bullet points, tables).
- If a change is trivial (typo fix, logging tweak, formatting), say "No doc update needed" and stop.
- Never remove resource files — only edit their contents.
