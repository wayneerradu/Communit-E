"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { GlobalSearch } from "@/components/shared/global-search";
import { InfrastructureGlyph, getAssetTypeLabel, infrastructureTypeOptions } from "@/components/infrastructure/infrastructure-map-meta";
import type { GlobalSearchItem, InfrastructureAsset } from "@/types/domain";

type InfrastructureConsoleProps = {
  initialAssets: InfrastructureAsset[];
};

const defaultForm = {
  assetName: "",
  assetType: "streetlight-pole" as InfrastructureAsset["assetType"],
  condition: "Operational",
  street: "",
  latitude: "",
  longitude: "",
  notes: ""
};

const infrastructureConditionOptions = [
  "Operational",
  "Verified and Active",
  "Needs Inspection",
  "Needs Maintenance",
  "Partially Damaged",
  "Damaged",
  "Critical Failure",
  "Offline / Not Working",
  "Temporary Fix Applied",
  "Repaired - Awaiting Verification",
  "Replaced",
  "Decommissioned"
] as const;

function getAssetTone(assetType: string) {
  switch (assetType) {
    case "streetlight-pole":
    case "optic-fiber-pole":
    case "water-meter":
      return "default";
    case "water-valve":
    case "fire-hydrant":
    case "manhole":
      return "warning";
    case "electrical-substation":
    case "electrical-distribution-box":
    case "traffic-light":
      return "danger";
    default:
      return "success";
  }
}

