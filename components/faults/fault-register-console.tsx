"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FaultSubCategoryDropdown } from "@/components/faults/fault-subcategory-dropdown";
import { GlobalSearch } from "@/components/shared/global-search";
import { faultCategoryOptions, getFaultCategoryLabel, getFaultSubCategoryOptions } from "@/lib/fault-taxonomy";
import { loadGoogleMaps } from "@/lib/google-maps-client";
import type { Fault, GlobalSearchItem, Resident, SessionUser } from "@/types/domain";

type QueueView = "all-open" | "my-faults" | "priority" | "status" | "sla-breach" | "age" | "last-update";

const SLA_DAYS: Record<Fault["priority"], number> = {
  critical: 2,
  high: 5,
  medium: 10,
  low: 14
};

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysAgo(value?: string) {
  const parsed = parseDate(value);
  if (!parsed) return 0;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
}

function hoursAgo(value?: string) {
  const parsed = parseDate(value);
  if (!parsed) return 0;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60)));
}

function formatDate(value?: string) {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleString("en-ZA") : "Not available";
}

function getEscalationThreshold(priority: Fault["priority"]) {
  if (priority === "critical") return { plus: 0, plusplus: 0 };
  if (priority === "high") return { plus: 0, plusplus: 2 };
  return { plus: 4, plusplus: 7 };
}

function canEscalateLevel(fault: Fault, level: "plus" | "plusplus") {
  const anchor = fault.escalatedAt ?? fault.createdAt;
  if (!anchor) return false;
  const elapsed = daysAgo(anchor);
  const threshold = getEscalationThreshold(fault.priority);
  return level === "plus" ? elapsed >= threshold.plus : elapsed >= threshold.plusplus;
}

