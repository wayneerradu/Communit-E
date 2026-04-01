import { faultCategoryOptions, getFaultSubCategoryOptions } from "@/lib/fault-taxonomy";

const categoryAlias: Record<string, string> = {
  road: "roads",
  roads: "roads",
  "ethekwini transport authority": "traffic",
  "ethekwini transportauthority": "traffic"
};

const subCategoryAliasByCategory: Record<string, Record<string, string>> = {
  electricity: {
    "loss of electricity supply": "Loss Of Electricity",
    "wires low/down": "Wires Down/Low",
    "tree/vegetation on line": "Tree Vegetation on Line"
  },
  "water-management": {
    "low pressure problem ((entire area)": "Low Pressure Problem (Entire Area)"
  }
};

function normalizeLoose(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normalizeFaultCategoryValue(raw: string) {
  const value = raw.trim().toLowerCase();
  if (categoryAlias[value]) {
    return categoryAlias[value];
  }

  const byLabel = faultCategoryOptions.find((item) => item.label.toLowerCase() === value);
  if (byLabel) {
    return byLabel.value;
  }

  const byValue = faultCategoryOptions.find((item) => item.value.toLowerCase() === value);
  if (byValue) {
    return byValue.value;
  }

  return undefined;
}

export function normalizeFaultSubCategory(categoryValue: string, raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const directAlias = subCategoryAliasByCategory[categoryValue]?.[trimmed.toLowerCase()];
  if (directAlias) {
    return directAlias;
  }

  const options = getFaultSubCategoryOptions(categoryValue);
  const exact = options.find((item) => item.toLowerCase() === trimmed.toLowerCase());
  if (exact) {
    return exact;
  }

  const loose = normalizeLoose(trimmed);
  const looseMatch = options.find((item) => normalizeLoose(item) === loose);
  if (looseMatch) {
    return looseMatch;
  }

  return trimmed;
}

export function buildFaultEscalationLookupKey(categoryRaw?: string, subCategoryRaw?: string) {
  const category = (categoryRaw ?? "").trim();
  const subCategory = (subCategoryRaw ?? "").trim();
  if (!category || !subCategory) return undefined;

  const categoryValue = normalizeFaultCategoryValue(category);
  if (!categoryValue) return undefined;

  const normalizedSubCategory = normalizeFaultSubCategory(categoryValue, subCategory);
  if (!normalizedSubCategory) return undefined;

  return `${categoryValue}::${normalizedSubCategory}`;
}

