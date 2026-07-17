const collator = new Intl.Collator(undefined, { sensitivity: 'base' })

/**
 * Returns a new array sorted alphabetically by a derived label, using a
 * locale-aware, case-insensitive comparison. Used to order dropdown/select
 * options (opponents, clubs, tournaments) independent of API response order.
 */
export function sortByLabel<T>(items: T[], label: (item: T) => string): T[] {
  return [...items].sort((a, b) => collator.compare(label(a), label(b)))
}
