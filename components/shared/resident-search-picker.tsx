"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Resident } from "@/types/domain";

type ResidentSearchPickerProps = {
  residents: Resident[];
  value: string;
  onChange: (residentId: string) => void;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function ResidentSearchPicker({ residents, value, onChange }: ResidentSearchPickerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [isOpen, setIsOpen] = useState(false);

  const selectedResident = useMemo(
    () => residents.find((resident) => resident.id === value),
    [residents, value]
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const activeResidents = useMemo(
    () => residents.filter((resident) => resident.status === "active"),
    [residents]
  );

  const indexedResidents = useMemo(
    () =>
      activeResidents.map((resident) => ({
        resident,
        haystack: [resident.name, resident.email, resident.phone, resident.addressLine1, resident.securityCompany]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      })),
    [activeResidents]
  );

  const filteredResidents = useMemo(() => {
    const term = normalize(deferredQuery);
    if (!term) {
      return activeResidents.slice(0, 12);
    }

    return indexedResidents
      .filter((entry) => entry.haystack.includes(term))
      .map((entry) => entry.resident)
      .slice(0, 20);
  }, [activeResidents, deferredQuery, indexedResidents]);

  return (
    <div className="resident-picker" ref={wrapperRef}>
      <div className="resident-picker-input-row">
        <input
          type="search"
          value={query || (value ? selectedResident?.name ?? "" : "")}
          placeholder="Search resident by name, mobile, email, or address..."
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) {
              onChange("");
            }
            setIsOpen(true);
          }}
        />
        {value ? (
          <button
            type="button"
            className="button-secondary resident-picker-clear"
            onClick={() => {
              onChange("");
              setQuery("");
              setIsOpen(true);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="resident-picker-results">
          <button
            type="button"
            className={`resident-picker-result${value === "" ? " resident-picker-result-active" : ""}`}
            onClick={() => {
              onChange("");
              setQuery("");
              setIsOpen(false);
            }}
          >
            <strong>No resident linked</strong>
          </button>

          {filteredResidents.length ? (
            filteredResidents.map((resident) => (
              <button
                type="button"
                key={resident.id}
                className={`resident-picker-result${resident.id === value ? " resident-picker-result-active" : ""}`}
                onClick={() => {
                  onChange(resident.id);
                  setQuery(resident.name);
                  setIsOpen(false);
                }}
              >
                <strong>{resident.name}</strong>
                <small>
                  {[resident.phone, resident.email, resident.addressLine1].filter(Boolean).join(" • ") || "No contact details"}
                </small>
              </button>
            ))
          ) : (
            <div className="resident-picker-empty">
              <strong>No residents found</strong>
              <small>Try part of a name, mobile number, email, or address.</small>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
