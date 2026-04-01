"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResidentContactActions } from "@/components/residents/resident-contact-actions";
import { GlobalSearch } from "@/components/shared/global-search";
import { loadGoogleMaps } from "@/lib/google-maps-client";
import type { GlobalSearchItem, Resident, ResidentHistoryItem, ResidentType, Role } from "@/types/domain";

type ResidentsConsoleProps = {
  initialResidents: Resident[];
  initialHistory: ResidentHistoryItem[];
  residentMapCount: number;
  currentUserRole: Role;
  currentUserName: string;
  focusResidentId?: string;
  focusQueue?: string;
  focusAction?: string;
  contextMessage?: string;
};

const defaultForm = {
  name: "",
  email: "",
  phone: "",
  residentType: "resident" as ResidentType,
  securityCompany: "Blue Security",
  otherSecurityCompany: "",
  physicalAddress: "",
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  notes: ""
};

const defaultEditForm = {
  name: "",
  email: "",
  phone: "",
  residentType: "resident" as ResidentType,
  securityCompany: "Blue Security",
  addressLine1: "",
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  notes: ""
};

const residentTypeOptions: Array<{ value: ResidentType; label: string }> = [
  { value: "resident", label: "Resident" },
  { value: "admin", label: "Admin" },
  { value: "street-captain", label: "Street Captain" },
  { value: "volunteer", label: "Volunteer" },
  { value: "animal-care-volunteer", label: "Animal Care Volunteer" }
];

const securityCompanyOptions = [
  "Blue Security",
  "Duncan Security",
  "Fidelity ADT",
  "Armour Security",
  "Other",
  "None"
] as const;

const allowedLocalities = new Set(["mount vernon", "bellair", "hillary"]);
const allowedPostalCode = "4094";
const allowedCity = "durban";
const allowedCountry = "za";

function getPlaceComponent(place: any, type: string) {
  return place?.address_components?.find((component: any) => component.types?.includes(type))?.long_name?.toLowerCase?.() ?? "";
}

function isAllowedResidentPlace(place: any) {
  const locality =
    getPlaceComponent(place, "sublocality_level_1") ||
    getPlaceComponent(place, "sublocality") ||
    getPlaceComponent(place, "locality") ||
    getPlaceComponent(place, "neighborhood");
  const city = getPlaceComponent(place, "administrative_area_level_2") || getPlaceComponent(place, "locality");
  const postalCode = getPlaceComponent(place, "postal_code");
  const country = getPlaceComponent(place, "country");
  const formattedAddress = `${place?.formatted_address ?? ""} ${place?.name ?? ""}`.trim();

  return (
    (allowedLocalities.has(locality) && city === allowedCity && postalCode === allowedPostalCode && country === allowedCountry) ||
    isAllowedResidentAddressText(formattedAddress)
  );
}

function isAllowedResidentAddressText(value: string) {
  const normalised = value.toLowerCase();
  const hasLocality = Array.from(allowedLocalities).some((locality) => normalised.includes(locality));
  return hasLocality && normalised.includes(allowedCity) && normalised.includes(allowedPostalCode);
}

