#!/usr/bin/env bun
/**
 * Niivue Code Porting Hook
 *
 * This hook detects when Niivue code is being pasted and provides context
 * to help Claude Code properly port it to the medgfx library structure.
 */

async function main() {
  const input = await Bun.stdin.text();

  try {
    const data = JSON.parse(input);
    const prompt = data.prompt || "";

    // Detect Niivue code patterns
    const niivuePatterns = [
      /niivue/i,                          // Direct Niivue mentions
      /class\s+Nii\w+/,                   // Niivue class naming (NiiMath, NiiVue, etc.)
      /from\s+['"].*niivue/,              // Niivue imports
      /this\.nv\./,                       // Niivue instance references
      /@niivue/,                          // Niivue package references
    ];

    const containsNiivueCode = niivuePatterns.some(pattern => pattern.test(prompt));

    if (containsNiivueCode) {
      const portingContext = `
## Niivue Code Porting Instructions

The code in this message is from the **Niivue JavaScript package** and needs to be ported to **medgfx**.

### Important Guidelines:

1. **Check existing medgfx structure first**: Before assuming code is missing, search the medgfx codebase. The human may have already ported and renamed Niivue classes/functions.

2. **Follow medgfx conventions**:
   - Use medgfx project structure (see [CLAUDE.md](CLAUDE.md))
   - Import types from \`src/types/\` (e.g., \`import type { Foo } from "./types"\`)
   - Use Pino logger: \`import { logger } from "./logger"\`
   - Write co-located tests: \`*.test.ts\` files
   - Use Bun APIs where applicable (not Node.js)

3. **Single Responsibility Principle**: Keep classes focused. If a Niivue class has multiple responsibilities, split it into smaller, maintainable classes.

4. **Organize utilities properly**:
   - Pure functions → \`src/utils/\` directory
   - Group related utilities in files (math, vector, mesh, etc.)
   - Export from \`src/utils/index.ts\`

5. **Update naming**:
   - Remove "Nii" prefixes (e.g., \`NiiMath\` → \`MedGFX\` or appropriate name)
   - Use TypeScript conventions (PascalCase for classes, camelCase for functions)

6. **WebGL 2.0 focus**: medgfx uses WebGL 2.0, ensure ported code is compatible

7. **Write tests**: All new ported code needs unit tests unless explicitly told otherwise
`;

      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: portingContext
        }
      }));
    }

    process.exit(0);
  } catch (error) {
    console.error(`Hook error: ${error}`, { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

main();
