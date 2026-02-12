import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { SortConfig } from "../../hooks/useTableSort";

interface Props<K extends string> {
  label: string;
  sortKey: K;
  sort: SortConfig<K>;
  onSort: (key: K) => void;
  className?: string;
  align?: "left" | "right";
}

export default function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
  align = "left",
}: Props<K>) {
  const active = sort.key === sortKey;

  return (
    <th
      className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-200 transition-colors ${
        align === "right" ? "text-right" : "text-left"
      } ${active ? "text-gray-200" : ""} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sort.direction === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </span>
    </th>
  );
}
