"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { ResidentContactActions } from "@/components/residents/resident-contact-actions";
import { GlobalSearch } from "@/components/shared/global-search";
import { loadGoogleMaps } from "@/lib/google-maps-client";
import type { GlobalSearchItem, Resident, ResidentType } from "@/types/domain";

type ResidentsMapConsoleProps = {
  residents: Resident[];
  currentUserName: string;
  googleMapsApiKey: string;
  defaultCenter: {
    label: string;
    latitude: number;
    longitude: number;
    zoom: number;
  };
};

const residentTypeOptions: Array<{ value: ResidentType; label: string; color: string }> = [
  { value: "resident", label: "Residents", color: "#2f7967" },
  { value: "admin", label: "Admins", color: "#c2574a" },
  { value: "street-captain", label: "Street Captains", color: "#dc953b" },
  { value: "volunteer", label: "Volunteers", color: "#0f6671" },
  { value: "animal-care-volunteer", label: "Animal Care Volunteers", color: "#7a57c2" }
];

const residentMapStyles = [
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }]
  }
];

function getResidentTypeLabel(type?: ResidentType) {
  return residentTypeOptions.find((option) => option.value === (type ?? "resident"))?.label ?? "Residents";
}

function getResidentTypeColor(type?: ResidentType) {
  return residentTypeOptions.find((option) => option.value === (type ?? "resident"))?.color ?? "#2f7967";
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
    getResidentTypeLabel(resident.residentType)
  ].filter(Boolean);
}

function getResidentTypeSymbol(type?: ResidentType) {
  switch (type) {
    case "admin":
      return "🛡";
    case "street-captain":
      return "⚑";
    case "volunteer":
      return "♥";
    case "animal-care-volunteer":
      return "🐾";
    case "resident":
    default:
      return "●";
  }
}

