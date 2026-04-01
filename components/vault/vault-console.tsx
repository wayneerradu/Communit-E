"use client";

import { useState } from "react";
import { GlobalSearch } from "@/components/shared/global-search";
import type { GlobalSearchItem, VaultAsset } from "@/types/domain";

type VaultConsoleProps = {
  initialAssets: VaultAsset[];
};

const defaultForm = {
  assetName: "",
  category: "Letterhead",
  uploadData: "",
  uploadName: "",
  description: ""
};

export function VaultConsole({ initialAssets }: VaultConsoleProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const searchItems: GlobalSearchItem[] = assets.map((asset) => ({
    id: asset.id,
    title: asset.assetName,
    subtitle: asset.category,
    kind: "vault",
    keywords: [asset.description].filter(Boolean)
  }));

  async function addAsset() {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetName: form.assetName,
          category: form.category,
          description: form.description,
          filePath: form.uploadData
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add vault item.");
      }

      setAssets((current) => [payload.item, ...current]);
      setForm(defaultForm);
      setMessage("Vault item added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add vault item.");
    } finally {
      setIsBusy(false);
    }
  }

  async function onUploadChange(file?: File) {
    if (!file) {
      setForm((current) => ({ ...current, uploadData: "", uploadName: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        uploadData: typeof reader.result === "string" ? reader.result : "",
        uploadName: file.name
      }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Vault</h1>
          <p>Central templates and brand assets in one clean internal resource center.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch
            items={searchItems}
            onItemSelect={(item) => {
              window.setTimeout(() => {
                document.getElementById(`vault-focus-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 80);
            }}
          />
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
              <h2>Vault Intake</h2>
              <p>Add approved assets so everyone works from the same current resources.</p>
            </div>
            <span className="status-chip status-chip-success">Live Intake</span>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Asset Name</span>
              <input value={form.assetName} onChange={(event) => setForm((current) => ({ ...current, assetName: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Category</span>
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                <option value="Letterhead">Letterhead</option>
                <option value="Logo (High Res)">Logo (High Res)</option>
                <option value="Logo (Low Res)">Logo (Low Res)</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>Upload Asset (Single File)</span>
              <input
                type="file"
                onChange={(event) => void onUploadChange(event.target.files?.[0])}
              />
              {form.uploadName ? <small className="form-help">{form.uploadName}</small> : null}
            </label>
            <label className="field field-full">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={8}
              />
            </label>
            <div className="dashboard-actions">
              <button className="button-primary" type="button" onClick={addAsset} disabled={isBusy}>
                {isBusy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Available Assets</h2>
              <p>Approved brand resources are available to everyone.</p>
            </div>
            <span className="status-chip status-chip-default">{assets.length} items</span>
          </div>

          <div className="dashboard-stack">
            {assets.map((asset) => (
              <article key={asset.id} id={`vault-focus-${asset.id}`} className="dashboard-minute-card">
                <div className="panel-head">
                  <strong>{asset.assetName}</strong>
                  <span className="status-chip status-chip-default">{asset.category}</span>
                </div>
                <p>{asset.description}</p>
                <div className="meta-row">
                  <span className="tag">Accessible to all</span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
