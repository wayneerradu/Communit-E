export const faultCategoryOptions = [
  { value: "electricity", label: "Electricity" },
  { value: "pollution", label: "Pollution" },
  { value: "roads", label: "Roads" },
  { value: "stormwater-catchment", label: "Stormwater Catchment" },
  { value: "traffic", label: "Traffic" },
  { value: "problem-buildings-inspectorate", label: "Problem Buildings Inspectorate" },
  { value: "building-inspectorate", label: "Building Inspectorate" },
  { value: "waste-water", label: "Waste Water" },
  { value: "water-management", label: "Water Management" },
  { value: "cleansing-solid-waste", label: "Cleansing and Solid Waste" },
  { value: "parks-recreation", label: "Parks & Recreation" },
  { value: "durban-metro", label: "Durban Metro" }
] as const;

export const electricitySubCategoryOptions = [
  "Loss Of Electricity",
  "Copper Theft",
  "Wires Down/Low",
  "Tree Vegetation on Line",
  "Flickering Electricity Supply",
  "Sparks from Pole",
  "Cable Damaged",
  "Shocks",
  "Pole Leaning",
  "Fire Emergency",
  "Damaged Equipment",
  "Substation Doors Open",
  "Street Light Fault"
] as const;

export const pollutionSubCategoryOptions = [
  "Air Pollution Health",
  "Land Polution Petrol/Oil",
  "Water Poluted Rivers"
] as const;

export const roadsSubCategoryOptions = [
  "Missing Manhole Cover",
  "Obstruction on Road",
  "Over Flowing Pipe Blocked",
  "Pot Hole",
  "Sinkhole",
  "Road Markings",
  "Road Signs"
] as const;

export const stormwaterCatchmentSubCategoryOptions = [
  "Flood Damage",
  "Damage to Stormwater Infrastructure"
] as const;

export const trafficSubCategoryOptions = [
  "All Lights out Of Order",
  "Single Light Out",
  "Flashing",
  "Timing",
  "Road Safety",
  "Speed Bumps"
] as const;

export const problemBuildingsInspectorateSubCategoryOptions = [
  "Problem Buildings"
] as const;

export const buildingInspectorateSubCategoryOptions = [
  "Building Inspector"
] as const;

export const wasteWaterSubCategoryOptions = [
  "Missing Manhole Cover",
  "Main Line Blockage",
  "Sewage Issues"
] as const;

export const waterManagementSubCategoryOptions = [
  "Water Leaks",
  "Water Leak Reinstatements",
  "Burst Meter",
  "Burst Pipe",
  "Leaking Hydrant",
  "Leaking Meter",
  "Leaking Pipe Verge",
  "Water Pressure Problem",
  "No Water (Entire Area)",
  "No Water (Single Household)",
  "Low Pressure Problem (Single Household)",
  "Low Pressure Problem (Entire Area)",
  "Recurring Water Leak (Road)"
] as const;

export const cleansingSolidWasteSubCategoryOptions = [
  "Recycling (Orange Bags)",
  "Refuse Collection (Black and Blue Bags)",
  "Illegal Dumping"
] as const;

export const parksRecreationSubCategoryOptions = [
  "Trees",
  "Verges",
  "Stadiums+Fields & Parks",
  "Grass Cutting"
] as const;

export const durbanMetroSubCategoryOptions = [
  "Public Safety"
] as const;

export function getFaultSubCategoryOptions(category: string) {
  if (category === "electricity") {
    return [...electricitySubCategoryOptions];
  }

  if (category === "pollution") {
    return [...pollutionSubCategoryOptions];
  }

  if (category === "roads") {
    return [...roadsSubCategoryOptions];
  }

  if (category === "stormwater-catchment") {
    return [...stormwaterCatchmentSubCategoryOptions];
  }

  if (category === "traffic") {
    return [...trafficSubCategoryOptions];
  }

  if (category === "problem-buildings-inspectorate") {
    return [...problemBuildingsInspectorateSubCategoryOptions];
  }

  if (category === "building-inspectorate") {
    return [...buildingInspectorateSubCategoryOptions];
  }

  if (category === "waste-water") {
    return [...wasteWaterSubCategoryOptions];
  }

  if (category === "water-management") {
    return [...waterManagementSubCategoryOptions];
  }

  if (category === "cleansing-solid-waste") {
    return [...cleansingSolidWasteSubCategoryOptions];
  }

  if (category === "parks-recreation") {
    return [...parksRecreationSubCategoryOptions];
  }

  if (category === "durban-metro") {
    return [...durbanMetroSubCategoryOptions];
  }

  return [];
}

export function getFaultCategoryLabel(category?: string) {
  const match = faultCategoryOptions.find((option) => option.value === category);
  return match?.label ?? category ?? "";
}

export function formatFaultCategory(category?: string, subCategory?: string) {
  const categoryLabel = getFaultCategoryLabel(category);
  if (categoryLabel && subCategory) {
    return `${categoryLabel} • ${subCategory}`;
  }

  return categoryLabel || subCategory || "";
}