function getResidentRoadLabel(address?: string, fallback?: string) {
  if (!address) {
    return fallback ?? "Road not captured";
  }

  const [firstSegment] = address.split(",");
  const cleaned = (firstSegment ?? address)
    .replace(/^\s*\d+[A-Za-z\-\/]*\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return fallback ?? "Road not captured";
  }

  const normalised = cleaned
    .toLowerCase()
    .replace(/\b(rd)\b/g, "road")
    .replace(/\b(st)\b/g, "street")
    .replace(/\b(ave)\b/g, "avenue")
    .replace(/\b(dr)\b/g, "drive")
    .replace(/\b(pl)\b/g, "place")
    .replace(/\b(cres)\b/g, "crescent")
    .replace(/\b(cl)\b/g, "close")
    .replace(/\b(ct)\b/g, "court")
    .replace(/\b(ln)\b/g, "lane")
    .replace(/\s+/g, " ")
    .trim();

  return normalised
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getResidentNormalizedStreet(address?: string) {
  const street = getResidentRoadLabel(address, "");
  if (!street || street === "Road not captured") {
    return null;
  }

  return street;
}

function getResidentTypeLabel(type?: ResidentType) {
  switch (type) {
    case "admin":
      return "Admin";
    case "street-captain":
      return "Street Captain";
    case "volunteer":
      return "Volunteer";
    case "animal-care-volunteer":
      return "Animal Care Volunteer";
    case "resident":
    default:
      return "Resident";
  }
}

function getNormalisedSecurityCompany(company?: string) {
  const normalised = company?.trim().toLowerCase();
  if (!normalised || normalised === "none") {
    return null;
  }

  if (normalised.includes("blue")) {
    return "Blue Security";
  }

  if (normalised.includes("duncan")) {
    return "Duncan Security";
  }

  if (normalised.includes("fidelity") || normalised === "adt" || normalised.includes("fidelity adt")) {
    return "Fidelity ADT";
  }

  if (normalised.includes("armour")) {
    return "Armour Security";
  }

  return company?.trim() ?? null;
}

function buildResidentSearchKeywords(resident: Resident) {
  const fullName = resident.name.trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const address = resident.addressLine1 ?? "";
  const addressParts = address
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const phone = resident.phone ?? "";
  const phoneDigits = phone.replace(/\D/g, "");

  return [
    fullName,
    ...nameParts,
    address,
    ...addressParts,
    resident.securityCompany ?? "",
    resident.email ?? "",
    phone,
    phoneDigits,
    resident.notes ?? "",
    getResidentTypeLabel(resident.residentType)
  ].filter(Boolean);
}

export function ResidentsConsole({
  initialResidents,
  initialHistory,
  residentMapCount,
  currentUserRole,
  currentUserName,
  focusResidentId,
  focusQueue,
  focusAction,
  contextMessage
}: ResidentsConsoleProps) {
  const [residents, setResidents] = useState(initialResidents);
  const [history, setHistory] = useState(initialHistory);
  const [selectedResidentId, setSelectedResidentId] = useState(initialResidents[0]?.id ?? "");
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);
  const [addressValidated, setAddressValidated] = useState(false);
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [isResidentEditMode, setIsResidentEditMode] = useState(false);
  const [residentDirectoryQuery, setResidentDirectoryQuery] = useState("");
  const [googleMapsConfigured, setGoogleMapsConfigured] = useState(false);
  const [residentWorkflowNotes, setResidentWorkflowNotes] = useState<Record<string, string>>({});
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const editAddressInputRef = useRef<HTMLInputElement | null>(null);
  const lastViewedResidentIdRef = useRef<string>("");

  const pendingResidents = useMemo(() => residents.filter((resident) => resident.status === "pending"), [residents]);
  const activeResidents = useMemo(() => residents.filter((resident) => resident.status === "active"), [residents]);
  const archivedResidents = useMemo(() => residents.filter((resident) => resident.status === "archived"), [residents]);
  const rejectedResidents = useMemo(() => residents.filter((resident) => resident.status === "rejected"), [residents]);
  const lastAddedResident = residents[0];
  const roadWithMostResidents = useMemo(() => {
    const roadCounts = new Map<string, number>();

    residents.forEach((resident) => {
      const road = getResidentRoadLabel(resident.addressLine1, resident.standNo);
      roadCounts.set(road, (roadCounts.get(road) ?? 0) + 1);
    });

    return Array.from(roadCounts.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
  }, [residents]);
  const residentsAddedThisMonth = useMemo(() => {
    const now = new Date();
    return history.filter((item) => {
      const createdAt = new Date(item.createdAt);
      return (
        (item.title === "Resident created" || item.title === "Public application submitted") &&
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth()
      );
    }).length;
  }, [history]);
  const residentsNotInWhatsApp = useMemo(
    () => residents.filter((resident) => resident.status === "active" && !resident.whatsappAdded).length,
    [residents]
  );
  const uniqueStreetCount = useMemo(
    () =>
      new Set(
        activeResidents
          .map((resident) => getResidentNormalizedStreet(resident.addressLine1))
          .filter((street): street is string => Boolean(street))
      ).size,
    [activeResidents]
  );
  const topStreet = useMemo(() => {
    const streetCounts = new Map<string, number>();

    activeResidents.forEach((resident) => {
      const street = getResidentNormalizedStreet(resident.addressLine1);
      if (!street) {
        return;
      }
      streetCounts.set(street, (streetCounts.get(street) ?? 0) + 1);
    });

    return Array.from(streetCounts.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;
  }, [activeResidents]);
  const leastActiveStreet = useMemo(() => {
    const streetCounts = new Map<string, number>();

    activeResidents.forEach((resident) => {
      const street = getResidentNormalizedStreet(resident.addressLine1);
      if (!street) {
        return;
      }
      streetCounts.set(street, (streetCounts.get(street) ?? 0) + 1);
    });

    return Array.from(streetCounts.entries()).sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))[0] ?? null;
  }, [activeResidents]);
  const representedSecurityCompanies = useMemo(
    () =>
      new Set(
        activeResidents
          .map((resident) => getNormalisedSecurityCompany(resident.securityCompany))
          .filter((company): company is string => Boolean(company))
      ).size,
    [activeResidents]
  );
  const topSecurityCompany = useMemo(() => {
    const companyCounts = new Map<string, number>();

    activeResidents.forEach((resident) => {
      const company = getNormalisedSecurityCompany(resident.securityCompany);
      if (!company) {
        return;
      }

      companyCounts.set(company, (companyCounts.get(company) ?? 0) + 1);
    });

    return Array.from(companyCounts.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;
  }, [activeResidents]);
  const residentsWithNoSecurityCompany = useMemo(
    () => activeResidents.filter((resident) => !getNormalisedSecurityCompany(resident.securityCompany)).length,
    [activeResidents]
  );
  const residentsWithMissingInformation = useMemo(
    () =>
      activeResidents.filter((resident) => {
        const nameParts = resident.name.trim().split(/\s+/).filter(Boolean);
        const hasLastName = nameParts.length >= 2;
        const hasEmail = Boolean(resident.email?.trim());
        const hasPhysicalAddress = Boolean(getResidentNormalizedStreet(resident.addressLine1));
        const hasSecurityCompany = Boolean(getNormalisedSecurityCompany(resident.securityCompany));

        return !hasLastName || !hasEmail || !hasPhysicalAddress || !hasSecurityCompany;
      }).length,
    [activeResidents]
  );
  const activeResidentQueue = useMemo(() => {
    const query = residentDirectoryQuery.trim().toLowerCase();
    const sortedResidents = [...activeResidents].sort((left, right) => left.name.localeCompare(right.name));

    if (!query) {
      return sortedResidents;
    }

    return sortedResidents.filter((resident) =>
      [
        resident.name,
        resident.email,
        resident.phone,
        resident.securityCompany,
        resident.addressLine1,
        resident.notes
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [activeResidents, residentDirectoryQuery]);
  const pendingApprovalsOlderThanThreeDays = useMemo(() => {
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;

    return pendingResidents.filter((resident) => {
      const residentEntries = history
        .filter((item) => item.residentId === resident.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const firstEntry = residentEntries[0];
      return firstEntry ? new Date(firstEntry.createdAt).getTime() <= cutoff : false;
    }).length;
  }, [history, pendingResidents]);
  const mostRecentPublicApplication = useMemo(() => {
    const latest = history
      .filter((item) => item.title === "Public application submitted")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!latest) {
      return null;
    }

    return residents.find((resident) => resident.id === latest.residentId)?.name ?? null;
  }, [history, residents]);
  const selectedResident =
    residents.find((resident) => resident.id === selectedResidentId) ?? pendingResidents[0] ?? residents[0];
  const selectedHistory = selectedResident ? history.filter((item) => item.residentId === selectedResident.id) : [];
  const visibleSelectedHistory = selectedHistory.slice(0, 4).map((item) => {
    if (currentUserRole === "SUPER_ADMIN") {
      return item;
    }

    if (item.title === "Resident details updated") {
      return {
        ...item,
        detail: "Resident details were updated by an admin. Full change detail is visible to Super Admin only."
      };
    }

    if (item.title === "Resident record viewed") {
      return {
        ...item,
        detail: "A resident record was viewed by an admin."
      };
    }

    return item;
  });
  const highlightedResidentId = focusResidentId || (focusQueue === "pending" ? pendingResidents[0]?.id : undefined);
  const jumpTargetId = highlightedResidentId ? `resident-focus-${highlightedResidentId}` : "resident-action-approve";
  const normalisedPhone = `+27${form.phone.replace(/\D/g, "").slice(0, 9)}`;
  const resolvedSecurityCompany =
    form.securityCompany === "Other" ? form.otherSecurityCompany.trim() : form.securityCompany;
  const canSubmitResident =
    form.name.trim().length >= 3 &&
    form.email.trim().length > 0 &&
    form.phone.replace(/\D/g, "").length === 9 &&
    form.physicalAddress.trim().length >= 3 &&
    resolvedSecurityCompany.trim().length > 0;
  const searchItems: GlobalSearchItem[] = residents.map((resident) => ({
    id: resident.id,
    title: resident.name,
    subtitle: [resident.addressLine1, resident.phone, resident.email].filter(Boolean).join(" • ") || resident.standNo,
    kind: "resident",
    keywords: buildResidentSearchKeywords(resident) as string[]
  }));
  const selectedResidentReadyForApproval = Boolean(
    selectedResident?.addressVerified &&
      selectedResident?.mobileVerified &&
      selectedResident?.whatsappAdded &&
      selectedResident?.consentAccepted
  );
  const selectedResidentWorkflowNote = selectedResident ? getResidentWorkflowNote(selectedResident.id).trim() : "";
  const isFindResidentMode = focusQueue === "active";

  function getResidentWorkflowNote(residentId: string) {
    return residentWorkflowNotes[residentId] ?? "";
  }

  function setResidentWorkflowNote(residentId: string, value: string) {
    setResidentWorkflowNotes((current) => ({
      ...current,
      [residentId]: value
    }));
  }

  async function patchResident(
    residentId: string,
    body: Record<string, unknown>,
    fallbackError: string,
    successMessage?: string,
    clearNote = false
  ) {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/residents/${residentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? fallbackError);
      }

      setResidents((current) => current.map((resident) => (resident.id === payload.resident.id ? payload.resident : resident)));
      if (payload.history) {
        setHistory((current) => [...payload.history, ...current.filter((item) => item.residentId !== payload.resident.id)]);
      }
      if (clearNote) {
        setResidentWorkflowNotes((current) => {
          const next = { ...current };
          delete next[residentId];
          return next;
        });
      }
      if (successMessage) {
        setMessage(successMessage);
      }
      return payload;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fallbackError);
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  function attachEditAddressAutocomplete() {
    const input = editAddressInputRef.current;
    if (!input || input.dataset.autocompleteBound === "true" || !window.google?.maps?.places) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      fields: ["formatted_address", "name", "address_components", "geometry"],
      types: ["address"],
      componentRestrictions: { country: "za" }
    });

    input.dataset.autocompleteBound = "true";

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const nextAddress = place?.formatted_address || place?.name || editAddressInputRef.current?.value || "";

      if (!isAllowedResidentPlace(place)) {
        setMessage("Please choose a valid physical address in Mount Vernon, Bellair, or Hillary, Durban, 4094.");
        setEditForm((current) => ({ ...current, addressLine1: nextAddress }));
        return;
      }

      const latitude = place?.geometry?.location?.lat?.();
      const longitude = place?.geometry?.location?.lng?.();
      setEditForm((current) => ({
        ...current,
        addressLine1: nextAddress,
        latitude: typeof latitude === "number" ? latitude : current.latitude,
        longitude: typeof longitude === "number" ? longitude : current.longitude
      }));
      if (editAddressInputRef.current) {
        editAddressInputRef.current.value = nextAddress;
      }
      window.setTimeout(() => {
        const liveValue = editAddressInputRef.current?.value?.trim();
        if (liveValue) {
          setEditForm((current) => ({ ...current, addressLine1: liveValue }));
        }
      }, 0);
      setMessage("Google Maps validated the physical address.");
    });
  }

  useEffect(() => {
    if (focusResidentId && residents.some((resident) => resident.id === focusResidentId)) {
      setSelectedResidentId(focusResidentId);
      return;
    }

    if (focusQueue === "pending" && pendingResidents[0]) {
      setSelectedResidentId(pendingResidents[0].id);
    }

    if (focusQueue === "active" && activeResidents[0]) {
      setSelectedResidentId(activeResidents[0].id);
    }
  }, [activeResidents, focusResidentId, focusQueue, pendingResidents, residents]);

  useEffect(() => {
    void fetch("/api/platform/client-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        setGoogleMapsConfigured(Boolean(payload?.googleMapsApiKey));
      })
      .catch(() => {
        setGoogleMapsConfigured(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedResident) {
      setEditForm(defaultEditForm);
      setIsResidentEditMode(false);
      return;
    }

    setIsResidentEditMode(false);
    setEditForm({
      name: selectedResident.name ?? "",
      email: selectedResident.email ?? "",
      phone: (selectedResident.phone ?? "").replace(/^\+27/, ""),
      residentType: selectedResident.residentType ?? "resident",
      securityCompany: selectedResident.securityCompany ?? "None",
      addressLine1: selectedResident.addressLine1 ?? "",
      latitude: selectedResident.latitude,
      longitude: selectedResident.longitude,
      notes: selectedResident.notes ?? ""
    });
  }, [selectedResident]);

  useEffect(() => {
    if (!selectedResident?.id || lastViewedResidentIdRef.current === selectedResident.id) {
      return;
    }

    lastViewedResidentIdRef.current = selectedResident.id;

    void fetch(`/api/residents/${selectedResident.id}/view`, {
      method: "POST"
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const payload = await response.json();
        return payload?.history as ResidentHistoryItem[] | undefined;
      })
      .then((nextHistory) => {
        if (!nextHistory || !selectedResident?.id) {
          return;
        }

        setHistory((current) => [
          ...nextHistory,
          ...current.filter((item) => item.residentId !== selectedResident.id)
        ]);
      })
      .catch(() => {
        // View logging should never interrupt the resident workflow.
      });
  }, [selectedResident?.id]);

  useEffect(() => {
    if (!contextMessage) return;
    const timer = window.setTimeout(() => {
      document.getElementById(jumpTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [contextMessage, jumpTargetId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetch("/api/platform/client-config").then((response) => (response.ok ? response.json() : null));
        await loadGoogleMaps(payload?.googleMapsApiKey ?? "", ["places"]);
        if (cancelled || !window.google?.maps?.places || !addressInputRef.current) {
          return;
        }

        const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          fields: ["formatted_address", "name", "address_components", "geometry"],
          types: ["address"],
          componentRestrictions: { country: "za" }
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const nextAddress = place?.formatted_address || place?.name || addressInputRef.current?.value || "";

          if (!isAllowedResidentPlace(place)) {
            setAddressMessage("Please choose an address in Mount Vernon, Bellair, or Hillary, Durban, 4094.");
            setAddressValidated(false);
            setForm((current) => ({ ...current, physicalAddress: nextAddress }));
            return;
          }

          setForm((current) => ({ ...current, physicalAddress: nextAddress }));
          const latitude = place?.geometry?.location?.lat?.();
          const longitude = place?.geometry?.location?.lng?.();
          setForm((current) => ({
            ...current,
            physicalAddress: nextAddress,
            latitude: typeof latitude === "number" ? latitude : current.latitude,
            longitude: typeof longitude === "number" ? longitude : current.longitude
          }));
          setAddressValidated(true);
          setAddressMessage("Address validated for the Mount Vernon / Bellair / Hillary area.");
        });
      } catch {
        // Leave manual entry available when Maps is not configured.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!isResidentEditMode) {
      return;
    }

    void (async () => {
      try {
        const payload = await fetch("/api/platform/client-config").then((response) => (response.ok ? response.json() : null));
        await loadGoogleMaps(payload?.googleMapsApiKey ?? "", ["places"]);
        if (cancelled || !window.google?.maps?.places || !editAddressInputRef.current) {
          return;
        }
        window.setTimeout(() => {
          if (!cancelled) {
            attachEditAddressAutocomplete();
          }
        }, 0);
      } catch {
        // Leave manual editing available when Maps is not configured.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isResidentEditMode, selectedResident?.id]);

  async function createResident() {
    const trimmedAddress = form.physicalAddress.trim();
    const addressPassesRule = addressValidated || isAllowedResidentAddressText(trimmedAddress);

    if (!canSubmitResident) {
      setMessage("Full Name, Email Address, Mobile Number, Security Company, and Physical Address are required.");
      return;
    }

    if (!addressPassesRule) {
      setMessage("Please enter a valid physical address in Mount Vernon, Bellair, or Hillary, Durban, 4094.");
      return;
    }

    if (!resolvedSecurityCompany) {
      setMessage("Please choose a security company or enter the other security company name.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: normalisedPhone,
          residentType: form.residentType,
          securityCompany: resolvedSecurityCompany,
          addressLine1: trimmedAddress,
          latitude: form.latitude,
          longitude: form.longitude,
          notes: form.notes
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add resident.");
      }

      setResidents((current) => [payload.item, ...current]);
      setSelectedResidentId(payload.item.id);
      setForm(defaultForm);
      setAddressValidated(false);
      setAddressMessage(null);
      setMessage("Resident added directly to the active database.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add resident.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateResidentStatus(status: Resident["status"], residentOverride?: Resident) {
    const residentForAction = residentOverride ?? selectedResident;
    if (!residentForAction) return;
    const reason = getResidentWorkflowNote(residentForAction.id).trim();
    const payload = await patchResident(
      residentForAction.id,
      { status, reason },
      "Unable to update resident status.",
      undefined,
      true
    );

    if (payload?.resident) {
      setMessage(`${payload.resident.name} moved to ${status}.`);
    }
  }

  async function saveResidentDetails() {
    if (!selectedResident) return;

    const resolvedEditAddress = editForm.addressLine1.trim();

    if (!isAllowedResidentAddressText(resolvedEditAddress)) {
      setMessage("Please enter a valid physical address in Mount Vernon, Bellair, or Hillary, Durban, 4094.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const payloadBody: Record<string, unknown> = {};
      const nextName = editForm.name.trim();
      const nextEmail = editForm.email.trim();
      const phoneDigits = editForm.phone.replace(/\D/g, "");
      const nextPhone = phoneDigits.length === 9 ? `+27${phoneDigits.slice(0, 9)}` : undefined;
      const nextResidentType = editForm.residentType;
      const nextSecurityCompany = editForm.securityCompany;
      const nextAddress = resolvedEditAddress;
      const nextNotes = editForm.notes;
      const nextLatitude = editForm.latitude;
      const nextLongitude = editForm.longitude;
      const currentLatitude = selectedResident.latitude;
      const currentLongitude = selectedResident.longitude;

      if (nextName !== (selectedResident.name ?? "")) payloadBody.name = nextName;
      if (nextEmail !== (selectedResident.email ?? "")) payloadBody.email = nextEmail;
      if (nextPhone !== (selectedResident.phone ?? undefined)) payloadBody.phone = nextPhone;
      if (nextResidentType !== (selectedResident.residentType ?? "resident")) payloadBody.residentType = nextResidentType;
      if (nextSecurityCompany !== (selectedResident.securityCompany ?? "")) payloadBody.securityCompany = nextSecurityCompany;
      if (nextAddress !== (selectedResident.addressLine1 ?? "")) payloadBody.addressLine1 = nextAddress;
      if (nextLatitude !== undefined && nextLatitude !== currentLatitude) payloadBody.latitude = nextLatitude;
      if (nextLongitude !== undefined && nextLongitude !== currentLongitude) payloadBody.longitude = nextLongitude;
      if (nextNotes !== (selectedResident.notes ?? "")) payloadBody.notes = nextNotes;

      if (Object.keys(payloadBody).length === 0) {
        setIsResidentEditMode(false);
        setMessage("No changes to save.");
        return;
      }

      const response = await fetch(`/api/residents/${selectedResident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update resident details.");
      }

      setResidents((current) => current.map((resident) => (resident.id === payload.resident.id ? payload.resident : resident)));
      if (payload.history) {
        setHistory((current) => [...payload.history, ...current.filter((item) => item.residentId !== payload.resident.id)]);
      }
      setIsResidentEditMode(false);
      setMessage("Resident details updated and added to the audit trail.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update resident details.");
    } finally {
      setIsBusy(false);
    }
  }

  function jumpToSection(sectionId: string) {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function toggleResidentWorkflowFlag(
    resident: Resident,
    field: "addressVerified" | "mobileVerified" | "whatsappAdded",
    fallbackError: string
  ) {
    setSelectedResidentId(resident.id);
    const note = getResidentWorkflowNote(resident.id).trim();
    const payload = await patchResident(
      resident.id,
      { [field]: !resident[field], workflowNote: note },
      fallbackError,
      undefined,
      field === "whatsappAdded"
    );

    if (payload?.resident && field === "whatsappAdded") {
      setMessage(
        payload.resident.whatsappAdded
          ? `${payload.resident.name} marked as added to WhatsApp.`
          : `${payload.resident.name} WhatsApp confirmation removed.`
      );
    }
  }

  function handleStatTileClick(target: "pending" | "active" | "archived" | "rejected" | "not-in-whatsapp") {
    if (target === "pending" && pendingResidents[0]) {
      setSelectedResidentId(pendingResidents[0].id);
      jumpToSection("residents-pending-queue");
      return;
    }

    if (target === "active" && activeResidents[0]) {
      setSelectedResidentId(activeResidents[0].id);
      jumpToSection("residents-active-queue");
      return;
    }

    if (target === "archived" && archivedResidents[0]) {
      setSelectedResidentId(archivedResidents[0].id);
      jumpToSection("residents-profile-preview");
      return;
    }

    if (target === "rejected" && rejectedResidents[0]) {
      setSelectedResidentId(rejectedResidents[0].id);
      jumpToSection("residents-profile-preview");
      return;
    }

    const notInWhatsappResident =
      activeResidents[0] ??
      pendingResidents[0];

    if (notInWhatsappResident) {
      setSelectedResidentId(notInWhatsappResident.id);
    }
    jumpToSection("residents-active-queue");
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{isFindResidentMode ? "Find a Resident" : "Residents Hub"}</h1>
          <p>
            {isFindResidentMode
              ? "Search the active resident database quickly, then open a locked profile preview for review or editing."
              : "Manage pending approvals, active records, map-led outreach, and WhatsApp growth opportunities in one calm operational view."}
          </p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch
            items={searchItems}
            placeholder="Search first name, surname, street, mobile, admins, street captains, volunteers..."
            onItemSelect={(item) => {
              setSelectedResidentId(item.id);
              jumpToSection("residents-profile-preview");
            }}
          />
          {!isFindResidentMode && currentUserRole === "SUPER_ADMIN" ? <span className="button-secondary">Import CSV</span> : null}
          <button className="button-primary" type="button" onClick={() => jumpToSection("residents-intake-form")}>
            Add Resident
          </button>
        </div>
      </header>

      {message ? (
        <section className="flash-panel flash-panel-success">
          <strong>{message}</strong>
        </section>
      ) : null}

      {addressMessage ? (
        <section className={`flash-panel ${addressValidated ? "flash-panel-success" : "flash-panel-warning"}`}>
          <strong>{addressMessage}</strong>
        </section>
      ) : null}

      {contextMessage ? (
        <section className="flash-panel flash-panel-default dashboard-context-banner dashboard-context-banner-sticky">
          <div className="panel-head">
            <strong>{isFindResidentMode ? "Opened from Residents Hub" : "Opened from Admin Dashboard"}</strong>
            <button className="button-secondary" type="button" onClick={() => document.getElementById(jumpTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              Jump to item
            </button>
          </div>
          <p>{isFindResidentMode ? contextMessage.replace("Resident queue", "Residents Database") : contextMessage}</p>
          {focusAction ? <span className="tag">Next action: {focusAction}</span> : null}
        </section>
      ) : null}

      {isFindResidentMode ? (
        <section className="dashboard-stat-grid dashboard-stat-grid-find-resident">
          <button
            type="button"
            className="dashboard-stat-card dashboard-stat-card-success dashboard-stat-button dashboard-card-link"
            onClick={() => jumpToSection("residents-active-queue")}
          >
            <span>Total Active Residents</span>
            <strong>{activeResidents.length}</strong>
            <small>Active resident database</small>
          </button>
          <button
            type="button"
            className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link"
            onClick={() => jumpToSection("residents-active-queue")}
          >
            <span>Unique Streets</span>
            <strong>{uniqueStreetCount}</strong>
            <small>Road coverage in the active database</small>
          </button>
          <button
            type="button"
            className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link"
            onClick={() => jumpToSection("residents-active-queue")}
          >
            <span>Most Active Street</span>
            <strong>{topStreet?.[1] ?? 0}</strong>
            <small>{topStreet?.[0] ?? "No resident roads yet"}</small>
          </button>
          <button
            type="button"
            className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link"
            onClick={() => jumpToSection("residents-active-queue")}
          >
            <span>Most Inactive Street</span>
            <strong>{leastActiveStreet?.[1] ?? 0}</strong>
            <small>{leastActiveStreet?.[0] ?? "No resident roads yet"}</small>
          </button>
          <button
            type="button"
            className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link"
            onClick={() => jumpToSection("residents-active-queue")}
          >
            <span>Security Companies Represented</span>
            <strong>{representedSecurityCompanies}</strong>
            <small>Unique companies on resident records</small>
          </button>
          <button
            type="button"
            className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link"
            onClick={() => jumpToSection("residents-active-queue")}
          >
            <span>Top Security Company</span>
            <strong>{topSecurityCompany?.[1] ?? 0}</strong>
            <small>{topSecurityCompany?.[0] ?? "No company data yet"}</small>
          </button>
          <button
            type="button"
            className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link"
            onClick={() => jumpToSection("residents-active-queue")}
          >
            <span>No Security Company</span>
            <strong>{residentsWithNoSecurityCompany}</strong>
            <small>Active residents without a company recorded</small>
          </button>
          <button
            type="button"
            className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link"
            onClick={() => jumpToSection("residents-active-queue")}
          >
            <span>Missing Information</span>
            <strong>{residentsWithMissingInformation}</strong>
            <small>Email, address, security company, or last name missing</small>
          </button>
        </section>
      ) : null}

      {!isFindResidentMode ? (
        <section className={`dashboard-stat-grid ${currentUserRole === "SUPER_ADMIN" ? "dashboard-stat-grid-six" : "dashboard-stat-grid-five"}`}>
          <button type="button" className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("pending")}>
            <span>Pending</span>
            <strong>{pendingResidents.length}</strong>
            <small>Ready for review</small>
          </button>
          <button type="button" className="dashboard-stat-card dashboard-stat-card-success dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("active")}>
            <span>Active</span>
            <strong>{activeResidents.length}</strong>
            <small>Live resident records</small>
          </button>
          <button type="button" className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("not-in-whatsapp")}>
            <span>Not in WhatsApp Group</span>
            <strong>{Math.max(activeResidents.length - residentMapCount, 0)}</strong>
            <small>Growth opportunity</small>
          </button>
          <button type="button" className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("archived")}>
            <span>Archived</span>
            <strong>{archivedResidents.length}</strong>
            <small>Historical record</small>
          </button>
          <button type="button" className="dashboard-stat-card dashboard-stat-card-danger dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("rejected")}>
            <span>Rejected</span>
            <strong>{rejectedResidents.length}</strong>
            <small>Not approved</small>
          </button>
          {currentUserRole === "SUPER_ADMIN" ? (
            <button type="button" className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("not-in-whatsapp")}>
              <span>Needs Mapping</span>
              <strong>{Math.max(activeResidents.length - residentMapCount, 0)}</strong>
              <small>Address clean-up</small>
            </button>
          ) : null}
        </section>
      ) : null}

      {!isFindResidentMode ? (
        <section className="dashboard-feature-grid">
          <article id="residents-intake-form" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Resident Intake</h2>
              <p>Quickly add a resident to the active database with one validated physical address field.</p>
            </div>
            <span className="status-chip status-chip-success">Live Form</span>
          </div>

          <div className="form-grid form-grid-spaced">
            <label className="field field-wide">
              <span>Full Name *</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </label>
            <label className="field field-wide">
              <span>Email Address *</span>
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
            </label>
            <label className="field field-wide">
              <span>Mobile Number *</span>
              <div className="phone-prefix-field">
                <span className="phone-prefix">+27</span>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value.replace(/\D/g, "").slice(0, 9)
                    }))
                  }
                  inputMode="numeric"
                  placeholder="82 123 4567"
                  required
                />
              </div>
              <small>Enter the mobile number without the leading 0. It will be saved in WhatsApp format as {normalisedPhone}.</small>
            </label>
            <label className="field field-wide">
              <span>Resident Type *</span>
              <select
                value={form.residentType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    residentType: event.target.value as ResidentType
                  }))
                }
              >
                {residentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>Security Company *</span>
              <select
                value={form.securityCompany}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    securityCompany: event.target.value,
                    otherSecurityCompany: event.target.value === "Other" ? current.otherSecurityCompany : ""
                  }))
                }
              >
                {securityCompanyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            {form.securityCompany === "Other" ? (
              <label className="field field-wide">
                <span>Other Security Company *</span>
                <input
                  value={form.otherSecurityCompany}
                  onChange={(event) => setForm((current) => ({ ...current, otherSecurityCompany: event.target.value }))}
                  placeholder="Enter the security company name"
                  required
                />
              </label>
            ) : null}
            <label className="field field-wide">
              <span>Physical Address *</span>
              <input
                ref={addressInputRef}
                value={form.physicalAddress}
                onChange={(event) => {
                  setForm((current) => ({ ...current, physicalAddress: event.target.value }));
                  setAddressValidated(false);
                  setAddressMessage(null);
                }}
                placeholder="Start typing and choose a Google-validated address"
                required
              />
              <small>Only Mount Vernon, Bellair, or Hillary in Durban 4094 are accepted.</small>
            </label>
            <label className="field field-wide">
              <span>Additional Resident Internal Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Anything we know about the resident, wife's name, car registration, occupation..."
              />
            </label>
          </div>
          <p className="form-required-note">Fields marked with * are required before a resident can be added.</p>
          <div className="action-row">
            <button className="button-primary" type="button" onClick={createResident} disabled={isBusy || !canSubmitResident}>
              {isBusy ? "Working..." : "Add Resident"}
            </button>
          </div>
        </article>

        {!isFindResidentMode ? (
          <div className="dashboard-stack">
            <article id="residents-pending-queue" className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Resident Pending Queue</h2>
                <p>The queue focuses on approvals and blockers first so admins can work quickly with minimal clicks.</p>
              </div>
              <span className="status-chip status-chip-warning">Review Queue</span>
            </div>

            <div className="dashboard-stack">
              {pendingResidents.map((resident) => (
                <article
                  key={resident.id}
                  id={`resident-focus-${resident.id}`}
                  className={`dashboard-resident-card dashboard-resident-card-expanded${selectedResident?.id === resident.id ? " dashboard-fault-list-card-active" : ""}${highlightedResidentId === resident.id ? " dashboard-context-highlight" : ""}`}
                  onClick={() => setSelectedResidentId(resident.id)}
                >
                  <div className="panel-head">
                    <div>
                      <h3>{resident.name}</h3>
                      <p>{resident.addressLine1 ?? resident.standNo}</p>
                    </div>
                    <span className="status-chip status-chip-warning">Pending</span>
                  </div>
                  <div className="meta-row">
                    <span className="tag">Mobile: {resident.phone ?? "Pending"}</span>
                    <span className="tag">Security: {resident.securityCompany ?? "Not captured"}</span>
                    {resident.submittedViaPublicForm ? <span className="tag">Public Form</span> : null}
                  </div>
                  <div className="resident-checklist">
                  <button
                    type="button"
                    className={`resident-check ${resident.addressVerified ? "resident-check-done" : "resident-check-pending"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggleResidentWorkflowFlag(
                        resident,
                        "addressVerified",
                        "Unable to update address verification."
                      );
                    }}
                  >
                    Address Verified
                  </button>
                  <button
                    type="button"
                    className={`resident-check ${resident.mobileVerified ? "resident-check-done" : "resident-check-pending"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggleResidentWorkflowFlag(
                        resident,
                        "mobileVerified",
                        "Unable to update mobile verification."
                      );
                    }}
                  >
                    Mobile Verified
                  </button>
                  <button
                    type="button"
                    className={`resident-check ${resident.whatsappAdded ? "resident-check-done" : "resident-check-pending"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggleResidentWorkflowFlag(
                        resident,
                        "whatsappAdded",
                        "Unable to update WhatsApp confirmation."
                      );
                    }}
                  >
                    Added to WhatsApp
                  </button>
                    <span className={`resident-check ${resident.consentAccepted ? "resident-check-done" : "resident-check-pending"}`}>
                      Consent Accepted
                    </span>
                  </div>
                  <label className="field field-full">
                    <span>Review And Onboarding Notes</span>
                    <textarea
                      rows={3}
                      value={getResidentWorkflowNote(resident.id)}
                      onChange={(event) => setResidentWorkflowNote(resident.id, event.target.value)}
                      placeholder="Capture rejection reasons, archive context, onboarding notes, or WhatsApp confirmation detail..."
                    />
                    <small>Reject and Archive require a note. WhatsApp notes are added to the audit trail when you confirm onboarding.</small>
                  </label>
                  <div className="dashboard-actions-row">
                    <button className="button-secondary" type="button" onClick={() => {
                      setSelectedResidentId(resident.id);
                      void updateResidentStatus("rejected", resident);
                    }} disabled={isBusy || !getResidentWorkflowNote(resident.id).trim()}>
                      Reject
                    </button>
                    <button className="button-secondary" type="button" onClick={() => {
                      setSelectedResidentId(resident.id);
                      void updateResidentStatus("archived", resident);
                    }} disabled={isBusy || !getResidentWorkflowNote(resident.id).trim()}>
                      Archive
                    </button>
                    <button
                      id="resident-action-approve"
                      className="button-primary"
                      type="button"
                      onClick={() => {
                        setSelectedResidentId(resident.id);
                        void updateResidentStatus("active", resident);
                      }}
                      disabled={
                        isBusy ||
                        !resident.addressVerified ||
                        !resident.mobileVerified ||
                        !resident.whatsappAdded ||
                        !resident.consentAccepted
                      }
                    >
                      Approve
                    </button>
                  </div>
                </article>
              ))}
            </div>
            </article>

            <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Nudges</h2>
                <p>Quick resident intelligence to help the admin team see momentum, concentration, and churn at a glance.</p>
              </div>
              <span className="status-chip status-chip-default">Live Insight</span>
            </div>
            <div className="config-grid">
              <div className="config-item">
                <label>Last person added</label>
                <strong>{lastAddedResident?.name ?? "No residents yet"}</strong>
              </div>
              <div className="config-item">
                <label>Residents added this month</label>
                <strong>{residentsAddedThisMonth}</strong>
              </div>
              <div className="config-item">
                <label>Still not in WhatsApp</label>
                <strong>{residentsNotInWhatsApp}</strong>
              </div>
              <div className="config-item">
                <label>Pending older than 3 days</label>
                <strong>{pendingApprovalsOlderThanThreeDays}</strong>
              </div>
              <div className="config-item">
                <label>Most recent public application</label>
                <strong>{mostRecentPublicApplication ?? "No public applications yet"}</strong>
              </div>
              <div className="config-item">
                <label>Road with most residents</label>
                <strong>{roadWithMostResidents ? roadWithMostResidents[0] : "Not enough data yet"}</strong>
              </div>
              <div className="config-item">
                <label>Total people added</label>
                <strong>{residents.length}</strong>
              </div>
              <div className="config-item">
                <label>People who left the group</label>
                <strong>{archivedResidents.length}</strong>
              </div>
            </div>
            </article>
          </div>
        ) : null}
        </section>
      ) : null}

      <section className={isFindResidentMode ? "resident-directory-grid" : "dashboard-feature-grid"}>
        <article id="residents-active-queue" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>{isFindResidentMode ? "Find a Resident" : "Resident Queue"}</h2>
              <p>
                {isFindResidentMode
                  ? "Search through the active database quickly with a compact resident directory that scales cleanly past 400 records."
                  : "Active residents are presented as a clean operational directory with quick selection, not a spreadsheet."}
              </p>
            </div>
            <span className="status-chip status-chip-success">
              {activeResidentQueue.length} Active {activeResidentQueue.length === 1 ? "Resident" : "Residents"}
            </span>
          </div>

          {isFindResidentMode ? (
            <>
              <div className="resident-directory-search-row">
                <label className="field resident-directory-search-field">
                  <span>Search active residents</span>
                  <input
                    value={residentDirectoryQuery}
                    onChange={(event) => setResidentDirectoryQuery(event.target.value)}
                    placeholder="Search by full name, mobile, email, road, security company, or notes"
                  />
                </label>
              </div>
              <div className="resident-directory-list" role="list">
                {activeResidentQueue.map((resident) => (
                  <button
                    key={resident.id}
                    id={`resident-active-${resident.id}`}
                    type="button"
                    className={`resident-directory-row dashboard-card-link${selectedResident?.id === resident.id ? " resident-directory-row-active dashboard-context-highlight" : ""}`}
                    onClick={() => setSelectedResidentId(resident.id)}
                  >
                    <div className="resident-directory-row-main">
                      <strong>{resident.name}</strong>
                      <span>{resident.addressLine1 ?? "Physical address not captured"}</span>
                    </div>
                    <div className="resident-directory-row-meta">
                      <span>{resident.email ?? "No email"}</span>
                      <span>{resident.phone ?? "No mobile"}</span>
                      <span>{getResidentTypeLabel(resident.residentType)} · {resident.securityCompany ?? "No security company"}</span>
                    </div>
                  </button>
                ))}
                {activeResidentQueue.length === 0 ? (
                  <article className="dashboard-today-card">
                    <strong>No active residents match that search yet.</strong>
                  </article>
                ) : null}
              </div>
            </>
          ) : (
            <div className="dashboard-stack">
              {activeResidentQueue.map((resident) => (
                <article
                  key={resident.id}
                  id={`resident-active-${resident.id}`}
                  className={`dashboard-resident-card dashboard-resident-card-expanded${selectedResident?.id === resident.id ? " dashboard-fault-list-card-active" : ""}`}
                  onClick={() => setSelectedResidentId(resident.id)}
                >
                  <div className="panel-head">
                    <div>
                      <h3>{resident.name}</h3>
                      <p>{resident.addressLine1 ?? "Physical address not captured"}</p>
                    </div>
                    <span className="status-chip status-chip-success">Active</span>
                  </div>
                  <div className="field-grid compact-field-grid">
                    <div className="field">
                      <label>Full Name</label>
                      <strong>{resident.name}</strong>
                    </div>
                    <div className="field">
                      <label>Email Address</label>
                      <strong>{resident.email ?? "Not captured"}</strong>
                    </div>
                    <div className="field">
                      <label>Mobile Number</label>
                      <strong>{resident.phone ?? "Not captured"}</strong>
                    </div>
                    <div className="field">
                      <label>Security Company</label>
                      <strong>{resident.securityCompany ?? "Not captured"}</strong>
                    </div>
                    <div className="field field-wide">
                      <label>Physical Address</label>
                      <strong>{resident.addressLine1 ?? "Not captured"}</strong>
                    </div>
                    <div className="field field-wide">
                      <label>Internal Notes</label>
                      <p>{resident.notes?.trim() ? resident.notes : "No internal notes captured yet."}</p>
                    </div>
                  </div>
                </article>
              ))}
              {activeResidentQueue.length === 0 ? (
                <article className="dashboard-today-card">
                  <strong>No active residents match the current selection.</strong>
                </article>
              ) : null}
            </div>
          )}
        </article>

        <article id="residents-profile-preview" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Resident Profile Preview</h2>
              <p>The profile stays structured and readable rather than becoming a long messy form.</p>
            </div>
            {selectedResident ? <span className="status-chip status-chip-warning">{selectedResident.status}</span> : null}
          </div>

          {selectedResident ? (
            <>
              <div className="resident-summary-banner">
                <div className="meta-row">
                  <span className="tag">Road: {selectedResident.addressLine1?.split(" ").slice(1).join(" ") || selectedResident.standNo}</span>
                  <span className="tag">{selectedResident.addressVerified ? "Address Verified" : "Address Review Needed"}</span>
                  {selectedResident.submittedViaPublicForm ? <span className="tag">Submitted via Public Form</span> : null}
                </div>
                <div>
                  <h3>{selectedResident.name}</h3>
                  <p>Application received and ready for final review once WhatsApp group membership is confirmed.</p>
                </div>
              </div>
              {!isResidentEditMode ? (
                <ResidentContactActions resident={selectedResident} adminName={currentUserName} className="resident-profile-contact-actions" />
              ) : null}
              <div className="field-grid">
                <div className="field">
                  <label>Full Name</label>
                  {isResidentEditMode ? (
                    <input
                      value={editForm.name}
                      onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  ) : (
                    <strong>{selectedResident.name}</strong>
                  )}
                </div>
                <div className="field">
                  <label>Email Address</label>
                  {isResidentEditMode ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  ) : (
                    <strong>{selectedResident.email ?? "Not captured"}</strong>
                  )}
                </div>
                <div className="field">
                  <label>Mobile Number</label>
                  {isResidentEditMode ? (
                    <input
                      value={editForm.phone}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 9) }))
                      }
                      inputMode="numeric"
                      placeholder="82 123 4567"
                    />
                  ) : (
                    <strong>{selectedResident.phone ?? "Not captured"}</strong>
                  )}
                </div>
                <div className="field">
                  <label>Resident Type</label>
                  {isResidentEditMode ? (
                    <select
                      value={editForm.residentType}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          residentType: event.target.value as ResidentType
                        }))
                      }
                    >
                      {residentTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <strong>{getResidentTypeLabel(selectedResident.residentType)}</strong>
                  )}
                </div>
                <div className="field field-wide">
                  <label>Physical Address</label>
                  {isResidentEditMode ? (
                    <>
                      <input
                        ref={editAddressInputRef}
                        value={editForm.addressLine1}
                        onChange={(event) => setEditForm((current) => ({ ...current, addressLine1: event.target.value }))}
                        onBlur={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            addressLine1: event.target.value
                          }))
                        }
                        onFocus={() => attachEditAddressAutocomplete()}
                        placeholder="Start typing and choose a Google-validated address"
                      />
                      <small>
                        {googleMapsConfigured
                          ? "Use a validated Google Maps address in Mount Vernon, Bellair, or Hillary, Durban, 4094."
                          : "Google Maps validation is not configured yet in Settings. Manual entry is allowed, but save validation still applies."}
                      </small>
                    </>
                  ) : (
                    <strong>{selectedResident.addressLine1 ?? "Not captured"}</strong>
                  )}
                </div>
                <div className="field field-wide">
                  <label>Additional Resident Internal Notes</label>
                  {isResidentEditMode ? (
                    <textarea
                      rows={3}
                      value={editForm.notes}
                      onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  ) : (
                    <p>{selectedResident.notes?.trim() ? selectedResident.notes : "No internal notes captured yet."}</p>
                  )}
                </div>
                <div className="field">
                  <label>Security Company</label>
                  {isResidentEditMode ? (
                    <select
                      value={editForm.securityCompany}
                      onChange={(event) => setEditForm((current) => ({ ...current, securityCompany: event.target.value }))}
                    >
                      {securityCompanyOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <strong>{selectedResident.securityCompany ?? "Not captured"}</strong>
                  )}
                </div>
                <div className="field">
                  <label>Guidance</label>
                  <p>
                    Keep records concise and accurate. Confirm names, use a Google-validated address, and only save
                    changes when the resident information has been checked.
                  </p>
                </div>
              </div>
              <label className="field field-full">
                <span>Workflow Notes</span>
                <textarea
                  rows={3}
                  value={selectedResident ? getResidentWorkflowNote(selectedResident.id) : ""}
                  onChange={(event) => selectedResident && setResidentWorkflowNote(selectedResident.id, event.target.value)}
                  placeholder="Capture archive reasons, pending notes, approval context, or WhatsApp onboarding detail..."
                />
                <small>Reject, Archive, and Move To Pending require a note. Approval can include a note but does not require one.</small>
              </label>
              <div className="dashboard-actions-row">
                {isResidentEditMode ? (
                  <>
                    <button className="button-primary" type="button" onClick={saveResidentDetails} disabled={isBusy}>
                      Save Resident
                    </button>
                    <button className="button-secondary" type="button" onClick={() => setIsResidentEditMode(false)} disabled={isBusy}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button className="button-primary" type="button" onClick={() => setIsResidentEditMode(true)}>
                    Edit
                  </button>
                )}
                <button className="button-secondary" type="button" onClick={() => updateResidentStatus("rejected")} disabled={isBusy || !selectedResidentWorkflowNote}>
                  Reject
                </button>
                <button className="button-secondary" type="button" onClick={() => updateResidentStatus("archived")} disabled={isBusy || !selectedResidentWorkflowNote}>
                  Archive
                </button>
                <button className="button-secondary" type="button" onClick={() => updateResidentStatus("pending")} disabled={isBusy || !selectedResidentWorkflowNote}>
                  Move To Pending
                </button>
                <button
                  id="resident-action-approve"
                  className={`button-primary${focusAction === "approve" ? " dashboard-action-highlight" : ""}`}
                  type="button"
                  onClick={() => updateResidentStatus("active")}
                  disabled={isBusy || !selectedResidentReadyForApproval}
                >
                  Make Active
                </button>
              </div>
            </>
          ) : null}
        </article>
      </section>
      <section className="dashboard-feature-grid">
        {!isFindResidentMode ? (
          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>History And Governance</h2>
              <p>
                {currentUserRole === "SUPER_ADMIN"
                  ? "Everything important is visible at a glance, with enough detail for handover and full audit."
                  : "Operational history is visible here, while full audit detail remains available to Super Admin."}
              </p>
            </div>
            <span className="status-chip status-chip-default">
              {currentUserRole === "SUPER_ADMIN" ? "Full Audit Trail" : "Operational History"}
            </span>
          </div>
            <div className="dashboard-stack">
              {visibleSelectedHistory.map((item) => (
                <article key={item.id} className="dashboard-timeline-card">
                <div className="panel-head">
                  <strong>{item.title}</strong>
                  <span className="tiny">{new Date(item.createdAt).toLocaleString("en-ZA")}</span>
                </div>
                <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </article>
        ) : null}
      </section>
    </>
  );
}
