/**
 * Slug generator utility
 * Converts strings to URL-safe slugs
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugifyWithPrefix(text: string, prefix: string): string {
  const slug = slugify(text);
  return prefix ? `${prefix}/${slug}` : slug;
}

// Demo / smoke test
if (require.main === module) {
  const tests = [
    { input: "Hello World", expected: "hello-world" },
    { input: "  Some   Spaces  ", expected: "some-spaces" },
    { input: "What's @home?", expected: "whats-home" },
    { input: "日本語テスト", expected: "日本語テスト" },
  ];
  let passed = 0, failed = 0;
  for (const t of tests) {
    const result = slugify(t.input);
    if (result === t.expected) {
      console.log(`PASS: "${t.input}" → "${result}"`);
      passed++;
    } else {
      console.error(`FAIL: "${t.input}" → "${result}" (expected "${t.expected}")`);
      failed++;
    }
  }
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
