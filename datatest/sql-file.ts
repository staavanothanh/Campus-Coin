export function parseSqlFile(content: string): { expectError: string | null; sql: string } {
  let expectError: string | null = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("--")) break;

    const match = /^--\s*expect-error(?::\s*(.*))?$/.exec(trimmed);
    if (match !== null) {
      const message = match[1]?.trim() ?? "";
      expectError = message.length > 0 ? message : "error";
    }
  }

  return { expectError, sql: content };
}
