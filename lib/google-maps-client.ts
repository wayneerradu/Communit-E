declare global {
  interface Window {
    google?: any;
    __commUNITELoadGoogleMaps?: Promise<void>;
  }
}

type GoogleMapsLibrary = "places";

function buildGoogleMapsScriptUrl(apiKey: string, libraries: GoogleMapsLibrary[] = []) {
  const uniqueLibraries = Array.from(new Set(libraries));
  const query = uniqueLibraries.length > 0 ? `&libraries=${uniqueLibraries.join(",")}` : "";
  return `https://maps.googleapis.com/maps/api/js?key=${apiKey}${query}`;
}

export async function loadGoogleMaps(apiKey: string, libraries: GoogleMapsLibrary[] = []) {
  if (typeof window === "undefined" || !apiKey) {
    return;
  }

  const needsPlaces = libraries.includes("places");

  if (window.google?.maps && (!needsPlaces || window.google?.maps?.places)) {
    return;
  }

  if (window.google?.maps && needsPlaces && typeof window.google.maps.importLibrary === "function") {
    await window.google.maps.importLibrary("places");
    return;
  }

  if (window.__commUNITELoadGoogleMaps) {
    await window.__commUNITELoadGoogleMaps;
    if (!needsPlaces || window.google?.maps?.places) {
      return;
    }
    if (window.google?.maps && typeof window.google.maps.importLibrary === "function") {
      await window.google.maps.importLibrary("places");
      return;
    }
  }

  window.__commUNITELoadGoogleMaps = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-maps="shared"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = buildGoogleMapsScriptUrl(apiKey, libraries);
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "shared";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

  await window.__commUNITELoadGoogleMaps;

  if (needsPlaces && !window.google?.maps?.places && typeof window.google?.maps?.importLibrary === "function") {
    await window.google.maps.importLibrary("places");
  }
}