export function InfrastructureConsole({ initialAssets }: InfrastructureConsoleProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [selectedAssetId, setSelectedAssetId] = useState(initialAssets[0]?.id ?? "");
  const [form, setForm] = useState(defaultForm);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>("");
  const [recentTypeIndex, setRecentTypeIndex] = useState(0);
  const [qualityFilter, setQualityFilter] = useState<"all" | "missing-photo" | "missing-coordinates">("all");
  const [qualityTileMode, setQualityTileMode] = useState<"missing-photo" | "missing-coordinates">("missing-photo");
  const [noteDraft, setNoteDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const featuredAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];
  const mappedAssetsCount = assets.filter(
    (asset) => typeof asset.latitude === "number" && typeof asset.longitude === "number"
  ).length;
  const needsMappingCount = Math.max(assets.length - mappedAssetsCount, 0);
  const completeAssets = assets.filter((asset) => {
    const hasTextFields = [asset.assetName, asset.assetType, asset.condition, asset.street]
      .every((value) => String(value ?? "").trim().length > 0);
    const hasCoordinates =
      typeof asset.latitude === "number" && Number.isFinite(asset.latitude) &&
      typeof asset.longitude === "number" && Number.isFinite(asset.longitude);
    const hasNotes = String(asset.notes ?? "").trim().length > 0;
    const hasPhoto = Array.isArray(asset.photos) && asset.photos.length > 0;
    return hasTextFields && hasCoordinates && hasNotes && hasPhoto;
  });
  const completeByType = infrastructureTypeOptions.map((option) => ({
    type: option.value,
    label: option.label,
    count: completeAssets.filter((asset) => asset.assetType === option.value).length
  }));
  const mostDocumented = completeByType.sort((a, b) => b.count - a.count)[0];
  const dataQualityQueue = assets.filter((asset) => {
    const condition = (asset.condition ?? "").toLowerCase();
    const hasCoordinates =
      typeof asset.latitude === "number" && typeof asset.longitude === "number";
    return !hasCoordinates || condition.includes("review");
  });
  const missingPhotoCount = assets.filter((asset) => !Array.isArray(asset.photos) || asset.photos.length === 0).length;
  const missingPhotoByType = infrastructureTypeOptions
    .map((option) => ({
      type: option.value,
      count: assets.filter(
        (asset) => asset.assetType === option.value && (!Array.isArray(asset.photos) || asset.photos.length === 0)
      ).length
    }))
    .sort((a, b) => b.count - a.count)[0];
  const missingCoordinatesCount = assets.filter(
    (asset) =>
      typeof asset.latitude !== "number" ||
      !Number.isFinite(asset.latitude) ||
      typeof asset.longitude !== "number" ||
      !Number.isFinite(asset.longitude)
  ).length;
  const missingCoordinatesByType = infrastructureTypeOptions
    .map((option) => ({
      type: option.value,
      count: assets.filter(
        (asset) =>
          asset.assetType === option.value &&
          (typeof asset.latitude !== "number" ||
            !Number.isFinite(asset.latitude) ||
            typeof asset.longitude !== "number" ||
            !Number.isFinite(asset.longitude))
      ).length
    }))
    .sort((a, b) => b.count - a.count)[0];
  const visibleQualityQueue =
    qualityFilter === "missing-photo"
      ? dataQualityQueue.filter((asset) => !Array.isArray(asset.photos) || asset.photos.length === 0)
      : qualityFilter === "missing-coordinates"
        ? dataQualityQueue.filter(
            (asset) =>
              typeof asset.latitude !== "number" ||
              !Number.isFinite(asset.latitude) ||
              typeof asset.longitude !== "number" ||
              !Number.isFinite(asset.longitude)
          )
        : dataQualityQueue;
  const latestAsset = assets[0];
  const recentAssetTypes = Array.from(
    new Set(
      assets
        .slice(0, 12)
        .map((asset) => asset.assetType)
    )
  ).slice(0, 3);
  const rotatingRecentType = recentAssetTypes[recentTypeIndex] ?? null;

  useEffect(() => {
    if (recentAssetTypes.length <= 1) {
      setRecentTypeIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setRecentTypeIndex((current) => (current + 1) % recentAssetTypes.length);
    }, 2500);

    return () => window.clearInterval(timer);
  }, [recentAssetTypes]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQualityTileMode((current) =>
        current === "missing-photo" ? "missing-coordinates" : "missing-photo"
      );
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);
  const searchItems: GlobalSearchItem[] = assets.map((asset) => ({
    id: asset.id,
    title: asset.assetName,
    subtitle: [asset.street, asset.assetType, asset.condition].filter(Boolean).join(" • "),
    kind: "infrastructure",
    keywords: [asset.notes].filter(Boolean) as string[]
  }));

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoDataUrl(null);
      setPhotoName("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage("Image is too large. Please keep it under 8MB.");
      event.target.value = "";
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.readAsDataURL(file);
    });

    setPhotoDataUrl(dataUrl);
    setPhotoName(file.name);
  }

  async function createAsset() {
    setIsBusy(true);
    setMessage(null);

    try {
      const payloadBody = {
        ...form,
        photos: photoDataUrl ? [photoDataUrl] : []
      };
      const response = await fetch("/api/infrastructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add asset.");
      }

      setAssets((current) => [payload.item, ...current]);
      setSelectedAssetId(payload.item.id);
      setForm(defaultForm);
      setPhotoDataUrl(null);
      setPhotoName("");
      setMessage("Infrastructure asset added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add asset.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateAsset() {
    if (!featuredAsset || !noteDraft.trim()) return;
    if (noteDraft.trim() === (featuredAsset.notes ?? "").trim()) {
      setMessage("No changes to save.");
      return;
    }
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/infrastructure/${featuredAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteDraft, condition: featuredAsset.condition })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update asset.");
      }

      setAssets((current) => current.map((asset) => (asset.id === payload.item.id ? payload.item : asset)));
      setNoteDraft("");
      setMessage("Asset notes updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update asset.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateCondition(condition: string) {
    if (!featuredAsset) return;
    if (condition === featuredAsset.condition) {
      setMessage("No changes to save.");
      return;
    }
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/infrastructure/${featuredAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update condition.");
      }

      setAssets((current) => current.map((asset) => (asset.id === payload.item.id ? payload.item : asset)));
      setMessage(`Condition updated to ${condition}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update condition.");
    } finally {
      setIsBusy(false);
    }
  }

  function jumpToSection(sectionId: string) {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function handleStatTileClick(target: "assets" | "documented" | "recent" | "quality") {
    if (target === "assets" && assets[0]) {
      setSelectedAssetId(assets[0].id);
      jumpToSection("infrastructure-asset-snapshot");
      return;
    }

    if (target === "recent") {
      if (latestAsset) {
        setSelectedAssetId(latestAsset.id);
      }
      jumpToSection("infrastructure-asset-snapshot");
      return;
    }

    if (target === "quality") {
      setQualityFilter(qualityTileMode);
      jumpToSection("infrastructure-data-quality-queue");
      return;
    }

    if (target === "documented") {
      setQualityFilter("all");
      if (featuredAsset) {
        setSelectedAssetId(featuredAsset.id);
      }
      jumpToSection("infrastructure-asset-snapshot");
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Infrastructure Hub</h1>
          <p>Maintain the internal infrastructure asset database with location, type, condition, and field notes.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch
            items={searchItems}
            onItemSelect={(item) => {
              setSelectedAssetId(item.id);
              jumpToSection("infrastructure-asset-snapshot");
            }}
          />
          <button className="button-primary" type="button" onClick={createAsset} disabled={isBusy}>
            {isBusy ? "Working..." : "Add Asset"}
          </button>
        </div>
      </header>

      {message ? (
        <section className="flash-panel flash-panel-success">
          <strong>{message}</strong>
        </section>
      ) : null}

      <section className="dashboard-stat-grid">
        <button type="button" className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("assets")}>
          <span>Total Assets</span>
          <strong>{assets.length}</strong>
          <small>Internal asset register</small>
        </button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("documented")}>
          <span>Most Documented Asset Type</span>
          <strong>{mostDocumented?.count ?? 0}</strong>
          <small>{mostDocumented?.count ? getAssetTypeLabel(mostDocumented.type) : "No complete assets yet"}</small>
        </button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-success dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("recent")}>
          <span>Recently Updated Asset</span>
          <strong>{latestAsset?.assetName ?? "No assets yet"}</strong>
          <small>
            {rotatingRecentType ? `Recent type: ${getAssetTypeLabel(rotatingRecentType)}` : "No recent asset types yet"}
          </small>
        </button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-danger dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("quality")}>
          <span>{qualityTileMode === "missing-photo" ? "Assets Missing Photo" : "Assets Missing Coordinates"}</span>
          <strong>{qualityTileMode === "missing-photo" ? missingPhotoCount : missingCoordinatesCount}</strong>
          <small>
            {qualityTileMode === "missing-photo"
              ? (missingPhotoByType?.count ? `Top type: ${getAssetTypeLabel(missingPhotoByType.type)}` : "All assets have photos")
              : (missingCoordinatesByType?.count
                  ? `Top type: ${getAssetTypeLabel(missingCoordinatesByType.type)}`
                  : "All assets have coordinates")}
          </small>
        </button>
      </section>

      <section className="dashboard-feature-grid">
        <article id="infrastructure-asset-snapshot" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Asset Intake</h2>
              <p>Add an asset quickly now and improve the record over time as GPS, photos, and official references become available.</p>
            </div>
            <span className="status-chip status-chip-success">Live Intake</span>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Asset Name</span>
              <input value={form.assetName} onChange={(event) => setForm((current) => ({ ...current, assetName: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Type</span>
              <select value={form.assetType} onChange={(event) => setForm((current) => ({ ...current, assetType: event.target.value as InfrastructureAsset["assetType"] }))}>
                <option value="streetlight-pole">Streetlight Pole</option>
                <option value="optic-fiber-pole">Optic Fiber Pole</option>
                <option value="electrical-substation">Electrical Substation</option>
                <option value="electrical-distribution-box">Electrical Distribution Box</option>
                <option value="water-meter">Water Meter</option>
                <option value="water-valve">Water Valve</option>
                <option value="fire-hydrant">Fire Hydrant</option>
                <option value="traffic-light">Traffic Light</option>
                <option value="manhole">Manhole</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>Condition</span>
              <select value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}>
                {infrastructureConditionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>Road</span>
              <input value={form.street} onChange={(event) => setForm((current) => ({ ...current, street: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Latitude</span>
              <input value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Longitude</span>
              <input value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Asset Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
              />
              <small>{photoName ? `Selected: ${photoName}` : "Take or upload one image."}</small>
            </label>
            <label className="field field-full">
              <span>Notes</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </label>
            {photoDataUrl ? (
              <div className="field field-full">
                <span>Preview</span>
                <img
                  src={photoDataUrl}
                  alt="Asset upload preview"
                  style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(17, 48, 63, 0.12)" }}
                />
              </div>
            ) : null}
          </div>
        </article>

        <article id="infrastructure-layered-map" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Asset Legend</h2>
              <p>Document the Following Assets so we can log a fault against the infrastructure asset when there is a fault/Break/fix Needed.</p>
            </div>
            <span className="status-chip status-chip-success">Lets Add</span>
          </div>

          <div className="infrastructure-map-surface">
            <div>
              <strong>Mount Vernon Assets</strong>
              <p>All infrastructure types below use the same color and icon rules as the Infrastructure Map.</p>
            </div>
            <div className="infrastructure-map-legend">
              {infrastructureTypeOptions.map((option) => (
                <div key={option.value} className="infrastructure-map-legend-item">
                  <span
                    className="infrastructure-map-legend-pin"
                    style={{ ["--infrastructure-type-color" as string]: option.color }}
                  >
                    <InfrastructureGlyph type={option.value} />
                  </span>
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Asset Overview</h2>
              <p>Selected Asset Operational context without forcing admins into a heavy GIS workflow.</p>
            </div>
            {featuredAsset ? <span className={`status-chip status-chip-${getAssetTone(featuredAsset.assetType)}`}>{featuredAsset.assetType}</span> : null}
          </div>

          {featuredAsset ? (
            <>
              <div className="dashboard-actions-row">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`faults-selection-pill${asset.id === featuredAsset.id ? " faults-selection-pill-active" : ""}`}
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    {asset.assetName}
                  </button>
                ))}
              </div>

              <div className="field-grid">
                <div className="field">
                  <label>CommUNIT-E Asset ID</label>
                  <strong>{featuredAsset.id}</strong>
                </div>
                <div className="field">
                  <label>Official Reference</label>
                  <strong>Pending</strong>
                </div>
                <div className="field">
                  <label>Asset Name</label>
                  <strong>{featuredAsset.assetName}</strong>
                </div>
                <div className="field">
                  <label>Condition</label>
                  <strong>{featuredAsset.condition}</strong>
                </div>
                <div className="field">
                  <label>Road</label>
                  <strong>{featuredAsset.street}</strong>
                </div>
                <div className="field">
                  <label>Map Status</label>
                  <strong>
                    {typeof featuredAsset.latitude === "number" && typeof featuredAsset.longitude === "number"
                      ? "Mapped"
                      : "Needs Mapping"}
                  </strong>
                </div>
              </div>

              <div className="dashboard-actions-row">
                <button className="button-secondary" type="button" onClick={() => updateCondition("Verified and Active")} disabled={isBusy}>
                  Mark Verified
                </button>
                <button className="button-secondary" type="button" onClick={() => updateCondition("Needs Inspection")} disabled={isBusy}>
                  Needs Review
                </button>
              </div>

              <div className="fault-note-composer">
                <label className="field field-full">
                  <span>Asset Notes</span>
                  <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={4} placeholder={featuredAsset.notes ?? "Add field intelligence, GPS corrections, or verification notes..."} />
                </label>
                <div className="dashboard-actions-row">
                  <button className="button-primary" type="button" onClick={updateAsset} disabled={isBusy || !noteDraft.trim()}>
                    Save Notes
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </article>

        <article id="infrastructure-data-quality-queue" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Asset Data Quality Queue</h2>
              <p>Assets needing mapping or condition review are surfaced here for quick cleanup.</p>
            </div>
            <span className="status-chip status-chip-warning">Live Queue</span>
          </div>
          <div className="dashboard-actions-row">
            <button
              type="button"
              className={`faults-selection-pill${qualityFilter === "all" ? " faults-selection-pill-active" : ""}`}
              onClick={() => setQualityFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`faults-selection-pill${qualityFilter === "missing-photo" ? " faults-selection-pill-active" : ""}`}
              onClick={() => setQualityFilter("missing-photo")}
            >
              Missing Photo
            </button>
            <button
              type="button"
              className={`faults-selection-pill${qualityFilter === "missing-coordinates" ? " faults-selection-pill-active" : ""}`}
              onClick={() => setQualityFilter("missing-coordinates")}
            >
              Missing Coordinates
            </button>
          </div>

          <div className="dashboard-stack">
            {visibleQualityQueue.map((asset) => (
              <article key={asset.id} className="dashboard-fault-list-card">
                <div className="panel-head">
                  <div>
                    <h3>{asset.assetName}</h3>
                    <p>{asset.street}</p>
                  </div>
                  <span className={`status-chip status-chip-${getAssetTone(asset.assetType)}`}>
                    {typeof asset.latitude === "number" && typeof asset.longitude === "number" ? "Mapped" : "Needs Mapping"}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="tag">{asset.assetType}</span>
                  <span className="tag">{asset.condition || "No condition"}</span>
                  <span className="tag">{asset.notes ? "Notes Captured" : "No Notes"}</span>
                </div>
              </article>
            ))}
            {visibleQualityQueue.length === 0 ? (
              <article className="dashboard-today-card">
                <strong>
                  {qualityFilter === "missing-photo"
                    ? "No assets are missing photos."
                    : qualityFilter === "missing-coordinates"
                      ? "No assets are missing coordinates."
                    : "No assets currently need mapping or review."}
                </strong>
              </article>
            ) : null}
          </div>
        </article>
      </section>
    </>
  );
}

