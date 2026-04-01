"use client";

import type { InfrastructureAsset } from "@/types/domain";

export const infrastructureTypeOptions: Array<{
  value: InfrastructureAsset["assetType"];
  label: string;
  color: string;
}> = [
  { value: "streetlight-pole", label: "Streetlight Poles", color: "#d4a53a" },
  { value: "optic-fiber-pole", label: "Optic Fiber Poles", color: "#2f7967" },
  { value: "electrical-substation", label: "Electrical Substations", color: "#c2574a" },
  { value: "electrical-distribution-box", label: "Distribution Boxes", color: "#914f95" },
  { value: "water-meter", label: "Water Meters", color: "#2176ae" },
  { value: "water-valve", label: "Water Valves", color: "#0f6671" },
  { value: "fire-hydrant", label: "Fire Hydrants", color: "#d9603b" },
  { value: "traffic-light", label: "Traffic Lights", color: "#5f6b7a" },
  { value: "manhole", label: "Manholes", color: "#7e6651" }
];

export function getAssetTypeLabel(type: InfrastructureAsset["assetType"]) {
  return infrastructureTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function getAssetTypeColor(type: InfrastructureAsset["assetType"]) {
  return infrastructureTypeOptions.find((option) => option.value === type)?.color ?? "#2f7967";
}

export function InfrastructureGlyph({ type }: { type: InfrastructureAsset["assetType"] }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="infrastructure-map-glyph-svg">
      {type === "streetlight-pole" ? (
        <>
          <line x1="16" y1="22" x2="16" y2="8" />
          <line x1="16" y1="8" x2="24" y2="8" />
          <circle cx="24" cy="11" r="2.6" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {type === "optic-fiber-pole" ? (
        <>
          <line x1="16" y1="23" x2="16" y2="7" />
          <circle cx="11" cy="12" r="2.1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="10" r="2.1" fill="currentColor" stroke="none" />
          <circle cx="21" cy="12" r="2.1" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {type === "electrical-substation" ? <path d="M17 6 11 16h5l-1 10 7-12h-5l1-8Z" fill="currentColor" stroke="none" /> : null}
      {type === "electrical-distribution-box" ? (
        <>
          <rect x="10" y="8" width="12" height="16" rx="2.6" />
          <line x1="16" y1="8" x2="16" y2="24" />
          <line x1="10" y1="14" x2="22" y2="14" />
        </>
      ) : null}
      {type === "water-meter" ? (
        <>
          <circle cx="16" cy="16" r="8" />
          <path d="M16 11c2 2 3.5 4 3.5 5.7A3.5 3.5 0 1 1 12.5 16.7C12.5 15 14 13 16 11Z" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {type === "water-valve" ? (
        <>
          <circle cx="16" cy="16" r="6.8" />
          <line x1="16" y1="7" x2="16" y2="25" />
          <line x1="7" y1="16" x2="25" y2="16" />
        </>
      ) : null}
      {type === "fire-hydrant" ? (
        <>
          <rect x="11" y="10" width="10" height="12" rx="2.5" />
          <line x1="16" y1="7" x2="16" y2="10" />
          <line x1="9" y1="14" x2="11" y2="14" />
          <line x1="21" y1="14" x2="23" y2="14" />
          <line x1="13" y1="22" x2="13" y2="25" />
          <line x1="19" y1="22" x2="19" y2="25" />
        </>
      ) : null}
      {type === "traffic-light" ? (
        <>
          <rect x="11" y="6" width="10" height="20" rx="3" />
          <circle cx="16" cy="11" r="2.1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="16" r="2.1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="21" r="2.1" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {type === "manhole" ? (
        <>
          <circle cx="16" cy="16" r="8" />
          <circle cx="16" cy="16" r="4" />
          <line x1="10" y1="16" x2="22" y2="16" />
        </>
      ) : null}
    </svg>
  );
}
