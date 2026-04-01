"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { loadGoogleMaps } from "@/lib/google-maps-client";
import {
  getAssetTypeColor,
  getAssetTypeLabel,
  InfrastructureGlyph,
  infrastructureTypeOptions
} from "@/components/infrastructure/infrastructure-map-meta";
import type { InfrastructureAsset } from "@/types/domain";

type InfrastructureMapConsoleProps = {
  assets: InfrastructureAsset[];
  googleMapsApiKey: string;
  defaultCenter: {
    label: string;
    latitude: number;
    longitude: number;
    zoom: number;
  };
};

const mapStyles = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
];

function getInfrastructureGlyphMarkup(type: InfrastructureAsset["assetType"]) {
  switch (type) {
    case "streetlight-pole":
      return '<line x1="16" y1="22" x2="16" y2="8" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><line x1="16" y1="8" x2="24" y2="8" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><circle cx="24" cy="11" r="2.6" fill="#ffffff"/>';
    case "optic-fiber-pole":
      return '<line x1="16" y1="23" x2="16" y2="7" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><circle cx="11" cy="12" r="2.1" fill="#ffffff"/><circle cx="16" cy="10" r="2.1" fill="#ffffff"/><circle cx="21" cy="12" r="2.1" fill="#ffffff"/>';
    case "electrical-substation":
      return '<path d="M17 6 11 16h5l-1 10 7-12h-5l1-8Z" fill="#ffffff"/>';
    case "electrical-distribution-box":
      return '<rect x="10" y="8" width="12" height="16" rx="2.6" fill="none" stroke="#ffffff" stroke-width="2.1"/><line x1="16" y1="8" x2="16" y2="24" stroke="#ffffff" stroke-width="2"/><line x1="10" y1="14" x2="22" y2="14" stroke="#ffffff" stroke-width="2"/>';
    case "water-meter":
      return '<circle cx="16" cy="16" r="8" fill="none" stroke="#ffffff" stroke-width="2.2"/><path d="M16 11c2 2 3.5 4 3.5 5.7A3.5 3.5 0 1 1 12.5 16.7C12.5 15 14 13 16 11Z" fill="#ffffff"/>';
    case "water-valve":
      return '<circle cx="16" cy="16" r="6.8" fill="none" stroke="#ffffff" stroke-width="2.2"/><line x1="16" y1="7" x2="16" y2="25" stroke="#ffffff" stroke-width="2"/><line x1="7" y1="16" x2="25" y2="16" stroke="#ffffff" stroke-width="2"/>';
    case "fire-hydrant":
      return '<rect x="11" y="10" width="10" height="12" rx="2.5" fill="none" stroke="#ffffff" stroke-width="2.1"/><line x1="16" y1="7" x2="16" y2="10" stroke="#ffffff" stroke-width="2.1"/><line x1="9" y1="14" x2="11" y2="14" stroke="#ffffff" stroke-width="2.1"/><line x1="21" y1="14" x2="23" y2="14" stroke="#ffffff" stroke-width="2.1"/><line x1="13" y1="22" x2="13" y2="25" stroke="#ffffff" stroke-width="2.1"/><line x1="19" y1="22" x2="19" y2="25" stroke="#ffffff" stroke-width="2.1"/>';
    case "traffic-light":
      return '<rect x="11" y="6" width="10" height="20" rx="3" fill="none" stroke="#ffffff" stroke-width="2.1"/><circle cx="16" cy="11" r="2.1" fill="#ffffff"/><circle cx="16" cy="16" r="2.1" fill="#ffffff"/><circle cx="16" cy="21" r="2.1" fill="#ffffff"/>';
    case "manhole":
    default:
      return '<circle cx="16" cy="16" r="8" fill="none" stroke="#ffffff" stroke-width="2.2"/><circle cx="16" cy="16" r="4" fill="none" stroke="#ffffff" stroke-width="2"/><line x1="10" y1="16" x2="22" y2="16" stroke="#ffffff" stroke-width="2"/>';
  }
}

