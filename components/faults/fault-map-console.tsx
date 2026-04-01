"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { GlobalSearch } from "@/components/shared/global-search";
import { loadGoogleMaps } from "@/lib/google-maps-client";
import type { Fault, GlobalSearchItem } from "@/types/domain";

type FaultMapConsoleProps = {
  faults: Fault[];
  googleMapsApiKey: string;
  defaultCenter: {
    label: string;
    latitude: number;
    longitude: number;
    zoom: number;
  };
};

const priorityOptions: Array<{ value: Fault["priority"]; label: string; color: string }> = [
  { value: "critical", label: "Critical", color: "#c2574a" },
  { value: "high", label: "High", color: "#dc953b" },
  { value: "medium", label: "Medium", color: "#2176ae" },
  { value: "low", label: "Low", color: "#2f7967" }
];

const mapStyles = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
];

function getCategoryColor(category: string) {
  const normalized = category.trim().toLowerCase();
  if (normalized.includes("electric")) return "#d4a53a";
  if (normalized.includes("water")) return "#2176ae";
  if (normalized.includes("storm")) return "#2f7967";
  if (normalized.includes("traffic")) return "#c2574a";
  if (normalized.includes("road")) return "#8a6538";
  if (normalized.includes("pollution")) return "#6f4aa8";
  if (normalized.includes("park")) return "#3f8f62";
  if (normalized.includes("building")) return "#5f6b7a";
  return "#0f6671";
}

function getStatusTone(status: Fault["status"]) {
  if (status === "closed") return "success";
  if (status === "in-progress") return "warning";
  if (status === "archived") return "default";
  return "danger";
}

function getSubCategoryGlyph(subCategory?: string) {
  const key = (subCategory ?? "").trim().toLowerCase();

  if (!key) {
    return '<path d="M8 4.2v7.6M4.2 8h7.6" stroke="#0b2b33" stroke-width="1.6" stroke-linecap="round"/>';
  }

  if (key.includes("water") || key.includes("hydrant") || key.includes("meter") || key.includes("pipe")) {
    return '<path d="M8 3.8c1.5 1.8 2.7 3.4 2.7 4.9a2.7 2.7 0 1 1-5.4 0c0-1.5 1.2-3.1 2.7-4.9Z" fill="#0b2b33"/>';
  }

  if (key.includes("tree") || key.includes("verge") || key.includes("grass") || key.includes("parks")) {
    return '<path d="M8 3.8 5.4 6.9h1.4L5.8 8.8h1.6l-.8 2h2.8l-.8-2h1.6l-1-1.9h1.4Z" fill="#0b2b33"/><rect x="7.4" y="10.8" width="1.2" height="1.8" fill="#0b2b33"/>';
  }

  if (key.includes("light") || key.includes("timing") || key.includes("flashing")) {
    return '<rect x="6.2" y="3.6" width="3.6" height="6.8" rx="1" fill="none" stroke="#0b2b33" stroke-width="1.2"/><circle cx="8" cy="5.1" r="0.6" fill="#0b2b33"/><circle cx="8" cy="7" r="0.6" fill="#0b2b33"/><circle cx="8" cy="8.9" r="0.6" fill="#0b2b33"/><path d="M8 10.7v1.8" stroke="#0b2b33" stroke-width="1.2" stroke-linecap="round"/>';
  }

  if (key.includes("electric") || key.includes("spark") || key.includes("shock") || key.includes("cable") || key.includes("substation")) {
    return '<path d="M8.8 3.8 6.6 7.7h1.4l-.6 3.2 2.2-4h-1.4l.6-3.1Z" fill="#0b2b33"/>';
  }

  if (key.includes("dump") || key.includes("refuse") || key.includes("recycling")) {
    return '<rect x="5.8" y="5.4" width="4.4" height="5.8" rx="0.8" stroke="#0b2b33" stroke-width="1.2" fill="none"/><path d="M5.6 5.4h4.8M7 4.4h2" stroke="#0b2b33" stroke-width="1.2" stroke-linecap="round"/>';
  }

  if (key.includes("manhole") || key.includes("sinkhole")) {
    return '<circle cx="8" cy="8" r="3.1" stroke="#0b2b33" stroke-width="1.2" fill="none"/><circle cx="8" cy="8" r="1.3" stroke="#0b2b33" stroke-width="1.1" fill="none"/>';
  }

  if (key.includes("road") || key.includes("pothole") || key.includes("pot hole") || key.includes("marking")) {
    return '<path d="M8 3.8v8.6" stroke="#0b2b33" stroke-width="1.2"/><path d="M8 5.1v1.3M8 7.5v1.3M8 9.9v1.3" stroke="#0b2b33" stroke-width="1.2" stroke-linecap="round"/>';
  }

  if (key.includes("building")) {
    return '<rect x="5.8" y="4.2" width="4.4" height="7.2" stroke="#0b2b33" stroke-width="1.2" fill="none"/><path d="M6.8 5.5h.6M8.6 5.5h.6M6.8 7.1h.6M8.6 7.1h.6M6.8 8.7h.6M8.6 8.7h.6" stroke="#0b2b33" stroke-width="1" stroke-linecap="round"/>';
  }

  if (key.includes("flood") || key.includes("storm")) {
    return '<path d="M4.8 9.4c.8 0 .8-.6 1.6-.6s.8.6 1.6.6.8-.6 1.6-.6" stroke="#0b2b33" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M8 3.9c1.1 1.2 1.7 2.1 1.7 3a1.7 1.7 0 1 1-3.4 0c0-.9.6-1.8 1.7-3Z" fill="#0b2b33"/>';
  }

  return '<path d="M8 4.2v7.6M4.2 8h7.6" stroke="#0b2b33" stroke-width="1.6" stroke-linecap="round"/>';
}

