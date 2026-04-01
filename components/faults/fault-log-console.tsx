"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaultSubCategoryDropdown } from "@/components/faults/fault-subcategory-dropdown";
import { GlobalSearch } from "@/components/shared/global-search";
import { ResidentSearchPicker } from "@/components/shared/resident-search-picker";
import { faultCategoryOptions, formatFaultCategory, getFaultSubCategoryOptions } from "@/lib/fault-taxonomy";
import { loadGoogleMaps } from "@/lib/google-maps-client";
import type { Fault, GlobalSearchItem, Resident, SessionUser } from "@/types/domain";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

const defaultForm = {
  title: "",
  ethekwiniReference: "",
  escalationBy: "admin" as "admin" | "resident",
  priority: "medium" as Fault["priority"],
  description: "",
  category: "electricity",
  subCategory: "Loss Of Electricity",
  locationText: "",
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  mediaRefs: [] as string[],
  residentId: ""
};

type FaultLogConsoleProps = {
  initialFaults: Fault[];
  residents: Resident[];
  currentUser: SessionUser | null;
};

export function FaultLogConsole({ initialFaults, residents, currentUser }: FaultLogConsoleProps) {
  const [faults, setFaults] = useState(initialFaults);
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const locationAutocompleteRef = useRef<any>(null);
  const availableSubCategories = useMemo(() => getFaultSubCategoryOptions(form.category), [form.category]);
  const openFaults = useMemo(
    () => faults.filter((fault) => fault.status !== "closed" && fault.status !== "archived"),
    [faults]
  );
  const oldestOpenFault = openFaults.length ? openFaults[openFaults.length - 1] : null;
  const priorityOverview = [
    { label: "Critical", tone: "danger" as const, count: openFaults.filter((fault) => fault.priority === "critical").length },
    { label: "High", tone: "warning" as const, count: openFaults.filter((fault) => fault.priority === "high").length },
    { label: "Medium", tone: "default" as const, count: openFaults.filter((fault) => fault.priority === "medium").length },
    { label: "Low", tone: "success" as const, count: openFaults.filter((fault) => fault.priority === "low").length }
  ];

  const searchItems: GlobalSearchItem[] = faults.map((fault) => ({
    id: fault.id,
    title: `${fault.id} • ${fault.title}`,
    subtitle: [fault.locationText, formatFaultCategory(fault.category, fault.subCategory), fault.priority].filter(Boolean).join(" • "),
    kind: "fault",
    keywords: [fault.description, fault.reporterEmail, fault.municipalityEmail, fault.subCategory, fault.ethekwiniReference].filter(Boolean) as string[]
  }));

  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      try {
        const response = await fetch("/api/public/config", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (isMounted) {
          setGoogleMapsApiKey(payload.googleMapsApiKey ?? "");
        }
      } catch {
        // Keep manual location mode if config is unavailable.
      }
    }

    void loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!googleMapsApiKey || !locationInputRef.current) {
      return;
    }

    let isCancelled = false;

    async function setupAutocomplete() {
      try {
        await loadGoogleMaps(googleMapsApiKey, ["places"]);
        if (isCancelled || !locationInputRef.current || !window.google?.maps?.places) {
          return;
        }

        locationAutocompleteRef.current = new window.google.maps.places.Autocomplete(locationInputRef.current, {
          fields: ["formatted_address", "geometry"],
          componentRestrictions: { country: "za" }
        });

        locationAutocompleteRef.current.addListener("place_changed", () => {
          const place = locationAutocompleteRef.current?.getPlace?.();
          const formattedAddress = place?.formatted_address ?? locationInputRef.current?.value ?? "";
          const latitude =
            typeof place?.geometry?.location?.lat === "function" ? place.geometry.location.lat() : undefined;
          const longitude =
            typeof place?.geometry?.location?.lng === "function" ? place.geometry.location.lng() : undefined;

          setForm((current) => ({
            ...current,
            locationText: formattedAddress,
            latitude,
            longitude
          }));
        });
      } catch {
        // Keep manual location mode if Google Maps fails.
      }
    }

    void setupAutocomplete();

    return () => {
      isCancelled = true;
      if (locationAutocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(locationAutocompleteRef.current);
      }
      locationAutocompleteRef.current = null;
    };
  }, [googleMapsApiKey]);

  async function createFault() {
    setIsBusy(true);
    setMessage(null);

    try {
      if (!form.ethekwiniReference.trim()) {
        throw new Error("eThekwini Fault Reference is required.");
      }

      const selectedResident = residents.find((resident) => resident.id === form.residentId);
      const reporterEmail =
        form.escalationBy === "admin"
          ? currentUser?.email
          : selectedResident?.email;

      if (form.escalationBy === "resident" && !form.residentId) {
        throw new Error("Select a resident before escalating for resident.");
      }

      if (!reporterEmail) {
        throw new Error("Reporter email could not be resolved for this escalation.");
      }

      const response = await fetch("/api/faults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          ethekwiniReference: form.ethekwiniReference.trim(),
          description: form.description,
          reporterEmail,
          category: form.category,
          subCategory: form.subCategory,
          priority: form.priority,
          locationText: form.locationText,
          latitude: form.latitude,
          longitude: form.longitude,
          mediaRefs: form.mediaRefs,
          residentId: form.residentId || undefined
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create fault.");
      }

      setFaults((current) => [payload.item, ...current]);
      setForm(defaultForm);
      setMessage("Fault escalated and added to the master queue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create fault.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMediaUpload(files: FileList | null) {
    if (!files) return;
    const existing = form.mediaRefs ?? [];
    const remainingSlots = Math.max(0, 4 - existing.length);
    if (remainingSlots === 0) {
      setMessage("Maximum of 4 images per fault.");
      return;
    }

    try {
      const selected = Array.from(files).slice(0, remainingSlots);
      const refs = await Promise.all(selected.map((file) => readFileAsDataUrl(file)));
      setForm((current) => ({
        ...current,
        mediaRefs: [...(current.mediaRefs ?? []), ...refs].slice(0, 4)
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload media.");
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Escalate Fault</h1>
          <p>Quick Fault Escalation Intake.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch items={searchItems} placeholder="Search existing faults before escalating a new one..." />
          <Link className="button-secondary" href="/dashboard/faults/register">
            Fault Queue
          </Link>
          <button className="button-primary" type="button" onClick={createFault} disabled={isBusy}>
            {isBusy ? "Working..." : "Escalate Fault"}
          </button>
        </div>
      </header>

      {message ? (
        <section className="flash-panel flash-panel-success">
          <strong>{message}</strong>
        </section>
      ) : null}

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Fault Escalation</h2>
              <p>Quick Fault Escalation Intake.</p>
            </div>
            <span className="status-chip status-chip-success">Live Intake</span>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Fault Title</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>eThekwini Fault Reference *</span>
              <input
                value={form.ethekwiniReference}
                onChange={(event) => setForm((current) => ({ ...current, ethekwiniReference: event.target.value }))}
                placeholder="Required municipal reference"
                required
              />
            </label>
            <label className="field field-wide">
              <span>Escalation Source</span>
              <select
                className="native-select"
                value={form.escalationBy}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    escalationBy: event.target.value as "admin" | "resident",
                    residentId: event.target.value === "resident" ? current.residentId : ""
                  }))
                }
              >
                <option value="admin">Escalate by Admin</option>
                <option value="resident">Escalate for Resident</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>Fault Priority</span>
              <select
                className="native-select"
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Fault["priority"] }))}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>Category</span>
              <select
                className="native-select"
                value={form.category}
                onChange={(event) => {
                  const nextCategory = event.target.value;
                  const nextSubCategory = getFaultSubCategoryOptions(nextCategory)[0] ?? "";
                  setForm((current) => ({ ...current, category: nextCategory, subCategory: nextSubCategory }));
                }}
              >
                {faultCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field field-wide">
              <span>Sub Category</span>
              <FaultSubCategoryDropdown
                value={form.subCategory}
                options={availableSubCategories}
                onChange={(value) => setForm((current) => ({ ...current, subCategory: value }))}
              />
            </div>
            {form.escalationBy === "resident" ? (
              <label className="field field-wide">
                <span>Resident Link</span>
                <ResidentSearchPicker
                  residents={residents}
                  value={form.residentId}
                  onChange={(residentId) => setForm((current) => ({ ...current, residentId }))}
                />
              </label>
            ) : null}
            <label className="field field-wide">
              <span>Fault Location</span>
              <input
                ref={locationInputRef}
                value={form.locationText}
                onChange={(event) =>
                  setForm((current) => ({ ...current, locationText: event.target.value, latitude: undefined, longitude: undefined }))
                }
                placeholder="Search Google Maps location to pinpoint the fault"
              />
            </label>
            <label className="field field-wide">
              <span>Description</span>
              <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Fault Images (max 4)</span>
              <input type="file" accept="image/*" multiple onChange={(event) => void handleMediaUpload(event.target.files)} />
              <small>{form.mediaRefs.length}/4 images added</small>
            </label>
            {form.mediaRefs.length > 0 ? (
              <div className="fault-media-grid">
                {form.mediaRefs.map((ref, index) => (
                  <article key={`intake-media-${index}`} className="fault-media-item">
                    <img src={ref} alt={`Fault intake image ${index + 1}`} />
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          mediaRefs: current.mediaRefs.filter((_, itemIndex) => itemIndex !== index)
                        }))
                      }
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Fault Action Queue</h2>
              <p>Fault Overview.</p>
            </div>
            <span className="status-chip status-chip-warning">Due Today</span>
          </div>

          <div className="dashboard-stack">
            <article className="dashboard-queue-card">
              <div className="panel-head">
                <div>
                  <h3>Oldest Open Fault</h3>
                  <p>{oldestOpenFault ? oldestOpenFault.title : "No open faults"}</p>
                </div>
                <span className="status-chip status-chip-default">
                  {oldestOpenFault ? oldestOpenFault.priority : "clear"}
                </span>
              </div>
              {oldestOpenFault ? (
                <div className="meta-row">
                  <span className="tag">{oldestOpenFault.id}</span>
                  <span className="tag">{formatFaultCategory(oldestOpenFault.category, oldestOpenFault.subCategory)}</span>
                  <span className="tag">{oldestOpenFault.locationText}</span>
                </div>
              ) : null}
            </article>
            <article className="dashboard-queue-card">
              <div className="panel-head">
                <div>
                  <h3>Faults by Priority</h3>
                  <p>Live open-fault priority distribution.</p>
                </div>
              </div>
              <div className="meta-row">
                {priorityOverview.map((item) => (
                  <span key={item.label} className={`status-chip status-chip-${item.tone}`}>
                    {item.label}: {item.count}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </article>
      </section>
    </>
  );
}
