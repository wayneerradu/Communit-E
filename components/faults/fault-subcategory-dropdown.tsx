"use client";

import { useEffect, useRef, useState } from "react";

type FaultSubCategoryDropdownProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function FaultSubCategoryDropdown({
  value,
  options,
  onChange,
  disabled = false
}: FaultSubCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="fault-dropdown" ref={wrapperRef}>
      <div
        role="button"
        tabIndex={0}
        className={`fault-dropdown-trigger${isOpen ? " fault-dropdown-trigger-open" : ""}`}
        onClick={() => {
          if (disabled) return;
          setIsOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen((current) => !current);
          }

          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        aria-expanded={isOpen}
        aria-disabled={disabled}
      >
        <div className="fault-dropdown-value">{value || "Select sub category"}</div>
        <div className="fault-dropdown-caret" aria-hidden="true">
          {isOpen ? "▴" : "▾"}
        </div>
      </div>

      {isOpen ? (
        <div className="fault-dropdown-menu">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`fault-dropdown-option${value === option ? " fault-dropdown-option-active" : ""}`}
              disabled={disabled}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
