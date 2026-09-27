export function allMigrationsAreApplied(output) {
  const rows = output
    .split(/\r?\n/)
    .filter((line) => /^\s*\S+\s+\d{4}\s+\S+/.test(line));

  return rows.length > 0 && rows.every((line) => /^\s*applied\s+\d{4}\s+\S+/.test(line));
}
