import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc";

export interface SortConfig<K extends string = string> {
  key: K;
  direction: SortDirection;
}

/**
 * Generic client-side sorting hook.
 * Returns the current sort config, a toggle handler, and the sorted data.
 */
export function useTableSort<T, K extends string = string>(
  data: T[] | undefined,
  defaultKey: K,
  defaultDir: SortDirection = "desc",
  compareFn?: (a: T, b: T, key: K, dir: SortDirection) => number,
) {
  const [sort, setSort] = useState<SortConfig<K>>({
    key: defaultKey,
    direction: defaultDir,
  });

  function toggleSort(key: K) {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  }

  const sorted = useMemo(() => {
    if (!data) return [];
    const arr = [...data];
    arr.sort((a, b) => {
      if (compareFn) return compareFn(a, b, sort.key, sort.direction);

      const aVal = (a as Record<string, unknown>)[sort.key];
      const bVal = (b as Record<string, unknown>)[sort.key];

      let cmp = 0;
      if (aVal == null && bVal == null) cmp = 0;
      else if (aVal == null) cmp = -1;
      else if (bVal == null) cmp = 1;
      else if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal;
      else if (typeof aVal === "string" && typeof bVal === "string")
        cmp = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
      else cmp = String(aVal).localeCompare(String(bVal));

      return sort.direction === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, sort, compareFn]);

  return { sort, toggleSort, sorted } as const;
}