function createFaultPinIcon(subCategory: string | undefined, color: string) {
  const glyph = getSubCategoryGlyph(subCategory);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="22" viewBox="0 0 16 22">
      <path d="M8 1.4c-3.5 0-6.3 2.8-6.3 6.3 0 4.7 5.4 10.3 5.7 10.5a.8.8 0 0 0 1.2 0c.3-.2 5.7-5.8 5.7-10.5 0-3.5-2.8-6.3-6.3-6.3Z" fill="${color}" stroke="#ffffff" stroke-width="1.4"/>
      <circle cx="8" cy="7.8" r="4.2" fill="#ffffff"/>
      <g>${glyph}</g>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(16, 22),
    anchor: new window.google.maps.Point(8, 22)
  };
}

function createClusterIcon(color: string, count: number) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="7.2" fill="${color}" fill-opacity="0.92" stroke="#ffffff" stroke-width="1.6"/>
      <circle cx="9" cy="9" r="4.2" fill="rgba(255,255,255,0.16)"/>
      <text x="9" y="11.3" text-anchor="middle" font-family="Aptos, Segoe UI, sans-serif" font-size="5.8" font-weight="800" fill="#ffffff">${count}</text>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(18, 18),
    anchor: new window.google.maps.Point(9, 9)
  };
}