function toStatusTone(status: Fault["status"]) {
  if (status === "closed") return "success";
  if (status === "archived") return "default";
  if (status === "in-progress") return "warning";
  return "danger";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

type Props = {
  initialFaults: Fault[];
  residents: Resident[];
  currentUser: SessionUser | null;
  initialQueueView?: QueueView;
  initialQueueFilter?: string;
  headerTitle?: string;
  headerDescription?: string;
  lockToMyFaults?: boolean;
  initialSelectedFaultId?: string;
  closedArchiveOnly?: boolean;
};

export function FaultRegisterConsole({
  initialFaults,
  residents,
  currentUser,
  initialQueueView = "priority",
  initialQueueFilter,
  headerTitle = "Fault Queue",
  headerDescription = "Operational queue workspace for live fault handling, escalation, and closure.",
  lockToMyFaults = false,
  initialSelectedFaultId = "",
  closedArchiveOnly = false
}: Props) {
  const pageSize = 10;
  const [faults, setFaults] = useState(initialFaults);
  const [queueView, setQueueView] = useState<QueueView>(closedArchiveOnly ? "status" : initialQueueView);
  const [myFaultsFilterBy, setMyFaultsFilterBy] = useState<QueueView>("priority");
  const [queueFilter, setQueueFilter] = useState<string>(
    initialQueueFilter ?? (closedArchiveOnly ? "all" : initialQueueView === "priority" ? "critical" : "all")
  );
  const [queueTextSearch, setQueueTextSearch] = useState("");
  const deferredQueueTextSearch = useDeferredValue(queueTextSearch);
  const [queuePage, setQueuePage] = useState(1);
  const [selectedFaultId, setSelectedFaultId] = useState(initialSelectedFaultId);
  const [workspaceFlashToken, setWorkspaceFlashToken] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState("");
  const [publicNoteText, setPublicNoteText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "warning">("success");
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [editDraft, setEditDraft] = useState<Partial<Fault>>({});
  const editDraftRef = useRef<Partial<Fault>>({});
  const [previewMediaIndex, setPreviewMediaIndex] = useState<number | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const locationAutocompleteRef = useRef<any>(null);

  const adminOptions = useMemo(
    () =>
      residents.filter((resident) =>
        ["admin", "street-captain", "volunteer", "animal-care-volunteer"].includes(resident.residentType ?? "resident")
      ),
    [residents]
  );
  const effectiveCategory = String(editDraft.category ?? "electricity");
  const availableSubCategories = useMemo(
    () => getFaultSubCategoryOptions(effectiveCategory),
    [effectiveCategory]
  );

  const searchItems: GlobalSearchItem[] = faults.map((fault) => ({
    id: fault.id,
    title: `${fault.id} • ${fault.title}`,
    subtitle: [fault.ethekwiniReference, fault.locationText, fault.priority].filter(Boolean).join(" • "),
    kind: "fault",
    keywords: [fault.description, fault.category, fault.subCategory, fault.reporterEmail].filter(Boolean) as string[]
  }));

  const visibleFaults = useMemo(
    () =>
      closedArchiveOnly
        ? faults.filter((fault) => fault.status === "closed" || fault.status === "archived")
        : faults,
    [closedArchiveOnly, faults]
  );

  const openFaults = useMemo(
    () => visibleFaults.filter((fault) => fault.status !== "closed" && fault.status !== "archived"),
    [visibleFaults]
  );
  const effectiveQueueMode: QueueView = closedArchiveOnly ? "status" : lockToMyFaults ? myFaultsFilterBy : queueView;

  const queueFilterOptions = useMemo(() => {
    if (effectiveQueueMode === "all-open" || effectiveQueueMode === "my-faults" || effectiveQueueMode === "age" || effectiveQueueMode === "last-update") {
      return [{ value: "all", label: "All" }];
    }

    if (effectiveQueueMode === "priority") {
      return [
        { value: "critical", label: "Critical" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" }
      ];
    }
    if (effectiveQueueMode === "status") {
      if (closedArchiveOnly) {
        return [
          { value: "all", label: "All Closed + Archived" },
          { value: "closed", label: "Closed" },
          { value: "archived", label: "Archived" }
        ];
      }
      return [
        { value: "escalated", label: "Escalated" },
        { value: "in-progress", label: "In Progress" },
        { value: "closed", label: "Closed" },
        { value: "archived", label: "Archived" }
      ];
    }
    if (effectiveQueueMode === "sla-breach") {
      return [
        { value: "breached", label: "Breached" },
        { value: "on-track", label: "On Track" }
      ];
    }
    return [{ value: "all", label: "All" }];
  }, [closedArchiveOnly, effectiveQueueMode]);

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
        // Keep manual mode if config is unavailable.
      }
    }

    void loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!queueFilterOptions.find((item) => item.value === queueFilter)) {
      setQueueFilter(queueFilterOptions[0]?.value ?? "all");
    }
  }, [queueFilter, queueFilterOptions]);

  useEffect(() => {
    setQueuePage(1);
  }, [queueTextSearch, queueView, myFaultsFilterBy, queueFilter]);

  const queuedFaults = useMemo(() => {
    const myFaults = openFaults.filter((fault) => {
      const assignedEmail = (fault.assignedToEmail ?? "").trim().toLowerCase();
      const assignedName = (fault.assignedAdminName ?? "").trim().toLowerCase();
      const userEmail = (currentUser?.email ?? "").trim().toLowerCase();
      const userName = (currentUser?.name ?? "").trim().toLowerCase();
      return (userEmail && assignedEmail === userEmail) || (userName && assignedName === userName);
    });
    const source = lockToMyFaults
      ? myFaults
      : queueView === "status"
        ? visibleFaults
        : queueView === "my-faults"
          ? myFaults
          : openFaults;

    const filtered = source.filter((fault) => {
      if (effectiveQueueMode === "all-open" || effectiveQueueMode === "my-faults" || effectiveQueueMode === "age" || effectiveQueueMode === "last-update") {
        return true;
      }
      if (effectiveQueueMode === "priority") return fault.priority === queueFilter;
      if (effectiveQueueMode === "status") return queueFilter === "all" ? true : fault.status === queueFilter;
      if (effectiveQueueMode === "sla-breach") {
        const breached = daysAgo(fault.escalatedAt ?? fault.createdAt) > SLA_DAYS[fault.priority];
        return queueFilter === "breached" ? breached : !breached;
      }
      return true;
    });

    const searchTerm = deferredQueueTextSearch.trim().toLowerCase();
    const textFiltered = searchTerm
      ? filtered.filter((fault) => {
          const haystack = [
            fault.ethekwiniReference,
            fault.status,
            fault.title,
            fault.assignedAdminName,
            fault.assignedToEmail,
            fault.priority
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(searchTerm);
        })
      : filtered;

    if (effectiveQueueMode === "age") {
      return [...textFiltered].sort(
        (left, right) => daysAgo(right.escalatedAt ?? right.createdAt) - daysAgo(left.escalatedAt ?? left.createdAt)
      );
    }
    if (effectiveQueueMode === "last-update") {
      return [...textFiltered].sort((left, right) => hoursAgo(right.updatedAt) - hoursAgo(left.updatedAt));
    }
    return textFiltered;
  }, [currentUser?.email, currentUser?.name, deferredQueueTextSearch, effectiveQueueMode, lockToMyFaults, openFaults, queueView, queueFilter, visibleFaults]);

  const totalPages = Math.max(1, Math.ceil(queuedFaults.length / pageSize));
  const currentPage = Math.min(queuePage, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedQueuedFaults = queuedFaults.slice(pageStart, pageStart + pageSize);
  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, currentPage - 3),
    Math.min(totalPages, currentPage + 2)
  );

  useEffect(() => {
    if (queuePage > totalPages) {
      setQueuePage(totalPages);
    }
  }, [queuePage, totalPages]);

  useEffect(() => {
    if (selectedFaultId && !visibleFaults.find((fault) => fault.id === selectedFaultId)) {
      setSelectedFaultId("");
    }
  }, [selectedFaultId, visibleFaults]);

  const selectedFault = visibleFaults.find((fault) => fault.id === selectedFaultId) ?? null;

  useEffect(() => {
    if (!selectedFault) return;
    setPreviewMediaIndex(null);
    setEditDraft({
      title: selectedFault.title,
      ethekwiniReference: selectedFault.ethekwiniReference,
      description: selectedFault.description,
      category: selectedFault.category,
      subCategory: selectedFault.subCategory,
      priority: selectedFault.priority,
      locationText: selectedFault.locationText,
      latitude: selectedFault.latitude,
      longitude: selectedFault.longitude,
      mediaRefs: selectedFault.mediaRefs ?? [],
      residentId: selectedFault.residentId,
      assignedToEmail: selectedFault.assignedToEmail,
      assignedAdminName: selectedFault.assignedAdminName
    });
  }, [selectedFaultId, selectedFault]);

  useEffect(() => {
    editDraftRef.current = editDraft;
  }, [editDraft]);

  useEffect(() => {
    if (!googleMapsApiKey || !isEditing || !locationInputRef.current) {
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

          setEditDraft((current) => ({
            ...current,
            locationText: formattedAddress,
            latitude,
            longitude
          }));
        });
      } catch {
        // Keep manual location entry if Google Maps cannot load.
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
  }, [googleMapsApiKey, isEditing, selectedFaultId]);

  useEffect(() => {
    if (!selectedFault) return;
    const timer = window.setInterval(() => {
      setNudgeIndex((current) => (current + 1) % 5);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [selectedFaultId, selectedFault]);

  function applyFaultUpdate(next: Fault) {
    setFaults((current) => current.map((fault) => (fault.id === next.id ? next : fault)));
  }

  function handleSelectFault(faultId: string) {
    setSelectedFaultId(faultId);
    setWorkspaceFlashToken(Date.now());
  }

  async function runPatch(payload: Record<string, unknown>) {
    if (!selectedFault) return null;
    setIsBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/faults/${selectedFault.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          expectedUpdatedAt: selectedFault.updatedAt
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update fault.");
      }
      applyFaultUpdate(result.fault);
      setMessageTone("success");
      setMessage("Fault updated.");
      return result;
    } catch (error) {
      setMessageTone("warning");
      setMessage(error instanceof Error ? error.message : "Unable to update fault.");
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  async function saveEdits() {
    if (!selectedFault) return;
    const draft = editDraftRef.current;
    const locationChanged = (draft.locationText ?? "") !== (selectedFault.locationText ?? "");
    const nextLatitude =
      draft.latitude !== undefined ? draft.latitude : locationChanged ? null : selectedFault.latitude ?? null;
    const nextLongitude =
      draft.longitude !== undefined ? draft.longitude : locationChanged ? null : selectedFault.longitude ?? null;

    const payload: Record<string, unknown> = {};

    if (draft.title !== undefined && draft.title !== selectedFault.title) payload.title = draft.title;
    if (draft.ethekwiniReference !== undefined && draft.ethekwiniReference !== selectedFault.ethekwiniReference) {
      payload.ethekwiniReference = draft.ethekwiniReference;
    }
    if (draft.description !== undefined && draft.description !== selectedFault.description) {
      payload.description = draft.description;
    }
    if (draft.category !== undefined && draft.category !== selectedFault.category) payload.category = draft.category;
    if (draft.subCategory !== undefined && draft.subCategory !== selectedFault.subCategory) {
      payload.subCategory = draft.subCategory;
    }
    if (draft.priority !== undefined && draft.priority !== selectedFault.priority) payload.priority = draft.priority;
    if (draft.locationText !== undefined && draft.locationText !== selectedFault.locationText) {
      payload.locationText = draft.locationText;
    }

    const currentLatitude = selectedFault.latitude ?? null;
    const currentLongitude = selectedFault.longitude ?? null;
    if (nextLatitude !== currentLatitude) payload.latitude = nextLatitude;
    if (nextLongitude !== currentLongitude) payload.longitude = nextLongitude;

    const nextMedia = ((draft.mediaRefs as string[] | undefined) ?? []).slice(0, 4);
    const currentMedia = (selectedFault.mediaRefs ?? []).slice(0, 4);
    if (JSON.stringify(nextMedia) !== JSON.stringify(currentMedia)) {
      payload.mediaRefs = nextMedia;
    }

    const nextResidentId = draft.residentId ?? undefined;
    const currentResidentId = selectedFault.residentId ?? undefined;
    if (nextResidentId !== currentResidentId) payload.residentId = nextResidentId;

    const nextAssignedEmail = typeof draft.assignedToEmail === "string" ? draft.assignedToEmail || undefined : undefined;
    const currentAssignedEmail = selectedFault.assignedToEmail ?? undefined;
    if (nextAssignedEmail !== currentAssignedEmail) {
      payload.assignedToEmail = nextAssignedEmail;
      payload.assignedAdminName = draft.assignedAdminName;
    }

    if (Object.keys(payload).length === 0) {
      setMessageTone("success");
      setMessage("No changes to save.");
      setIsEditing(false);
      return;
    }

    const result = await runPatch(payload);
    if (result) {
      setIsEditing(false);
    }
  }

  async function addNote(body: string, visibility: "internal" | "public-safe") {
    if (!selectedFault || !body.trim()) return;
    setIsBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/faults/${selectedFault.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), visibility })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add note.");
      }
      if (visibility === "internal") {
        setInternalNoteText("");
      } else {
        setPublicNoteText("");
      }
      setMessageTone("success");
      setMessage("Note added.");
    } catch (error) {
      setMessageTone("warning");
      setMessage(error instanceof Error ? error.message : "Unable to add note.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMediaUpload(files: FileList | null) {
    if (!files) return;
    const existing = (editDraft.mediaRefs ?? []) as string[];
    const remainingSlots = Math.max(0, 4 - existing.length);
    if (remainingSlots === 0) {
      setMessageTone("warning");
      setMessage("Maximum of 4 images per fault.");
      return;
    }

    const selected = Array.from(files).slice(0, remainingSlots);
    try {
      const refs = await Promise.all(selected.map((file) => readFileAsDataUrl(file)));
      setEditDraft((current) => ({
        ...current,
        mediaRefs: [...((current.mediaRefs as string[] | undefined) ?? []), ...refs].slice(0, 4)
      }));
    } catch (error) {
      setMessageTone("warning");
      setMessage(error instanceof Error ? error.message : "Unable to upload media.");
    }
  }

  const faultNudges = useMemo(() => {
    if (!selectedFault) return [];
    return [
      `Date Logged: ${formatDate(selectedFault.createdAt)}`,
      `Age in Days: ${daysAgo(selectedFault.escalatedAt ?? selectedFault.createdAt)} day(s)`,
      `Logged By: ${selectedFault.loggedByAdminName ?? selectedFault.assignedAdminName ?? "Unknown"}`,
      `Assigned To: ${selectedFault.assignedAdminName ?? "Unassigned"}`,
      `Last Worked On: ${selectedFault.lastWorkedByEmail ? selectedFault.lastWorkedByEmail.split("@")[0] : "Not captured"}`
    ];
  }, [selectedFault]);

  const showEscalatePlus = selectedFault ? canEscalateLevel(selectedFault, "plus") : false;
  const showEscalatePlusPlus = selectedFault ? canEscalateLevel(selectedFault, "plusplus") : false;
  const showRequestFeedback = selectedFault?.status === "in-progress" && Boolean(selectedFault.residentId);
  const workspaceLocked = !isEditing;
  const workspaceMediaRefs = ((editDraft.mediaRefs as string[] | undefined) ?? []);
  const hasPreview = previewMediaIndex !== null && previewMediaIndex >= 0 && previewMediaIndex < workspaceMediaRefs.length;
  const previewSrc = hasPreview ? workspaceMediaRefs[previewMediaIndex] : "";

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{headerTitle}</h1>
          <p>{headerDescription}</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch items={searchItems} placeholder="Search by reference, title, category, road, or reporter..." />
          <Link className="button-secondary" href="/dashboard/faults">
            Faults Overview
          </Link>
          <Link className="button-primary" href="/dashboard/faults/log">
            Escalate Fault
          </Link>
        </div>
      </header>

      <section className="surface-panel clean-marine-panel">
        <div className="form-grid">
          <label className="field field-wide">
            <span>Queue Text Search</span>
            <input
              value={queueTextSearch}
              onChange={(event) => setQueueTextSearch(event.target.value)}
              placeholder="Search eThekwini ref, status, title, assigned admin, or priority..."
            />
          </label>
        </div>
      </section>

      {message ? (
        <section className={`flash-panel flash-panel-${messageTone}`}>
          <strong>{message}</strong>
        </section>
      ) : null}

      <section className="surface-panel clean-marine-panel">
        <div className="section-header">
          <div>
            <h2>Queue Controls</h2>
            <p>
              {closedArchiveOnly
                ? "Status-only view for closed and archived faults."
                : lockToMyFaults
                  ? "Queue View is locked to My Faults. Use filters for priority, status, SLA breach, age, or last update."
                  : "Switch queue logic by priority, status, SLA breach, age, or last update."}
            </p>
          </div>
        </div>
        <div className="form-grid">
          {closedArchiveOnly ? null : lockToMyFaults ? (
            <label className="field">
              <span>Filter By</span>
              <select className="native-select" value={myFaultsFilterBy} onChange={(event) => setMyFaultsFilterBy(event.target.value as QueueView)}>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="age">By Age (Oldest first)</option>
                <option value="last-update">By Last Update</option>
                <option value="sla-breach">By SLA Breach</option>
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Queue View</span>
              <select className="native-select" value={queueView} onChange={(event) => setQueueView(event.target.value as QueueView)}>
                <option value="all-open">All Open Faults</option>
                <option value="my-faults">My Faults</option>
                <option value="priority">Priority (default)</option>
                <option value="status">By Status</option>
                <option value="sla-breach">By SLA Breach</option>
                <option value="age">By Age (Oldest first)</option>
                <option value="last-update">By Last Update</option>
              </select>
            </label>
          )}
          <label className="field">
            <span>{closedArchiveOnly ? "Status Filter" : lockToMyFaults ? "Filter Value" : "Queue Filter"}</span>
            <select className="native-select" value={queueFilter} onChange={(event) => setQueueFilter(event.target.value)}>
              {queueFilterOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="dashboard-feature-grid fault-queue-fullwidth">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Fault Queue</h2>
              <p>
                {queuedFaults.length} fault(s) in this queue view. Page {currentPage} of {totalPages}.
              </p>
            </div>
            <span className="status-chip status-chip-default">Click a fault to open workspace</span>
          </div>

          {pagedQueuedFaults.length === 0 ? (
            <article className="dashboard-today-card">
              <strong>No faults in this queue.</strong>
            </article>
          ) : (
            <div className="fault-queue-table-wrap">
              <table className="fault-queue-table">
                <thead>
                  <tr>
                    <th>eThekwini Ref</th>
                    <th>Fault Title</th>
                    <th>Reporter</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Age</th>
                    <th>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedQueuedFaults.map((fault) => (
                    <tr
                      key={fault.id}
                      className={`fault-queue-row ${fault.id === selectedFault?.id ? "fault-queue-row-selected" : ""}`}
                      onClick={() => handleSelectFault(fault.id)}
                    >
                      <td>{fault.ethekwiniReference ?? fault.id}</td>
                      <td className="fault-queue-title-cell">{fault.title}</td>
                      <td>{fault.reporterEmail}</td>
                      <td>{fault.assignedAdminName ?? "Unassigned"}</td>
                      <td>
                        <span className={`status-chip status-chip-${toStatusTone(fault.status)}`}>{fault.status}</span>
                      </td>
                      <td>{fault.priority}</td>
                      <td>{daysAgo(fault.escalatedAt ?? fault.createdAt)}d</td>
                      <td>{hoursAgo(fault.updatedAt)}h ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {queuedFaults.length > pageSize ? (
            <div className="fault-queue-pagination">
              <button
                type="button"
                className="button-secondary"
                disabled={currentPage === 1}
                onClick={() => setQueuePage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>

              <div className="fault-queue-page-list">
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`button-secondary ${page === currentPage ? "fault-queue-page-active" : ""}`}
                    onClick={() => setQueuePage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="button-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setQueuePage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </article>
      </section>

      {selectedFault ? (
        <section className="dashboard-feature-grid">
          <article
            key={`workspace-${selectedFault.id}-${workspaceFlashToken}`}
            className="surface-panel clean-marine-panel fault-workspace-flash"
          >
            <>
              <div className="section-header">
                <div>
                  <h2>Fault Workspace</h2>
                  <p>{selectedFault.ethekwiniReference ?? selectedFault.id}</p>
                </div>
                <div className="action-row">
                  {!isEditing ? (
                    <button type="button" className="button-secondary" onClick={() => setIsEditing(true)}>
                      Edit
                    </button>
                  ) : (
                    <>
                      <button type="button" className="button-secondary" onClick={() => setIsEditing(false)}>
                        Cancel
                      </button>
                      <button type="button" className="button-primary" onClick={saveEdits} disabled={isBusy}>
                        Save
                      </button>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="tag dashboard-card-link fault-workspace-nudge"
                onClick={() => setNudgeIndex((current) => (current + 1) % faultNudges.length)}
              >
                {faultNudges[nudgeIndex] ?? "No nudges yet"}
              </button>

              <div className="form-grid fault-workspace-form">
                <label className="field field-wide">
                  <span>Fault Title</span>
                  <input
                    value={String(editDraft.title ?? "")}
                    onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))}
                    disabled={!isEditing}
                  />
                </label>
                <label className="field">
                  <span>eThekwini Fault Reference</span>
                  <input
                    value={String(editDraft.ethekwiniReference ?? "")}
                    onChange={(event) => setEditDraft((current) => ({ ...current, ethekwiniReference: event.target.value }))}
                    disabled={!isEditing}
                  />
                </label>
                <label className="field">
                  <span>Priority</span>
                  <select
                    className="native-select"
                    value={String(editDraft.priority ?? selectedFault.priority)}
                    onChange={(event) => setEditDraft((current) => ({ ...current, priority: event.target.value as Fault["priority"] }))}
                    disabled={!isEditing}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label className="field">
                  <span>Category</span>
                  <select
                    className="native-select"
                    value={String(editDraft.category ?? "electricity")}
                    onChange={(event) => {
                      const nextCategory = event.target.value;
                      const nextSubCategory = getFaultSubCategoryOptions(nextCategory)[0] ?? "";
                      setEditDraft((current) => ({
                        ...current,
                        category: nextCategory,
                        subCategory: nextSubCategory
                      }));
                    }}
                    disabled={!isEditing}
                  >
                    {faultCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field">
                  <span>Sub Category</span>
                  <FaultSubCategoryDropdown
                    value={String(editDraft.subCategory ?? availableSubCategories[0] ?? "")}
                    options={availableSubCategories}
                    onChange={(value) => setEditDraft((current) => ({ ...current, subCategory: value }))}
                    disabled={!isEditing}
                  />
                </div>
                <label className="field field-wide">
                  <span>Fault Location</span>
                  <input
                    ref={locationInputRef}
                    value={String(editDraft.locationText ?? "")}
                    onChange={(event) =>
                      setEditDraft((current) => ({
                        ...current,
                        locationText: event.target.value,
                        latitude: undefined,
                        longitude: undefined
                      }))
                    }
                    disabled={!isEditing}
                  />
                </label>
                <label className="field field-wide">
                  <span>Description</span>
                  <textarea
                    rows={5}
                    value={String(editDraft.description ?? "")}
                    onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))}
                    disabled={!isEditing}
                  />
                </label>
                <label className="field field-wide">
                  <span>Fault Images (max 4)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => void handleMediaUpload(event.target.files)}
                    disabled={!isEditing || ((editDraft.mediaRefs as string[] | undefined)?.length ?? 0) >= 4}
                  />
                  <small>
                    {((editDraft.mediaRefs as string[] | undefined)?.length ?? 0)}/4 images added
                  </small>
                </label>
                {((editDraft.mediaRefs as string[] | undefined)?.length ?? 0) > 0 ? (
                  <div className="fault-media-grid">
                    {((editDraft.mediaRefs as string[] | undefined) ?? []).map((ref, index) => (
                      <article key={`${selectedFault.id}-media-${index}`} className="fault-media-item">
                        <img
                          src={ref}
                          alt={`Fault media ${index + 1}`}
                          onClick={() => setPreviewMediaIndex(index)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setPreviewMediaIndex(index);
                            }
                          }}
                        />
                        {isEditing ? (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() =>
                              setEditDraft((current) => ({
                                ...current,
                                mediaRefs: (((current.mediaRefs as string[] | undefined) ?? []).filter((_, i) => i !== index))
                              }))
                            }
                          >
                            Remove
                          </button>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="action-row">
                <button type="button" className="button-secondary" disabled={isBusy} onClick={() => runPatch({ status: "escalated" })}>
                  Set Escalated
                </button>
                <button type="button" className="button-secondary" disabled={isBusy} onClick={() => runPatch({ status: "in-progress" })}>
                  Set In Progress
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={isBusy}
                  onClick={() =>
                    runPatch({
                      status: "closed",
                      overrideReason:
                        selectedFault.residentId && selectedFault.feedbackStatus !== "yes"
                          ? window.prompt("Resident feedback pending. Enter override reason to close:") ?? ""
                          : undefined
                    })
                  }
                >
                  Close Fault
                </button>
                <button type="button" className="button-secondary" disabled={isBusy} onClick={() => runPatch({ status: "archived" })}>
                  Archive Fault
                </button>
                {(selectedFault.status === "closed" || selectedFault.status === "archived") ? (
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={isBusy}
                    onClick={() =>
                      runPatch({
                        status: "escalated",
                        reopenReason: window.prompt("Reason for reopening this fault:") ?? ""
                      })
                    }
                  >
                    Reopen Fault
                  </button>
                ) : null}
                {showEscalatePlus ? (
                  <button type="button" className="button-secondary" disabled={isBusy} onClick={() => runPatch({ action: "escalate-plus" })}>
                    Escalate+
                  </button>
                ) : null}
                {showEscalatePlusPlus ? (
                  <button type="button" className="button-secondary" disabled={isBusy} onClick={() => runPatch({ action: "escalate-plusplus" })}>
                    Escalate++
                  </button>
                ) : null}
                {showRequestFeedback ? (
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={isBusy}
                    onClick={async () => {
                      const result = await runPatch({ action: "request-feedback" });
                      if (result?.whatsappUrl) {
                        window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    Request Feedback
                  </button>
                ) : null}
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Assigned Admin</span>
                  <select
                    className="native-select"
                    disabled={isBusy || workspaceLocked}
                    value={String(editDraft.assignedToEmail ?? "")}
                    onChange={(event) => {
                      const email = event.target.value;
                      const selected = adminOptions.find((item) => item.email === email);
                      setEditDraft((current) => ({
                        ...current,
                        assignedToEmail: email || undefined,
                        assignedAdminName: selected?.name ?? (email ? current.assignedAdminName : undefined)
                      }));
                    }}
                  >
                    <option value="">Unassigned</option>
                    {adminOptions.map((admin) => (
                      <option key={admin.id} value={admin.email ?? ""}>
                        {admin.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Feedback</span>
                  <div className="action-row">
                    <button type="button" className="button-secondary" disabled={isBusy} onClick={() => runPatch({ action: "feedback-yes" })}>
                      Feedback Yes
                    </button>
                    <button type="button" className="button-secondary" disabled={isBusy} onClick={() => runPatch({ action: "feedback-no" })}>
                      Feedback No
                    </button>
                  </div>
                </label>
              </div>

              <label className="field field-wide">
                <span>Add Internal Note</span>
                <textarea
                  rows={4}
                  value={internalNoteText}
                  onChange={(event) => setInternalNoteText(event.target.value)}
                  placeholder="Internal-only operational notes. Not for public sharing."
                  disabled={workspaceLocked}
                />
              </label>
              <div className="action-row">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={isBusy || workspaceLocked || !internalNoteText.trim()}
                  onClick={() => addNote(internalNoteText, "internal")}
                >
                  Add Internal Note
                </button>
              </div>

              <label className="field field-wide">
                <span>Add Public Note</span>
                <textarea
                  rows={4}
                  value={publicNoteText}
                  onChange={(event) => setPublicNoteText(event.target.value)}
                  placeholder="Resident/public-safe update only. Do not include private information."
                  disabled={workspaceLocked}
                />
              </label>
              <div className="action-row">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={isBusy || workspaceLocked || !publicNoteText.trim()}
                  onClick={() => addNote(publicNoteText, "public-safe")}
                >
                  Add Public Note
                </button>
              </div>
            </>
          </article>

          {hasPreview ? (
            <article className="surface-panel clean-marine-panel fault-media-preview-card">
              <div className="section-header">
                <div>
                  <h2>Image Preview</h2>
                  <p>
                    Photo {previewMediaIndex! + 1} of {workspaceMediaRefs.length}
                  </p>
                </div>
                <button type="button" className="button-secondary" onClick={() => setPreviewMediaIndex(null)}>
                  Close
                </button>
              </div>

              <div className="fault-media-preview-image-wrap">
                <img src={previewSrc} alt={`Fault preview ${previewMediaIndex! + 1}`} className="fault-media-preview-image" />
              </div>

              {workspaceMediaRefs.length > 1 ? (
                <div className="action-row">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() =>
                      setPreviewMediaIndex((current) =>
                        current === null ? 0 : (current - 1 + workspaceMediaRefs.length) % workspaceMediaRefs.length
                      )
                    }
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() =>
                      setPreviewMediaIndex((current) =>
                        current === null ? 0 : (current + 1) % workspaceMediaRefs.length
                      )
                    }
                  >
                    {">"}
                  </button>
                </div>
              ) : null}
            </article>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
