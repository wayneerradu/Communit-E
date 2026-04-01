"use client";

import { useMemo, useState, useTransition } from "react";
import { faultCategoryOptions, getFaultSubCategoryOptions } from "@/lib/fault-taxonomy";
import type { PlatformSettings } from "@/types/domain";

type Contact = {
  id: string;
  name: string;
  email: string;
  active: boolean;
};

type SubCategoryOption = {
  optionId: string;
  key: string;
  legacyKey: string;
  label: string;
};

type Props = {
  initialFaultEscalation: PlatformSettings["faultEscalation"];
};

function toId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSubCategoryList(): SubCategoryOption[] {
  return faultCategoryOptions.flatMap((category) =>
    getFaultSubCategoryOptions(category.value).map((subCategory) => ({
      optionId: `${category.value}::${subCategory}`,
      key: `${category.value}::${subCategory}`,
      legacyKey: subCategory,
      label: `${category.label} • ${subCategory}`
    }))
  );
}

function ContactEditor({
  title,
  contacts,
  onChange
}: {
  title: string;
  contacts: Contact[];
  onChange: (next: Contact[]) => void;
}) {
  function updateRow(id: string, field: keyof Contact, value: string | boolean) {
    onChange(
      contacts.map((contact) =>
        contact.id === id
          ? {
              ...contact,
              [field]: value
            }
          : contact
      )
    );
  }

  function removeRow(id: string) {
    onChange(contacts.filter((contact) => contact.id !== id));
  }

  function addRow() {
    onChange([...contacts, { id: toId("fault-contact"), name: "", email: "", active: true }]);
  }

  return (
    <article className="surface-panel">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p>Keep this list current so escalation emails always target the correct people.</p>
        </div>
        <button type="button" className="button-secondary" onClick={addRow}>
          Add Contact
        </button>
      </div>

      <div className="dashboard-stack">
        {contacts.length === 0 ? (
          <article className="dashboard-today-card">
            <strong>No contacts added yet.</strong>
            <p>Add one or more contacts to activate this escalation group.</p>
          </article>
        ) : (
          contacts.map((contact) => (
            <article key={contact.id} className="dashboard-queue-card">
              <div className="form-grid">
                <label className="field">
                  <span>Full Name</span>
                  <input
                    value={contact.name}
                    onChange={(event) => updateRow(contact.id, "name", event.target.value)}
                    placeholder="Name and surname"
                  />
                </label>
                <label className="field">
                  <span>Email Address</span>
                  <input
                    value={contact.email}
                    onChange={(event) => updateRow(contact.id, "email", event.target.value)}
                    placeholder="name@department.gov.za"
                  />
                </label>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={contact.active}
                    onChange={(event) => updateRow(contact.id, "active", event.target.checked)}
                  />
                  <span>Active</span>
                </label>
              </div>
              <div className="action-row">
                <button type="button" className="button-secondary" onClick={() => removeRow(contact.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </article>
  );
}

export function FaultSettingsConsole({ initialFaultEscalation }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLegacyImporting, setIsLegacyImporting] = useState(false);
  const [isLegacyPreviewing, setIsLegacyPreviewing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "warning">("success");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<
    Array<{
      row: number;
      key: string;
      category: string;
      subCategory: string;
      escalateCount: number;
      escalatePlusCount: number;
      escalatePlusPlusCount: number;
    }>
  >([]);
  const [legacyImportFile, setLegacyImportFile] = useState<File | null>(null);
  const [legacyWarnings, setLegacyWarnings] = useState<string[]>([]);
  const [legacyPreviewRows, setLegacyPreviewRows] = useState<
    Array<{
      row: number;
      reference: string;
      title: string;
      category: string;
      subCategory?: string;
      status: string;
      createdAt: string;
      locationText: string;
      reporterEmail: string;
      mediaCount: number;
    }>
  >([]);
  const [initialContacts, setInitialContacts] = useState<Contact[]>(
    initialFaultEscalation.initialContacts.map((contact) => ({ ...contact }))
  );
  const [plusBySubCategory, setPlusBySubCategory] = useState<Record<string, Contact[]>>(
    initialFaultEscalation.escalatePlusBySubCategory
  );
  const [plusPlusBySubCategory, setPlusPlusBySubCategory] = useState<Record<string, Contact[]>>(
    initialFaultEscalation.escalatePlusPlusBySubCategory
  );

  const allSubCategories = useMemo(buildSubCategoryList, []);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(allSubCategories[0]?.key ?? "");
  const selectedOption = allSubCategories.find((item) => item.key === selectedSubCategory);
  const selectedPlusContacts =
    plusBySubCategory[selectedSubCategory] ??
    (selectedOption ? plusBySubCategory[selectedOption.legacyKey] ?? [] : []);
  const selectedPlusPlusContacts =
    plusPlusBySubCategory[selectedSubCategory] ??
    (selectedOption ? plusPlusBySubCategory[selectedOption.legacyKey] ?? [] : []);

  function setSelectedPlusContacts(next: Contact[]) {
    setPlusBySubCategory((current) => ({ ...current, [selectedSubCategory]: next }));
  }

  function setSelectedPlusPlusContacts(next: Contact[]) {
    setPlusPlusBySubCategory((current) => ({ ...current, [selectedSubCategory]: next }));
  }

  function saveSettings() {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/super-admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              faultEscalation: {
                initialContacts,
                escalatePlusBySubCategory: plusBySubCategory,
                escalatePlusPlusBySubCategory: plusPlusBySubCategory
              }
            })
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error ?? "Unable to save fault escalation settings.");
          }
          setTone("success");
          setMessage("Fault escalation settings saved.");
          setImportWarnings([]);
        } catch (error) {
          setTone("warning");
          setMessage(error instanceof Error ? error.message : "Unable to save fault escalation settings.");
        }
      })();
    });
  }

  function clearEscalationSettings() {
    if (!window.confirm("This will delete all escalation email mappings. Continue?")) {
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/super-admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              faultEscalation: {
                initialContacts: [],
                escalatePlusBySubCategory: {},
                escalatePlusPlusBySubCategory: {}
              }
            })
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error ?? "Unable to clear fault escalation settings.");
          }

          setInitialContacts([]);
          setPlusBySubCategory({});
          setPlusPlusBySubCategory({});
          setImportWarnings([]);
          setTone("success");
          setMessage("All escalation email mappings were cleared.");
        } catch (error) {
          setTone("warning");
          setMessage(error instanceof Error ? error.message : "Unable to clear fault escalation settings.");
        }
      })();
    });
  }

  async function importTemplate() {
    if (!importFile) {
      setTone("warning");
      setMessage("Choose an Excel template file before importing.");
      return;
    }
    if (!window.confirm("Import will replace all existing escalation mappings with the template values. Continue?")) {
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/faults/settings/import-template", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to import escalation template.");
      }

      const settingsResponse = await fetch("/api/super-admin/settings", { method: "GET" });
      const settingsPayload = await settingsResponse.json();
      if (!settingsResponse.ok) {
        throw new Error(settingsPayload.error ?? "Template imported but settings refresh failed.");
      }

      const nextFaultEscalation = settingsPayload.item.faultEscalation as PlatformSettings["faultEscalation"];
      setInitialContacts(nextFaultEscalation.initialContacts ?? []);
      setPlusBySubCategory(nextFaultEscalation.escalatePlusBySubCategory ?? {});
      setPlusPlusBySubCategory(nextFaultEscalation.escalatePlusPlusBySubCategory ?? {});
      setImportWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      setTone("success");
      setMessage(
        `Template imported: ${payload.importedRows} rows, ${payload.initialContactCount} Escalate contacts, ${payload.escalatePlusCount} Escalate+ mappings, ${payload.escalatePlusPlusCount} Escalate++ mappings.`
      );
    } catch (error) {
      setTone("warning");
      setMessage(error instanceof Error ? error.message : "Unable to import escalation template.");
    } finally {
      setIsImporting(false);
    }
  }

  async function previewTemplate() {
    if (!importFile) {
      setTone("warning");
      setMessage("Choose an Excel template file before previewing.");
      return;
    }

    setIsPreviewing(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const response = await fetch("/api/faults/settings/import-template/preview", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to preview escalation template.");
      }

      setPreviewRows(Array.isArray(payload.previewRows) ? payload.previewRows : []);
      setImportWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      setTone("success");
      setMessage(
        `Preview complete: ${payload.importedRows} rows, ${payload.initialContactCount} Escalate contacts, ${payload.escalatePlusCount} Escalate+ mappings, ${payload.escalatePlusPlusCount} Escalate++ mappings.`
      );
    } catch (error) {
      setTone("warning");
      setMessage(error instanceof Error ? error.message : "Unable to preview escalation template.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function previewLegacyFaults() {
    if (!legacyImportFile) {
      setTone("warning");
      setMessage("Choose a legacy faults CSV before previewing.");
      return;
    }

    setIsLegacyPreviewing(true);
    try {
      const formData = new FormData();
      formData.append("file", legacyImportFile);
      const response = await fetch("/api/faults/settings/import-legacy/preview", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to preview legacy faults import.");
      }
      setLegacyWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      setLegacyPreviewRows(Array.isArray(payload.previewRows) ? payload.previewRows : []);
      setTone("success");
      setMessage(`Legacy faults preview complete: ${payload.totalDrafts} import-ready records.`);
    } catch (error) {
      setTone("warning");
      setMessage(error instanceof Error ? error.message : "Unable to preview legacy faults import.");
    } finally {
      setIsLegacyPreviewing(false);
    }
  }

  async function importLegacyFaults() {
    if (!legacyImportFile) {
      setTone("warning");
      setMessage("Choose a legacy faults CSV before importing.");
      return;
    }
    if (!window.confirm("Import legacy faults now? Resolved records will be mapped to Archived.")) {
      return;
    }

    setIsLegacyImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", legacyImportFile);
      formData.append("replaceExisting", "false");
      const response = await fetch("/api/faults/settings/import-legacy", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to import legacy faults.");
      }
      setLegacyWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      setTone("success");
      setMessage(
        `Legacy faults imported: ${payload.importedCount} added, ${payload.skippedExisting} skipped existing references.`
      );
    } catch (error) {
      setTone("warning");
      setMessage(error instanceof Error ? error.message : "Unable to import legacy faults.");
    } finally {
      setIsLegacyImporting(false);
    }
  }

  return (
    <>
      {message ? (
        <section className={`flash-panel flash-panel-${tone}`}>
          <strong>{message}</strong>
        </section>
      ) : null}

      <section className="dashboard-feature-grid">
        <ContactEditor title="Escalation Level 1 Contacts" contacts={initialContacts} onChange={setInitialContacts} />
      </section>

      <section className="surface-panel clean-marine-panel">
        <div className="section-header">
          <div>
            <h2>Escalate+ And Escalate++ Contacts By Subcategory</h2>
            <p>Select a subcategory and maintain both escalation groups as people change.</p>
          </div>
          <label className="field">
            <span>Fault Subcategory</span>
            <select
              className="native-select"
              value={selectedSubCategory}
              onChange={(event) => setSelectedSubCategory(event.target.value)}
            >
              {allSubCategories.map((item) => (
                <option key={item.optionId} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="surface-panel clean-marine-panel">
        <div className="section-header">
          <div>
            <h2>Bulk Import Tool</h2>
            <p>Validate and import from your approved template. Existing mappings are replaced automatically.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Upload Escalation Template (.xlsx/.xls)</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="action-row">
          <button type="button" className="button-secondary" onClick={previewTemplate} disabled={isPreviewing || isImporting}>
            {isPreviewing ? "Previewing..." : "Dry-Run Preview"}
          </button>
          <button type="button" className="button-secondary" onClick={importTemplate} disabled={isImporting}>
            {isImporting ? "Importing..." : "Validate And Import Template"}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => window.open("/api/faults/settings/export-template", "_blank", "noopener,noreferrer")}
            disabled={isPending || isImporting || isPreviewing}
          >
            Download Rollback Backup
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={clearEscalationSettings}
            disabled={isPending || isImporting || isPreviewing}
          >
            Clear All Escalation Emails
          </button>
        </div>
        {importWarnings.length > 0 ? (
          <article className="dashboard-today-card">
            <strong>Import warnings</strong>
            <p>{importWarnings.slice(0, 6).join(" | ")}</p>
          </article>
        ) : null}
        {previewRows.length > 0 ? (
          <article className="dashboard-today-card">
            <strong>Preview sample (first {previewRows.length} rows)</strong>
            <p>
              {previewRows
                .slice(0, 6)
                .map(
                  (item) =>
                    `${item.category} • ${item.subCategory} (Escalate ${item.escalateCount}, + ${item.escalatePlusCount}, ++ ${item.escalatePlusPlusCount})`
                )
                .join(" | ")}
            </p>
          </article>
        ) : null}
      </section>

      <section className="dashboard-feature-grid">
        <ContactEditor title="Escalate+ Contacts" contacts={selectedPlusContacts} onChange={setSelectedPlusContacts} />
        <ContactEditor
          title="Escalate++ Contacts"
          contacts={selectedPlusPlusContacts}
          onChange={setSelectedPlusPlusContacts}
        />
      </section>

      <section className="surface-panel clean-marine-panel">
        <div className="section-header">
          <div>
            <h2>Legacy Faults Import Tool</h2>
            <p>
              Import old-system faults. The original fault logged date is preserved as the escalation anchor date, and
              resolved records are mapped to archived.
            </p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Upload Legacy Faults CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={(event) => setLegacyImportFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="action-row">
          <button
            type="button"
            className="button-secondary"
            onClick={previewLegacyFaults}
            disabled={isLegacyPreviewing || isLegacyImporting}
          >
            {isLegacyPreviewing ? "Previewing..." : "Dry-Run Legacy Preview"}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={importLegacyFaults}
            disabled={isLegacyImporting || isLegacyPreviewing}
          >
            {isLegacyImporting ? "Importing..." : "Import Legacy Faults"}
          </button>
        </div>
        {legacyWarnings.length > 0 ? (
          <article className="dashboard-today-card">
            <strong>Legacy import warnings</strong>
            <p>{legacyWarnings.slice(0, 6).join(" | ")}</p>
          </article>
        ) : null}
        {legacyPreviewRows.length > 0 ? (
          <article className="dashboard-today-card">
            <strong>Legacy preview sample (first {legacyPreviewRows.length} rows)</strong>
            <p>
              {legacyPreviewRows
                .slice(0, 4)
                .map(
                  (item) =>
                    `${item.reference} | ${item.status} | ${item.category} • ${item.subCategory ?? "Unspecified"} | ${item.createdAt.slice(0, 10)}`
                )
                .join(" | ")}
            </p>
          </article>
        ) : null}
      </section>

      <section className="surface-panel clean-marine-panel">
        <div className="action-row">
          <button
            type="button"
            className="button-primary"
            onClick={saveSettings}
            disabled={isPending || isImporting || isLegacyImporting}
          >
            {isPending ? "Saving..." : "Save Fault Settings"}
          </button>
        </div>
      </section>
    </>
  );
}