function getClusterColor(markers: any[]) {
  const counts = new Map<string, number>();
  markers.forEach((marker) => {
    const color = marker.__clusterColor ?? "#2176ae";
    counts.set(color, (counts.get(color) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "#2176ae";
}

function formatDate(value?: string) {
  if (!value) return "Not captured";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not captured";
  return parsed.toLocaleString("en-ZA");
}

export function FaultMapConsole({ faults, googleMapsApiKey, defaultCenter }: FaultMapConsoleProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterRef = useRef<any>(null);
  const [selectedFaultId, setSelectedFaultId] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [geocodeCache, setGeocodeCache] = useState<Record<string, { lat: number; lng: number }>>({});
  const [activePriorities, setActivePriorities] = useState<Record<Fault["priority"], boolean>>({
    critical: true,
    high: true,
    medium: true,
    low: true
  });

  const openFaults = useMemo(
    () => faults.filter((fault) => fault.status !== "closed" && fault.status !== "archived"),
    [faults]
  );

  const visibleFaults = useMemo(
    () => openFaults.filter((fault) => activePriorities[fault.priority]),
    [activePriorities, openFaults]
  );

  const getFaultCoordinates = useCallback(
    (fault: Fault) => {
      if (typeof fault.latitude === "number" && typeof fault.longitude === "number") {
        return { lat: fault.latitude, lng: fault.longitude };
      }
      return geocodeCache[fault.id];
    },
    [geocodeCache]
  );

  const mappedFaults = useMemo(
    () =>
      visibleFaults.filter(
        (fault) => Boolean(getFaultCoordinates(fault))
      ),
    [getFaultCoordinates, visibleFaults]
  );

  const unmappedFaults = useMemo(
    () =>
      visibleFaults.filter(
        (fault) => !getFaultCoordinates(fault)
      ),
    [getFaultCoordinates, visibleFaults]
  );

  const selectedFault =
    mappedFaults.find((fault) => fault.id === selectedFaultId) ??
    mappedFaults[0] ??
    visibleFaults[0] ??
    null;

  const searchItems: GlobalSearchItem[] = visibleFaults.map((fault) => ({
    id: fault.id,
    title: `${fault.ethekwiniReference ?? fault.id} • ${fault.title}`,
    subtitle: [fault.status, fault.priority, fault.locationText].filter(Boolean).join(" • "),
    kind: "fault",
    keywords: [fault.description, fault.category, fault.subCategory, fault.assignedAdminName].filter(Boolean) as string[]
  }));

  const categoryLegend = useMemo(() => {
    const byCategory = new Map<string, string>();
    visibleFaults.forEach((fault) => {
      const key = fault.category?.trim() || "Uncategorised";
      if (!byCategory.has(key)) {
        byCategory.set(key, getCategoryColor(key));
      }
    });
    return Array.from(byCategory.entries()).map(([category, color]) => ({ category, color }));
  }, [visibleFaults]);

  useEffect(() => {
    let cancelled = false;

    async function geocodeMissingFaults() {
      if (!googleMapsApiKey || !visibleFaults.length) return;
      try {
        await loadGoogleMaps(googleMapsApiKey);
        if (cancelled || !window.google?.maps?.Geocoder) return;

        const geocoder = new window.google.maps.Geocoder();
        const queue = visibleFaults.filter(
          (fault) =>
            !getFaultCoordinates(fault) &&
            typeof fault.locationText === "string" &&
            fault.locationText.trim().length >= 3
        );

        for (const fault of queue) {
          if (cancelled) break;
          const query = fault.locationText.toLowerCase().includes("durban")
            ? fault.locationText
            : `${fault.locationText}, Durban, South Africa`;
          const result = await geocoder.geocode({ address: query }).catch(() => null);
          const location = result?.results?.[0]?.geometry?.location;
          const lat = typeof location?.lat === "function" ? location.lat() : undefined;
          const lng = typeof location?.lng === "function" ? location.lng() : undefined;
          if (typeof lat === "number" && typeof lng === "number") {
            setGeocodeCache((current) => ({ ...current, [fault.id]: { lat, lng } }));
          }
        }
      } catch {
        // Fall back to explicit lat/lng only when geocoding is unavailable.
      }
    }

    void geocodeMissingFaults();
    return () => {
      cancelled = true;
    };
  }, [getFaultCoordinates, googleMapsApiKey, visibleFaults]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!googleMapsApiKey || !mapRef.current) {
        setMapError("Google Maps API key is not configured yet in Settings.");
        return;
      }

      try {
        await loadGoogleMaps(googleMapsApiKey);
        if (cancelled || !window.google?.maps || !mapRef.current) return;

        const configuredCenter = {
          lat: defaultCenter.latitude,
          lng: defaultCenter.longitude
        };

        if (!googleMapRef.current) {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, {
            center: configuredCenter,
            zoom: defaultCenter.zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: mapStyles
          });
          infoWindowRef.current = new window.google.maps.InfoWindow();
        } else {
          googleMapRef.current.setCenter(configuredCenter);
          googleMapRef.current.setZoom(defaultCenter.zoom);
        }

        clusterRef.current?.clearMarkers();
        clusterRef.current?.setMap?.(null);
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        mappedFaults.forEach((fault) => {
          const coords = getFaultCoordinates(fault);
          if (!coords) return;
          const markerColor = getCategoryColor(fault.category);
          const marker = new window.google.maps.Marker({
            position: coords,
            title: fault.title,
            icon: createFaultPinIcon(fault.subCategory, markerColor)
          });
          marker.__clusterColor = markerColor;

          marker.addListener("click", () => {
            setSelectedFaultId(fault.id);
            infoWindowRef.current?.setContent(`
              <div style="min-width:220px;padding:4px 2px;font-family:Aptos,Segoe UI,sans-serif;">
                <strong>${fault.ethekwiniReference ?? fault.id}</strong><br />
                <span>${fault.title}</span><br />
                <span>${fault.category}${fault.subCategory ? ` • ${fault.subCategory}` : ""}</span><br />
                <span>${fault.locationText}</span>
              </div>
            `);
            infoWindowRef.current?.open({ anchor: marker, map: googleMapRef.current });
          });

          markersRef.current.push(marker);
        });

        clusterRef.current = new MarkerClusterer({
          map: googleMapRef.current,
          markers: markersRef.current,
          renderer: {
            render({ count, position, markers }) {
              return new window.google.maps.Marker({
                position,
                icon: createClusterIcon(getClusterColor(markers), count),
                zIndex: Number(window.google.maps.Marker.MAX_ZINDEX) + count
              });
            }
          }
        });

        if (mappedFaults.length === 0) {
          googleMapRef.current.setCenter(configuredCenter);
          googleMapRef.current.setZoom(defaultCenter.zoom);
        } else if (mappedFaults.length === 1) {
          const firstCoords = getFaultCoordinates(mappedFaults[0]);
          if (!firstCoords) return;
          googleMapRef.current.panTo(firstCoords);
          googleMapRef.current.setZoom(Math.max(defaultCenter.zoom, 17));
        } else {
          const bounds = new window.google.maps.LatLngBounds();
          mappedFaults.forEach((fault) => {
            const coords = getFaultCoordinates(fault);
            if (coords) {
              bounds.extend(coords);
            }
          });
          googleMapRef.current.fitBounds(bounds, 80);
        }

        setMapError(null);
      } catch {
        setMapError("Google Maps could not load. Check API key, billing, and Places/Maps permissions.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    defaultCenter.latitude,
    defaultCenter.longitude,
    defaultCenter.zoom,
    googleMapsApiKey,
    mappedFaults,
    getFaultCoordinates
  ]);

  function togglePriority(priority: Fault["priority"]) {
    setActivePriorities((current) => ({ ...current, [priority]: !current[priority] }));
  }

  function jumpToSection(sectionId: string) {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function handleStatTileClick(target: "mapped" | "unmapped" | "critical" | "in-progress") {
    if (target === "mapped") {
      jumpToSection("fault-map-surface");
      return;
    }

    if (target === "unmapped") {
      jumpToSection("fault-map-needs-mapping");
      return;
    }

    if (target === "critical") {
      setActivePriorities({
        critical: true,
        high: false,
        medium: false,
        low: false
      });
      const firstCritical = mappedFaults.find((fault) => fault.priority === "critical");
      const coords = firstCritical ? getFaultCoordinates(firstCritical) : undefined;
      if (firstCritical) {
        setSelectedFaultId(firstCritical.id);
      }
      if (coords && googleMapRef.current) {
        googleMapRef.current.panTo(coords);
        googleMapRef.current.setZoom(Math.max(defaultCenter.zoom, 17));
      }
      jumpToSection("fault-map-surface");
      return;
    }

    const firstInProgress = mappedFaults.find((fault) => fault.status === "in-progress");
    const coords = firstInProgress ? getFaultCoordinates(firstInProgress) : undefined;
    if (firstInProgress) {
      setSelectedFaultId(firstInProgress.id);
    }
    if (coords && googleMapRef.current) {
      googleMapRef.current.panTo(coords);
      googleMapRef.current.setZoom(Math.max(defaultCenter.zoom, 17));
    }
    jumpToSection("fault-map-surface");
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Fault Map</h1>
          <p>Live geographic view of open faults with clustering, priority filters, and category/subcategory pin logic.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch
            items={searchItems}
            placeholder="Search open faults by eThekwini ref, title, priority, category..."
            onItemSelect={(item) => {
              const fault = mappedFaults.find((entry) => entry.id === item.id);
              if (!fault) return;
              setSelectedFaultId(fault.id);
              const coords = getFaultCoordinates(fault);
              if (googleMapRef.current && coords) {
                googleMapRef.current.panTo(coords);
                googleMapRef.current.setZoom(Math.max(defaultCenter.zoom, 17));
              }
            }}
          />
          <Link href="/dashboard/faults/register" className="button-secondary">
            Fault Queue
          </Link>
          <Link href="/dashboard/faults/log" className="button-primary">
            Escalate Fault
          </Link>
        </div>
      </header>

      {mapError ? (
        <section className="flash-panel flash-panel-warning">
          <strong>{mapError}</strong>
        </section>
      ) : null}

      <section className="dashboard-stat-grid dashboard-stat-grid-find-resident">
        <button
          type="button"
          className="dashboard-stat-card dashboard-stat-card-success dashboard-stat-button dashboard-card-link"
          onClick={() => handleStatTileClick("mapped")}
        >
          <span>Mapped Faults</span>
          <strong>{mappedFaults.length}</strong>
          <small>Open faults currently visible on the map</small>
        </button>
        <button
          type="button"
          className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link"
          onClick={() => handleStatTileClick("unmapped")}
        >
          <span>Needs Mapping</span>
          <strong>{unmappedFaults.length}</strong>
          <small>Faults missing coordinates</small>
        </button>
        <button
          type="button"
          className="dashboard-stat-card dashboard-stat-card-danger dashboard-stat-button dashboard-card-link"
          onClick={() => handleStatTileClick("critical")}
        >
          <span>Critical Faults</span>
          <strong>{visibleFaults.filter((fault) => fault.priority === "critical").length}</strong>
          <small>Open critical faults in current filters</small>
        </button>
        <button
          type="button"
          className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link"
          onClick={() => handleStatTileClick("in-progress")}
        >
          <span>In Progress</span>
          <strong>{visibleFaults.filter((fault) => fault.status === "in-progress").length}</strong>
          <small>Open faults currently in progress</small>
        </button>
      </section>

      <section className="dashboard-stack">
        <article id="fault-map-surface" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Fault Coverage Map</h2>
              <p>Toggle priorities, then click any pin. Pin color follows category, icon pattern follows sub category.</p>
            </div>
            <span className="status-chip status-chip-success">Live Pins</span>
          </div>

          <div className="resident-map-filter-row">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`resident-map-filter${activePriorities[option.value] ? " resident-map-filter-active" : ""}`}
                onClick={() => togglePriority(option.value)}
                style={{ ["--resident-type-color" as string]: option.color }}
              >
                <span className="resident-map-filter-icon">{option.label.charAt(0)}</span>
                {option.label}
              </button>
            ))}
          </div>

          <div className="resident-map-legend">
            {categoryLegend.map((item) => (
              <div key={item.category} className="resident-map-legend-item">
                <span className="resident-map-legend-pin" style={{ ["--resident-type-color" as string]: item.color }}>
                  C
                </span>
                <span>{item.category}</span>
              </div>
            ))}
          </div>

          <div ref={mapRef} className="resident-map-canvas" />
        </article>

        <div className="resident-map-bottom-grid">
          <article id="fault-map-needs-mapping" className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Selected Fault</h2>
                <p>Pin selection opens the operational detail here for fast action handoff.</p>
              </div>
              {selectedFault ? (
                <span className={`status-chip status-chip-${getStatusTone(selectedFault.status)}`}>{selectedFault.status}</span>
              ) : null}
            </div>
            {selectedFault ? (
              <div className="dashboard-stack">
                <div className="config-item">
                  <label>eThekwini Fault Reference</label>
                  <strong>{selectedFault.ethekwiniReference ?? selectedFault.id}</strong>
                </div>
                <div className="config-item">
                  <label>Fault Title</label>
                  <strong>{selectedFault.title}</strong>
                </div>
                <div className="config-item">
                  <label>Category / Sub Category</label>
                  <strong>{selectedFault.category}{selectedFault.subCategory ? ` • ${selectedFault.subCategory}` : ""}</strong>
                </div>
                <div className="meta-row">
                  <span className="tag">Priority: {selectedFault.priority}</span>
                  <span className="tag">{selectedFault.locationText}</span>
                  {selectedFault.assignedAdminName ? <span className="tag">Assigned: {selectedFault.assignedAdminName}</span> : null}
                </div>
                <div className="config-item">
                  <label>Last Update</label>
                  <strong>{formatDate(selectedFault.updatedAt)}</strong>
                </div>
                <div className="dashboard-actions-row">
                  <Link href="/dashboard/faults/register" className="button-primary">
                    Open Fault Queue
                  </Link>
                </div>
              </div>
            ) : (
              <article className="dashboard-today-card">
                <strong>No mapped faults are available for the selected filters yet.</strong>
              </article>
            )}
          </article>

          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Needs Mapping</h2>
                <p>These faults still need coordinates before they can render on the Fault Map.</p>
              </div>
              <span className="status-chip status-chip-warning">{unmappedFaults.length}</span>
            </div>
            <div className="dashboard-stack">
              {unmappedFaults.length > 0 ? (
                unmappedFaults.slice(0, 24).map((fault) => (
                  <article key={fault.id} className="dashboard-today-card">
                    <strong>{fault.ethekwiniReference ?? fault.id} • {fault.title}</strong>
                    <p>{fault.locationText}</p>
                    <div className="meta-row">
                      <span className="tag">{fault.status}</span>
                      <span className="tag">{fault.priority}</span>
                      <span className="tag">{fault.category}</span>
                    </div>
                  </article>
                ))
              ) : (
                <article className="dashboard-today-card">
                  <strong>All visible faults currently have map coordinates.</strong>
                </article>
              )}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