function createResidentPinIcon(color: string, symbol: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="22" viewBox="0 0 16 22">
      <path d="M8 1.4c-3.5 0-6.3 2.8-6.3 6.3 0 4.7 5.4 10.3 5.7 10.5a.8.8 0 0 0 1.2 0c.3-.2 5.7-5.8 5.7-10.5 0-3.5-2.8-6.3-6.3-6.3Z" fill="${color}" stroke="#ffffff" stroke-width="1.4"/>
      <circle cx="8" cy="7.8" r="3.8" fill="rgba(255,255,255,0.16)"/>
      <text x="8" y="9.9" text-anchor="middle" font-family="Segoe UI Symbol, Segoe UI Emoji, Aptos, sans-serif" font-size="5.8" font-weight="700" fill="#ffffff">${symbol}</text>
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
  const colorCounts = new Map<string, number>();
  markers.forEach((marker) => {
    const color = marker.__clusterColor ?? "#2f7967";
    colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
  });

  return [...colorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "#2f7967";
}

function getResidentTypeTone(type?: ResidentType) {
  switch (type) {
    case "admin":
      return "danger";
    case "street-captain":
      return "warning";
    case "volunteer":
      return "default";
    case "animal-care-volunteer":
      return "default";
    case "resident":
    default:
      return "success";
  }
}

export function ResidentsMapConsole({ residents, currentUserName, googleMapsApiKey, defaultCenter }: ResidentsMapConsoleProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterRef = useRef<any>(null);
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<ResidentType, boolean>>({
    resident: true,
    admin: true,
    "street-captain": true,
    volunteer: true,
    "animal-care-volunteer": true
  });
  const [mapError, setMapError] = useState<string | null>(null);

  const activeResidents = useMemo(
    () => residents.filter((resident) => resident.status === "active"),
    [residents]
  );
  const mappedResidents = useMemo(
    () =>
      activeResidents.filter(
        (resident) =>
          typeof resident.latitude === "number" &&
          typeof resident.longitude === "number" &&
          activeFilters[(resident.residentType ?? "resident") as ResidentType]
      ),
    [activeFilters, activeResidents]
  );
  const unmappedResidents = useMemo(
    () =>
      activeResidents.filter(
        (resident) => typeof resident.latitude !== "number" || typeof resident.longitude !== "number"
      ),
    [activeResidents]
  );
  const selectedResident =
    mappedResidents.find((resident) => resident.id === selectedResidentId) ??
    mappedResidents[0] ??
    activeResidents[0];
  const adminResidents = activeResidents.filter((resident) => resident.residentType === "admin");
  const streetCaptains = activeResidents.filter((resident) => resident.residentType === "street-captain");
  const volunteers = activeResidents.filter((resident) => resident.residentType === "volunteer");
  const animalCareVolunteers = activeResidents.filter(
    (resident) => resident.residentType === "animal-care-volunteer"
  );
  const searchItems: GlobalSearchItem[] = activeResidents.map((resident) => ({
    id: resident.id,
    title: resident.name,
    subtitle: [resident.addressLine1, resident.phone, resident.email].filter(Boolean).join(" • "),
    kind: "resident",
    keywords: buildResidentSearchKeywords(resident) as string[]
  }));

  useEffect(() => {
    if (selectedResidentId) {
      return;
    }

    if (mappedResidents[0]) {
      setSelectedResidentId(mappedResidents[0].id);
    }
  }, [mappedResidents, selectedResidentId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!googleMapsApiKey || !mapRef.current) {
        setMapError("Google Maps API key is not configured yet in Settings.");
        return;
      }

      try {
        await loadGoogleMaps(googleMapsApiKey);
        if (cancelled || !window.google?.maps || !mapRef.current) {
          return;
        }

        const configuredCenter = { lat: defaultCenter.latitude, lng: defaultCenter.longitude };

        if (!googleMapRef.current) {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, {
            center: configuredCenter,
            zoom: defaultCenter.zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: residentMapStyles
          });
          infoWindowRef.current = new window.google.maps.InfoWindow();
        }

        clusterRef.current?.clearMarkers();
        clusterRef.current?.setMap?.(null);
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        mappedResidents.forEach((resident) => {
          const markerColor = getResidentTypeColor(resident.residentType);
          const marker = new window.google.maps.Marker({
            position: { lat: resident.latitude!, lng: resident.longitude! },
            title: resident.name,
            icon: createResidentPinIcon(
              markerColor,
              getResidentTypeSymbol(resident.residentType)
            )
          });
          marker.__clusterColor = markerColor;

          marker.addListener("click", () => {
            setSelectedResidentId(resident.id);
            infoWindowRef.current?.setContent(`
              <div style="min-width:220px;padding:4px 2px;font-family:Aptos,Segoe UI,sans-serif;">
                <strong>${resident.name}</strong><br />
                <span>${getResidentTypeLabel(resident.residentType)}</span><br />
                <span>${resident.addressLine1 ?? "Physical address not captured"}</span><br />
                <span>${resident.securityCompany ?? "No security company recorded"}</span>
              </div>
            `);
            infoWindowRef.current?.open({
              anchor: marker,
              map: googleMapRef.current
            });
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
                label: undefined,
                zIndex: Number(window.google.maps.Marker.MAX_ZINDEX) + count
              });
            }
          }
        });

        if (mappedResidents.length === 0) {
          googleMapRef.current.setCenter(configuredCenter);
          googleMapRef.current.setZoom(defaultCenter.zoom);
        } else if (mappedResidents.length === 1) {
          googleMapRef.current.panTo({
            lat: mappedResidents[0].latitude!,
            lng: mappedResidents[0].longitude!
          });
          googleMapRef.current.setZoom(Math.max(defaultCenter.zoom, 17));
        } else {
          const bounds = new window.google.maps.LatLngBounds();
          mappedResidents.forEach((resident) => {
            bounds.extend({
              lat: resident.latitude!,
              lng: resident.longitude!
            });
          });
          googleMapRef.current.fitBounds(bounds, 80);
        }

        setMapError(null);
      } catch {
        if (!cancelled) {
          setMapError("Google Maps could not be loaded for the Residents Map.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultCenter.latitude, defaultCenter.longitude, defaultCenter.zoom, googleMapsApiKey, mappedResidents, selectedResident?.id]);

  function toggleResidentType(type: ResidentType) {
    setActiveFilters((current) => ({
      ...current,
      [type]: !current[type]
    }));
  }

  function renderRoleContacts(
    title: string,
    description: string,
    residentsByRole: Resident[],
    emptyMessage: string,
    residentType: ResidentType
  ) {
    const residentTypeColor = getResidentTypeColor(residentType);
    const residentTypeSymbol = getResidentTypeSymbol(residentType);
    return (
      <article className="surface-panel clean-marine-panel">
        <div className="section-header">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <span className={`status-chip status-chip-${getResidentTypeTone(residentType)}`}>{residentsByRole.length}</span>
        </div>
        <div className="dashboard-stack">
          {residentsByRole.length > 0 ? (
            residentsByRole.map((resident) => (
              <article key={resident.id} className="dashboard-today-card">
                <div className="panel-head">
                  <div className="resident-role-card-title">
                    <span
                      className="resident-role-card-icon"
                      style={{ ["--resident-type-color" as string]: residentTypeColor }}
                    >
                      {residentTypeSymbol}
                    </span>
                    <strong>{resident.name}</strong>
                  </div>
                  <span className={`status-chip status-chip-${getResidentTypeTone(residentType)}`}>
                    {getResidentTypeLabel(resident.residentType)}
                  </span>
                </div>
                <p>{resident.addressLine1 ?? "Physical address not captured"}</p>
                <div className="meta-row">
                  {resident.phone ? <span className="tag">{resident.phone}</span> : null}
                  {resident.email ? <span className="tag">{resident.email}</span> : null}
                  {resident.securityCompany ? <span className="tag">{resident.securityCompany}</span> : null}
                </div>
                <ResidentContactActions resident={resident} adminName={currentUserName} />
              </article>
            ))
          ) : (
            <article className="dashboard-today-card">
              <strong>{emptyMessage}</strong>
            </article>
          )}
        </div>
      </article>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Residents Map</h1>
          <p>View where residents, admins, street captains, volunteers, and animal care volunteers are distributed across the area.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch
            items={searchItems}
            placeholder="Search residents, admins, street captains, volunteers, animal care volunteers..."
            onItemSelect={(item) => {
              const resident = activeResidents.find((entry) => entry.id === item.id);
              if (!resident) {
                return;
              }

              setSelectedResidentId(resident.id);
              if (googleMapRef.current && typeof resident.latitude === "number" && typeof resident.longitude === "number") {
                googleMapRef.current.panTo({ lat: resident.latitude, lng: resident.longitude });
                googleMapRef.current.setZoom(Math.max(defaultCenter.zoom, 17));
              }
            }}
          />
          <Link href="/dashboard/residents" className="button-primary">
            Add Resident
          </Link>
        </div>
      </header>

      {mapError ? (
        <section className="flash-panel flash-panel-warning">
          <strong>{mapError}</strong>
        </section>
      ) : null}

      <section className="dashboard-stat-grid dashboard-stat-grid-find-resident">
        <div className="dashboard-stat-card dashboard-stat-card-success">
          <span>Mapped Residents</span>
          <strong>{mappedResidents.length}</strong>
          <small>Active residents currently shown on the map</small>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card-warning">
          <span>Needs Mapping</span>
          <strong>{unmappedResidents.length}</strong>
          <small>Active residents without coordinates yet</small>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card-default">
          <span>Admins</span>
          <strong>{activeResidents.filter((resident) => resident.residentType === "admin").length}</strong>
          <small>Mapped leadership coverage</small>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card-default">
          <span>Street Captains</span>
          <strong>{activeResidents.filter((resident) => resident.residentType === "street-captain").length}</strong>
          <small>Road-level representation</small>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card-default">
          <span>Volunteers</span>
          <strong>{activeResidents.filter((resident) => resident.residentType === "volunteer").length}</strong>
          <small>Community volunteer coverage</small>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card-default">
          <span>Animal Care Volunteers</span>
          <strong>{activeResidents.filter((resident) => resident.residentType === "animal-care-volunteer").length}</strong>
          <small>Animal welfare coverage</small>
        </div>
      </section>

      <section className="dashboard-stack">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Resident Coverage Map</h2>
              <p>Toggle resident types to focus the map and click a pin to inspect the resident summary.</p>
            </div>
            <span className="status-chip status-chip-success">Live Pins</span>
          </div>

          <div className="resident-map-filter-row">
            {residentTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`resident-map-filter${activeFilters[option.value] ? " resident-map-filter-active" : ""}`}
                onClick={() => toggleResidentType(option.value)}
                style={{ ["--resident-type-color" as string]: option.color }}
              >
                <span className="resident-map-filter-icon">{getResidentTypeSymbol(option.value)}</span>
                {option.label}
              </button>
            ))}
          </div>

          <div className="resident-map-legend">
            {residentTypeOptions.map((option) => (
              <div key={option.value} className="resident-map-legend-item">
                <span className="resident-map-legend-pin" style={{ ["--resident-type-color" as string]: option.color }}>
                  {getResidentTypeSymbol(option.value)}
                </span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>

          <div ref={mapRef} className="resident-map-canvas" />
        </article>

        <div className="resident-map-bottom-grid">
          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Selected Resident</h2>
                <p>The clicked pin opens a quick operational summary here.</p>
              </div>
              {selectedResident ? <span className="status-chip status-chip-default">{getResidentTypeLabel(selectedResident.residentType)}</span> : null}
            </div>
            {selectedResident ? (
              <div className="dashboard-stack">
                <div className="config-item">
                  <label>Full Name</label>
                  <strong>{selectedResident.name}</strong>
                </div>
                <div className="config-item">
                  <label>Physical Address</label>
                  <strong>{selectedResident.addressLine1 ?? "Physical address not captured"}</strong>
                </div>
                <div className="config-item">
                  <label>Security Company</label>
                  <strong>{selectedResident.securityCompany ?? "No security company recorded"}</strong>
                </div>
                <div className="config-item">
                  <label>Mobile Number</label>
                  <strong>{selectedResident.phone ?? "No mobile number recorded"}</strong>
                </div>
                <ResidentContactActions resident={selectedResident} adminName={currentUserName} />
                <div className="dashboard-actions-row">
                  <Link
                    href={`/dashboard/residents?focus=${selectedResident.id}&queue=active&context=Opened%20from%20Residents%20Map&action=review`}
                    className="button-primary"
                  >
                    Open Full Profile
                  </Link>
                </div>
              </div>
            ) : (
              <article className="dashboard-today-card">
                <strong>No mapped residents are available for the selected filters yet.</strong>
              </article>
            )}
          </article>

          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Needs Mapping</h2>
                <p>These active residents still need coordinates before they can appear on the Residents Map.</p>
              </div>
              <span className="status-chip status-chip-warning">{unmappedResidents.length}</span>
            </div>
            <div className="dashboard-stack">
              {unmappedResidents.length > 0 ? (
                unmappedResidents.map((resident) => (
                  <article key={resident.id} className="dashboard-today-card">
                    <strong>{resident.name}</strong>
                    <p>{resident.addressLine1 ?? "Physical address not captured"}</p>
                    <div className="meta-row">
                      <span className="tag">{getResidentTypeLabel(resident.residentType)}</span>
                      <span className="tag">{resident.securityCompany ?? "No security company"}</span>
                    </div>
                  </article>
                ))
              ) : (
                <article className="dashboard-today-card">
                  <strong>All active residents currently have map coordinates.</strong>
                </article>
              )}
            </div>
          </article>
        </div>

        <div className="resident-map-bottom-grid">
          {renderRoleContacts(
            "Street Captains",
            "Road-level resident contacts who can help with area awareness and local coordination.",
            streetCaptains,
            "No Street Captains have been added yet.",
            "street-captain"
          )}
          {renderRoleContacts(
            "Volunteers",
            "General community volunteers available to help with events, support, and coordination.",
            volunteers,
            "No Volunteers have been added yet.",
            "volunteer"
          )}
          {renderRoleContacts(
            "Animal Care Volunteers",
            "Residents who can assist with animal welfare incidents and related outreach.",
            animalCareVolunteers,
            "No Animal Care Volunteers have been added yet.",
            "animal-care-volunteer"
          )}
          {renderRoleContacts(
            "Admins",
            "Core admin contacts for escalation, moderation, and resident support follow-up.",
            adminResidents,
            "No Admins have been added yet.",
            "admin"
          )}
        </div>
      </section>
    </>
  );
}
