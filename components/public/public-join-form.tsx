"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-client";

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

declare global {
  interface Window {
    google?: any;
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId?: string) => void;
      reset: (widgetId?: string) => void;
    };
    __commUNITELoadTurnstile?: Promise<void>;
  }
}

type PublicClientConfig = {
  googleMapsApiKey?: string;
  turnstileEnabled?: boolean;
  turnstileSiteKey?: string;
  minimumCompletionSeconds?: number;
};

async function loadPublicClientConfig(): Promise<PublicClientConfig> {
  const response = await fetch("/api/public/config");
  if (!response.ok) {
    return {};
  }

  return (await response.json()) as PublicClientConfig;
}

function loadTurnstile(siteKey?: string) {
  if (typeof window === "undefined" || !siteKey) {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (window.__commUNITELoadTurnstile) {
    return window.__commUNITELoadTurnstile;
  }

  window.__commUNITELoadTurnstile = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile="widget"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "widget";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load."));
    document.head.appendChild(script);
  });

  return window.__commUNITELoadTurnstile;
}

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

  return allowedLocalities.has(locality) && city === allowedCity && postalCode === allowedPostalCode && country === allowedCountry;
}

function isAllowedResidentAddressText(value: string) {
  const normalised = value.toLowerCase();
  const hasLocality = Array.from(allowedLocalities).some((locality) => normalised.includes(locality));
  return hasLocality && normalised.includes(allowedCity) && normalised.includes(allowedPostalCode);
}

const defaultForm = {
  fullName: "",
  email: "",
  phone: "",
  securityCompany: "Blue Security",
  otherSecurityCompany: "",
  physicalAddress: "",
  consentAccepted: false,
  startedAt: "",
  turnstileToken: "",
  website: ""
};