function createInfrastructurePinIcon(type: InfrastructureAsset["assetType"], color: string) {
  const glyph = getInfrastructureGlyphMarkup(type);
  const glyphHighContrast = glyph.replaceAll("#ffffff", "#0b2b33");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="22" viewBox="0 0 16 22">
      <path d="M8 1.4c-3.5 0-6.3 2.8-6.3 6.3 0 4.7 5.4 10.3 5.7 10.5a.8.8 0 0 0 1.2 0c.3-.2 5.7-5.8 5.7-10.5 0-3.5-2.8-6.3-6.3-6.3Z" fill="${color}" stroke="#ffffff" stroke-width="1.4"/>
      <circle cx="8" cy="7.8" r="4.2" fill="#ffffff"/>
      <g transform="translate(-5 -7) scale(0.26)">${glyphHighContrast}</g>
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

export function InfrastructureMapConsole({
  assets,
  googleMapsApiKey,
  defaultCenter
}: InfrastructureMapConsoleProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterRef = useRef<any>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<
    Record<InfrastructureAsset["assetType"], boolean>
  >({
    "streetlight-pole": true,
    "optic-fiber-pole": true,
    "electrical-substation": true,
    "electrical-distribution-box": true,
    "water-meter": true,
    "water-valve": true,
    "fire-hydrant": true,
    "traffic-light": true,
    manhole: true
  });

  const mappedAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          typeof asset.latitude === "number" &&
          typeof asset.longitude === "number" &&
          activeFilters[asset.assetType]
      ),
    [activeFilters, assets]
  );

  const unmappedAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          typeof asset.latitude !== "number" || typeof asset.longitude !== "number"
      ),
    [assets]
  );

  const selectedAsset =
    mappedAssets.find((asset) => asset.id === selectedAssetId) ??
    mappedAssets[0] ??
    assets[0];

  useEffect(() => {
    if (!selectedAssetId && mappedAssets[0]) {
      setSelectedAssetId(mappedAssets[0].id);
    }
  }, [mappedAssets, selectedAssetId]);

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

        mappedAssets.forEach((asset) => {
          const markerColor = getAssetTypeColor(asset.assetType);
          const marker = new window.google.maps.Marker({
            position: { lat: asset.latitude, lng: asset.longitude },
            title: asset.assetName,
            icon: createInfrastructurePinIcon(
              asset.assetType,
              markerColor
            )
          });
          marker.__clusterColor = markerColor;

          marker.addListener("click", () => {
            setSelectedAssetId(asset.id);
            infoWindowRef.current?.setContent(`
              <div style="min-width:220px;padding:4px 2px;font-family:Aptos,Segoe UI,sans-serif;">
                <strong>${asset.assetName}</strong><br />
                <span>${getAssetTypeLabel(asset.assetType)}</span><br />
                <span>${asset.street}</span><br />
                <span>${asset.condition}</span>
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

        setMapError(null);
      } catch {
        if (!cancelled) {
          setMapError("Google Maps could not be loaded for the Infrastructure Map.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    assets,
    defaultCenter.latitude,
    defaultCenter.longitude,
    defaultCenter.zoom,
    googleMapsApiKey,
    mappedAssets
  ]);

  function toggleInfrastructureType(type: InfrastructureAsset["assetType"]) {
    setActiveFilters((current) => ({
      ...current,
      [type]: !current[type]
    }));
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Infrastructure Map</h1>
          <p>
            View streetlight poles, fiber, electrical, water, traffic, and drainage
            assets across the area from one internal map layer.
          </p>
        </div>
      </header>

      {mapError ? (
        <section className="flash-panel flash-panel-warning">
          <strong>{mapError}</strong>
        </section>
      ) : null}

      <section className="dashboard-stat-grid dashboard-stat-grid-six">
        <div className="dashboard-stat-card dashboard-stat-card-success">
          <span>Mapped Assets</span>
          <strong>{mappedAssets.length}</strong>
          <small>Infrastructure points shown on the map</small>
        </div>
        <div className="dashboard-stat-card dashboard-stat-card-warning">
          <span>Needs Mapping</span>
          <strong>{unmappedAssets.length}</strong>
          <small>Assets missing coordinates</small>
        </div>
        {infrastructureTypeOptions.slice(0, 4).map((option) => (
          <div key={option.value} className="dashboard-stat-card dashboard-stat-card-default">
            <span>{option.label}</span>
            <strong>{assets.filter((asset) => asset.assetType === option.value).length}</strong>
            <small>Currently captured in the register</small>
          </div>
        ))}
      </section>

      <section className="dashboard-stack">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Infrastructure Coverage Map</h2>
              <p>Toggle infrastructure layers and click a pin to inspect the selected asset.</p>
            </div>
            <span className="status-chip status-chip-success">Live Pins</span>
          </div>

          <div className="infrastructure-map-filter-row">
            {infrastructureTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`infrastructure-map-filter${activeFilters[option.value] ? " infrastructure-map-filter-active" : ""}`}
                onClick={() => toggleInfrastructureType(option.value)}
                style={{ ["--infrastructure-type-color" as string]: option.color }}
              >
                <span className="infrastructure-map-filter-icon">
                  <InfrastructureGlyph type={option.value} />
                </span>
                {option.label}
              </button>
            ))}
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

          <div ref={mapRef} className="infrastructure-map-canvas" />
        </article>

        <div className="resident-map-bottom-grid">
          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Selected Asset</h2>
                <p>The clicked pin opens a quick operational summary here.</p>
              </div>
              {selectedAsset ? (
                <span className="status-chip status-chip-default">
                  {getAssetTypeLabel(selectedAsset.assetType)}
                </span>
              ) : null}
            </div>
            {selectedAsset ? (
              <div className="dashboard-stack">
                <div className="config-item">
                  <label>Asset Name</label>
                  <strong>{selectedAsset.assetName}</strong>
                </div>
                <div className="config-item">
                  <label>Type</label>
                  <strong>{getAssetTypeLabel(selectedAsset.assetType)}</strong>
                </div>
                <div className="config-item">
                  <label>Road</label>
                  <strong>{selectedAsset.street}</strong>
                </div>
                <div className="config-item">
                  <label>Condition</label>
                  <strong>{selectedAsset.condition}</strong>
                </div>
                <div className="config-item config-item-wide">
                  <label>Notes</label>
                  <strong>{selectedAsset.notes ?? "No notes captured yet."}</strong>
                </div>
              </div>
            ) : (
              <article className="dashboard-today-card">
                <strong>No mapped assets are available for the selected filters yet.</strong>
              </article>
            )}
          </article>

          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Needs Mapping</h2>
                <p>These assets still need coordinates before they can appear on the Infrastructure Map.</p>
              </div>
              <span className="status-chip status-chip-warning">{unmappedAssets.length}</span>
            </div>
            <div className="dashboard-stack">
              {unmappedAssets.length > 0 ? (
                unmappedAssets.map((asset) => (
                  <article key={asset.id} className="dashboard-today-card">
                    <strong>{asset.assetName}</strong>
                    <p>{asset.street}</p>
                    <div className="meta-row">
                      <span className="tag">{getAssetTypeLabel(asset.assetType)}</span>
                      <span className="tag">{asset.condition}</span>
                    </div>
                  </article>
                ))
              ) : (
                <article className="dashboard-today-card">
                  <strong>All registered infrastructure assets currently have map coordinates.</strong>
                </article>
              )}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
