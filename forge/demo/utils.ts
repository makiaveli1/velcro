/**
 * slug+date utility demo
 * Small, self-contained scaffold — not production code.
 */

/**
 * Converts a string to a URL-safe slug.
 * @param str - The input string to slugify
 * @returns A lowercase slug with spaces replaced by hyphens, non-alphanumeric stripped
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Formats a Date into YYYY-MM-DD.
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a date relative to today.
 * @param date - The date to describe relatively
 * @returns "today", "yesterday", or "N days ago"
 */
export function formatDateRelative(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}

// ─── Simple test runner ─────────────────────────────────────────────────────
if (require.main === module) {
  const tests: Array<{ label: string; actual: string; expected: string }> = [
    { label: "slugify: 'Hello World'",     actual: slugify("Hello World"),      expected: "hello-world" },
    { label: "slugify: '  Foo Bar!  '",     actual: slugify("  Foo Bar!  "),      expected: "foo-bar" },
    { label: "formatDate: 2026-03-26",       actual: formatDate(new Date("2026-03-26T00:00:00")), expected: "2026-03-26" },
    { label: "formatDateRelative: today",   actual: formatDateRelative(new Date()), expected: "today" },
  ];

  // Yesterday
  const y = new Date(); y.setDate(y.getDate() - 1);
  tests.push({ label: "formatDateRelative: yesterday", actual: formatDateRelative(y), expected: "yesterday" });

  // 5 days ago
  const d5 = new Date(); d5.setDate(d5.getDate() - 5);
  tests.push({ label: "formatDateRelative: 5 days ago", actual: formatDateRelative(d5), expected: "5 days ago" });

  let passed = 0;
  for (const t of tests) {
    const ok = t.actual === t.expected;
    if (ok) passed++;
    console.log(`${ok ? "✓" : "✗"} ${t.label} → '${t.actual}'${ok ? "" : ` (expected '${t.expected}')`}`);
  }
  console.log(`\n${passed}/${tests.length} passed`);
}