export function PublicJoinForm() {
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "warning">("warning");
  const [isBusy, setIsBusy] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const normalisedPhone = `+27${form.phone.replace(/\D/g, "").slice(0, 9)}`;
  const resolvedSecurityCompany =
    form.securityCompany === "Other" ? form.otherSecurityCompany.trim() : form.securityCompany;
  const canSubmit =
    form.fullName.trim().length >= 3 &&
    form.email.trim().length > 0 &&
    form.phone.replace(/\D/g, "").length === 9 &&
    form.physicalAddress.trim().length >= 3 &&
    resolvedSecurityCompany.length > 0 &&
    form.consentAccepted &&
    (!turnstileEnabled || form.turnstileToken.length > 0);

  useEffect(() => {
    setForm((current) => ({ ...current, startedAt: new Date().toISOString() }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const clientConfig = await loadPublicClientConfig();
        if (cancelled) {
          return;
        }

        setTurnstileEnabled(Boolean(clientConfig.turnstileEnabled && clientConfig.turnstileSiteKey));
        setTurnstileSiteKey(clientConfig.turnstileSiteKey ?? "");

        await loadGoogleMaps(clientConfig.googleMapsApiKey ?? "", ["places"]);
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
          if (!isAllowedResidentPlace(place)) {
            setAddressValidated(false);
            setAddressMessage("Please choose an address in Mount Vernon, Bellair, or Hillary, Durban, 4094.");
            setForm((current) => ({ ...current, physicalAddress: "" }));
            if (addressInputRef.current) {
              addressInputRef.current.value = "";
            }
            return;
          }

          const nextAddress = place?.formatted_address || place?.name || addressInputRef.current?.value || "";
          setForm((current) => ({ ...current, physicalAddress: nextAddress }));
          setAddressValidated(true);
          setAddressMessage("Address validated for the approved area.");
        });
      } catch {
        // Fall back to text validation if maps isn't configured yet.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!turnstileEnabled || !turnstileSiteKey || !turnstileContainerRef.current) {
        return;
      }

      try {
        await loadTurnstile(turnstileSiteKey);
        if (cancelled || !window.turnstile || !turnstileContainerRef.current || turnstileWidgetIdRef.current) {
          return;
        }

        const widgetId = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => {
            setForm((current) => ({ ...current, turnstileToken: token }));
            setTurnstileReady(true);
          },
          "expired-callback": () => {
            setForm((current) => ({ ...current, turnstileToken: "" }));
            setTurnstileReady(false);
          },
          "error-callback": () => {
            setForm((current) => ({ ...current, turnstileToken: "" }));
            setTurnstileReady(false);
          }
        });

        turnstileWidgetIdRef.current = widgetId;
      } catch {
        setTurnstileReady(false);
      }
    })();

    return () => {
      cancelled = true;
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [turnstileEnabled, turnstileSiteKey]);

  async function handleSubmit() {
    if (!canSubmit) {
      setMessageTone("warning");
      setMessage("Please complete every required field and accept the declaration before submitting.");
      return;
    }

    const addressPassesRule = addressValidated || isAllowedResidentAddressText(form.physicalAddress.trim());
    if (!addressPassesRule) {
      setMessageTone("warning");
      setMessage("Please enter a valid address in Mount Vernon, Bellair, or Hillary, Durban, 4094.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/public/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: normalisedPhone,
          securityCompany: resolvedSecurityCompany,
          physicalAddress: form.physicalAddress.trim(),
          consentAccepted: form.consentAccepted,
          startedAt: form.startedAt,
          turnstileToken: form.turnstileToken,
          website: form.website
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to submit your application right now.");
      }

      setIsSubmitted(true);
      setMessageTone("success");
      setMessage(
        payload.successMessage ??
          "Thank you for your application, we have received your application and it is pending review. One of our Friendly Admins will verify your details before adding you to the Community and Utilities Group. In the interim please check out our website on https://www.unityincommunity.org.za."
      );
    } catch (error) {
      setMessageTone("warning");
      setMessage(error instanceof Error ? error.message : "Unable to submit your application right now.");
    } finally {
      setIsBusy(false);
    }
  }

  if (isSubmitted) {
    return (
      <section className="public-join-shell">
        <article className="public-join-card">
          <span className="public-join-eyebrow">Application Received</span>
          <h1>Thank you</h1>
          <p>{message}</p>
          <div className="public-join-success">
            <strong>What happens next?</strong>
            <p>A community admin will review your details, verify your address, and contact you if anything else is needed before adding you.</p>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="public-join-shell">
      <article className="public-join-card">
        <h1>Join the Community WhatsApp Group</h1>
        <p>Submit your details for community verification and contact purposes. An admin will review your application before adding you.</p>

        {message ? (
          <section className={`flash-panel ${messageTone === "success" ? "flash-panel-success" : "flash-panel-warning"}`}>
            <strong>{message}</strong>
          </section>
        ) : null}

        {addressMessage ? (
          <section className={`flash-panel ${addressValidated ? "flash-panel-success" : "flash-panel-warning"}`}>
            <strong>{addressMessage}</strong>
          </section>
        ) : null}

        <div className="form-grid form-grid-spaced">
          <label className="field field-wide">
            <span>Full Name *</span>
            <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
          </label>
          <label className="field field-wide">
            <span>Email Address *</span>
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
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
              />
            </div>
            <small>Enter the mobile number without the leading 0. It will be saved as {normalisedPhone}.</small>
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
            />
          </label>
          <label className="field field-wide public-join-honeypot" aria-hidden="true">
            <span>Website</span>
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
            />
          </label>
        </div>

        <div className="public-join-consent">
          <label className="public-join-consent-row">
            <input
              type="checkbox"
              checked={form.consentAccepted}
              onChange={(event) => setForm((current) => ({ ...current, consentAccepted: event.target.checked }))}
            />
            <span>
              By submitting this information I understand the POPI Act and the need to ensure privacy on the group, WhatsApp administrators cannot be held liable for privacy violations by members, and I have read and fully understand the rules of the WhatsApp group and will abide by them.
            </span>
          </label>
        </div>

        {turnstileEnabled ? (
          <div className="public-join-consent">
            <strong>Anti-bot verification</strong>
            <div ref={turnstileContainerRef} className="public-join-turnstile" />
            {!turnstileReady ? <small>Please complete the anti-bot verification before submitting.</small> : null}
          </div>
        ) : null}

        <p className="form-required-note">Fields marked with * are required before your application can be submitted.</p>

        <div className="action-row">
          <button className="button-primary" type="button" disabled={isBusy || !canSubmit} onClick={handleSubmit}>
            {isBusy ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </article>
    </section>
  );
}
