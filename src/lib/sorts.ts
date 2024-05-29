const sorts = {
  alphabetical: {
    ascending:
      () =>
      ([a], [b]) =>
        a.localeCompare(b),
    descending:
      () =>
      ([a], [b]) =>
        b.localeCompare(a),
  },
  priority: {
    ascending:
      ({ priorities }) =>
      ([a], [b]) => {
        const aPriority = priorities[a] ?? 9999;
        const bPriority = priorities[b] ?? 9999;

        if (aPriority < bPriority) return -1;
        if (aPriority > bPriority) return 1;
        return 0;
      },
    descending:
      ({ priorities }) =>
      ([a], [b]) => {
        const aPriority = priorities[a] ?? 9999;
        const bPriority = priorities[b] ?? 9999;

        if (aPriority < bPriority) return 1;
        if (aPriority > bPriority) return -1;
        return 0;
      },
  },
};

export function sort(
  method: string,
  direction: 'ascending' | 'descending',
  options?: Record<string, any>
) {
  return sorts[method][direction](options);
}
