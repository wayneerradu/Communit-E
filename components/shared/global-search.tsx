"use client";

import type { Route } from "next";
import type { KeyboardEvent } from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GlobalSearchItem } from "@/types/domain";

type GlobalSearchProps = {
  items: GlobalSearchItem[];
  onItemSelect?: (item: GlobalSearchItem) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
};

function normalise(value: string) {
  return value.toLowerCase().trim();
}

export function GlobalSearch({
  items,
  onItemSelect,
  onQueryChange,
  placeholder = "Search faults, residents, roads, projects..."
}: GlobalSearchProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const indexedItems = useMemo(
    () =>
      items.map((item) => ({
        item,
        haystack: [item.title, item.subtitle, item.kind, ...(item.keywords ?? [])]
          .join(" ")
          .toLowerCase()
      })),
    [items]
  );

  const filteredItems = useMemo(() => {
    const trimmed = normalise(deferredQuery);

    if (!trimmed) {
      return items.slice(0, 6);
    }

    return indexedItems
      .filter((entry) => entry.haystack.includes(trimmed))
      .map((entry) => entry.item)
      .slice(0, 8);
  }, [deferredQuery, indexedItems, items]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function openItem(item: GlobalSearchItem) {
    setIsOpen(false);
    setQuery("");
    if (onItemSelect) {
      onItemSelect(item);
      return;
    }

    if (item.href) {
      router.push(item.href as Route);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!filteredItems.length) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % filteredItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current - 1 + filteredItems.length) % filteredItems.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      openItem(filteredItems[activeIndex] ?? filteredItems[0]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="global-search" ref={wrapperRef}>
      <label className="global-search-shell" aria-label="Global search">
        <span className="global-search-icon" aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            onQueryChange?.(nextQuery);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="global-search-input"
          placeholder={placeholder}
        />
      </label>

      {isOpen ? (
        <div className="global-search-results" role="listbox" aria-label="Global search results">
          {filteredItems.length ? (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`global-search-result ${index === activeIndex ? "global-search-result-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => openItem(item)}
              >
                <span className={`global-search-kind global-search-kind-${item.kind}`}>{item.kind}</span>
                <span className="global-search-copy">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
              </button>
            ))
          ) : (
            <div className="global-search-empty">
              <strong>No matches yet</strong>
              <small>Try a resident name, road, fault reference, project, or asset.</small>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
