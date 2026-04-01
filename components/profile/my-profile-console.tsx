"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";

type ProfileState = {
  fullName: string;
  email: string;
  nickname: string;
  bio: string;
  dateOfBirth: string;
  physicalAddress: string;
  mobileNumber: string;
  privateNotes: string;
  delegateEmail: string;
  status: "active" | "busy" | "dnd" | "vacation" | "offline";
  avatarImage: string;
};

const statuses: Array<{ value: ProfileState["status"]; label: string; tone: string }> = [
  { value: "active", label: "Active", tone: "success" },
  { value: "busy", label: "Busy", tone: "warning" },
  { value: "dnd", label: "DND", tone: "danger" },
  { value: "vacation", label: "On Vacation", tone: "default" },
  { value: "offline", label: "Offline", tone: "default" }
];

const allowedLocalities = new Set(["mount vernon", "bellair"]);
const allowedPostalCode = "4094";
const allowedCity = "durban";
const allowedCountry = "za";

declare global {
  interface Window {
    google?: any;
    __commUNITELoadGoogleMaps?: Promise<void>;
  }
}

function loadGoogleMapsPlaces() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (window.__commUNITELoadGoogleMaps) {
    return window.__commUNITELoadGoogleMaps;
  }

  return fetch("/api/platform/client-config")
    .then((response) => (response.ok ? response.json() : null))
    .then((payload) => {
      const apiKey = payload?.googleMapsApiKey;
      if (!apiKey) {
        return;
      }

      window.__commUNITELoadGoogleMaps = new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-maps="places"]');
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), { once: true });
          existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.dataset.googleMaps = "places";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Google Maps failed to load."));
        document.head.appendChild(script);
      });

      return window.__commUNITELoadGoogleMaps;
    });
}

function getPlaceComponent(place: any, type: string) {
  return place?.address_components?.find((component: any) => component.types?.includes(type))?.long_name?.toLowerCase?.() ?? "";
}

function isAllowedMountVernonAddress(place: any) {
  const locality =
    getPlaceComponent(place, "sublocality_level_1") ||
    getPlaceComponent(place, "sublocality") ||
    getPlaceComponent(place, "locality") ||
    getPlaceComponent(place, "neighborhood");
  const city = getPlaceComponent(place, "administrative_area_level_2") || getPlaceComponent(place, "locality");
  const postalCode = getPlaceComponent(place, "postal_code");
  const country = getPlaceComponent(place, "country");

  return allowedLocalities.has(locality) && city === allowedCity && postalCode === allowedPostalCode && country === allowedCountry;
}

type DelegateOption = {
  email: string;
  fullName: string;
};

export function MyProfileConsole({
  initialProfile,
  delegateOptions
}: {
  initialProfile: ProfileState;
  delegateOptions: DelegateOption[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setProfile((current) => ({ ...current, avatarImage: result }));
      setMessage("Photo loaded. Save profile to apply it across the app.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function saveProfile() {
    startTransition(() => {
      void (async () => {
        const payload: Record<string, unknown> = {};
        if (profile.nickname !== savedProfile.nickname) payload.nickname = profile.nickname;
        if (profile.bio !== savedProfile.bio) payload.bio = profile.bio;
        if (profile.dateOfBirth !== savedProfile.dateOfBirth) payload.dateOfBirth = profile.dateOfBirth;
        if (profile.physicalAddress !== savedProfile.physicalAddress) payload.physicalAddress = profile.physicalAddress;
        if (profile.mobileNumber !== savedProfile.mobileNumber) payload.mobileNumber = profile.mobileNumber;
        if (profile.status !== savedProfile.status) payload.status = profile.status;
        if (profile.avatarImage !== savedProfile.avatarImage) payload.avatarImage = profile.avatarImage;

        if (Object.keys(payload).length === 0) {
          setMessage("No changes to save.");
          return;
        }

        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const payloadResponse = await response.json().catch(() => null);

        if (!response.ok) {
          setMessage("Unable to save profile right now.");
          return;
        }

        if (payloadResponse?.item) {
          setProfile(payloadResponse.item);
          setSavedProfile(payloadResponse.item);
        } else {
          setSavedProfile((current) => ({ ...current, ...payload }));
        }
        setMessage("Profile updated.");
      })();
    });
  }

  function updatePresenceStatus(status: ProfileState["status"]) {
    setProfile((current) => ({ ...current, status }));
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status
          })
        });

        if (!response.ok) {
          setMessage("Unable to save presence right now.");
          return;
        }

        setSavedProfile((current) => ({ ...current, status }));
        setMessage("Presence updated.");
      })();
    });
  }

  function savePrivateNotes() {
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privateNotes: profile.privateNotes
          })
        });

        if (!response.ok) {
          setMessage("Unable to save notes right now.");
          return;
        }

        setSavedProfile((current) => ({ ...current, privateNotes: profile.privateNotes }));
        setMessage("Private notes updated.");
      })();
    });
  }

  function saveDelegate() {
    if (!profile.delegateEmail) {
      setMessage("Choose a delegate first.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delegateEmail: profile.delegateEmail
          })
        });

        if (!response.ok) {
          setMessage("Unable to save delegate right now.");
          return;
        }

        setSavedProfile((current) => ({ ...current, delegateEmail: profile.delegateEmail }));
        setMessage("Delegate updated and the team has been notified.");
      })();
    });
  }

  function removeDelegate() {
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delegateEmail: null
          })
        });

        if (!response.ok) {
          setMessage("Unable to remove delegate right now.");
          return;
        }

        setProfile((current) => ({ ...current, delegateEmail: "" }));
        setSavedProfile((current) => ({ ...current, delegateEmail: "" }));
        setMessage("Delegate removed and the team has been notified.");
      })();
    });
  }

  const initials = profile.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await loadGoogleMapsPlaces();
        if (cancelled || !window.google?.maps?.places || !addressInputRef.current) {
          return;
        }

        const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          fields: ["formatted_address", "name", "address_components"],
          types: ["address"],
          componentRestrictions: { country: "za" }
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!isAllowedMountVernonAddress(place)) {
            setMessage("Please choose an address in Mount Vernon, Durban, 4094 or Bellair, Durban, 4094.");
            setProfile((current) => ({ ...current, physicalAddress: "" }));
            if (addressInputRef.current) {
              addressInputRef.current.value = "";
            }
            return;
          }

          const nextAddress = place?.formatted_address || place?.name || addressInputRef.current?.value || "";
          setProfile((current) => ({ ...current, physicalAddress: nextAddress }));
          setMessage(null);
        });
      } catch {
        // Fallback to plain text input if Google Maps isn't configured yet.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>Customise and manage your personal details and presence on the platform.</p>
        </div>
      </header>

      {message ? (
        <section className="surface-panel flash-panel flash-panel-success">
          <strong>{message}</strong>
        </section>
      ) : null}

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Profile Identity</h2>
              <p>Your sign-in identity comes from the current account, with additional fields managed inside the platform.</p>
            </div>
          </div>
          <div className="profile-page-grid">
            <div className="profile-page-avatar-column">
              <label className="profile-page-avatar-shell profile-page-avatar-shell-clickable">
                {profile.avatarImage ? (
                  <Image
                    src={profile.avatarImage}
                    alt={`${profile.fullName} avatar`}
                    className="profile-page-avatar-image"
                    width={128}
                    height={128}
                    unoptimized
                  />
                ) : (
                  <div className="profile-page-avatar-placeholder">{initials || "CE"}</div>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
              </label>
              <label className="profile-upload-label profile-upload-label-page profile-upload-label-primary">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                <span>Upload photo</span>
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Full Name</span>
                <input value={profile.fullName} readOnly />
              </label>
              <label className="field">
                <span>Email Address</span>
                <input value={profile.email} readOnly />
              </label>
              <label className="field">
                <span>Nickname</span>
                <input value={profile.nickname} onChange={(event) => setProfile((current) => ({ ...current, nickname: event.target.value }))} />
              </label>
              <label className="field">
                <span>Date Of Birth</span>
                <input type="date" value={profile.dateOfBirth} onChange={(event) => setProfile((current) => ({ ...current, dateOfBirth: event.target.value }))} />
              </label>
              <label className="field">
                <span>Mobile Number</span>
                <input value={profile.mobileNumber} onChange={(event) => setProfile((current) => ({ ...current, mobileNumber: event.target.value }))} />
              </label>
              <label className="field field-wide">
                <span>Physical Address</span>
                <input
                  ref={addressInputRef}
                  value={profile.physicalAddress}
                  onChange={(event) => setProfile((current) => ({ ...current, physicalAddress: event.target.value }))}
                />
                <small>Choose an address from Google suggestions. Only Mount Vernon, Durban, 4094 and Bellair, Durban, 4094 are accepted.</small>
              </label>
              <label className="field field-wide">
                <span>Bio</span>
                <textarea
                  value={profile.bio}
                  onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
                  rows={4}
                  placeholder="Interests, hobbies, family life, whether you're a Tequila or Jagermeister person, beer or wine, and anything else you want the team to know."
                />
              </label>
            </div>
            <div className="action-row">
              <button className="button-primary" type="button" disabled={isPending} onClick={saveProfile}>
                {isPending ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Presence Status</h2>
              <p>Choose the status that should reflect your availability across assignments and the platform.</p>
            </div>
            <span className={`status-chip status-chip-${statuses.find((item) => item.value === profile.status)?.tone ?? "default"}`}>
              {statuses.find((item) => item.value === profile.status)?.label ?? "Active"}
            </span>
          </div>
          <div className="status-button-row status-button-row-spaced">
            {statuses.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`status-choice-button status-choice-button-${item.tone} ${profile.status === item.value ? "status-choice-button-active" : ""}`}
                onClick={() => updatePresenceStatus(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="profile-notes-inline">
            <h2 className="subsection-title">Private Notes</h2>
            <p className="subsection-copy">Keep personal notes, reminders, or useful context here for your own reference.</p>
          </div>
          <label className="field field-wide">
            <textarea
              value={profile.privateNotes}
              onChange={(event) => setProfile((current) => ({ ...current, privateNotes: event.target.value }))}
              rows={6}
              placeholder="Useful private reminders, context, or notes for yourself."
            />
          </label>
          <div className="action-row profile-notes-action-row">
            <button className="button-primary" type="button" disabled={isPending} onClick={savePrivateNotes}>
              {isPending ? "Saving..." : "Save Notes"}
            </button>
          </div>
          <div className="profile-notes-inline profile-delegate-section">
            <h2 className="subsection-title">Delegate</h2>
            <p className="subsection-copy">Choose the teammate who should help cover your work when you are unavailable.</p>
          </div>
          <label className="field field-wide">
            <select
              value={profile.delegateEmail}
              onChange={(event) => setProfile((current) => ({ ...current, delegateEmail: event.target.value }))}
            >
              <option value="">Select a delegate</option>
              {delegateOptions.map((option) => (
                <option key={option.email} value={option.email}>
                  {option.fullName} ({option.email})
                </option>
              ))}
            </select>
          </label>
          <div className="action-row profile-delegate-action-row">
            <button className="button-primary profile-primary-action" type="button" disabled={isPending || !profile.delegateEmail} onClick={saveDelegate}>
              {isPending ? "Saving..." : "Save Delegate"}
            </button>
            <button className="button-secondary" type="button" disabled={isPending} onClick={removeDelegate}>
              Remove Delegate
            </button>
          </div>
        </article>
      </section>
    </>
  );
}
