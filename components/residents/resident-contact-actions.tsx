"use client";

import type { Resident } from "@/types/domain";

type ResidentContactActionsProps = {
  resident: Pick<Resident, "email" | "phone" | "name">;
  adminName: string;
  className?: string;
};

function getPhoneDigits(phone?: string) {
  return (phone ?? "").replace(/\D/g, "");
}

function getIntroMessage(adminName: string) {
  return `Hi, it's ${adminName} from the Unity in Community Group.`;
}

function getSmsHref(phone?: string, adminName?: string) {
  const digits = getPhoneDigits(phone);
  if (!digits || !adminName) {
    return null;
  }

  return `sms:${digits}?body=${encodeURIComponent(getIntroMessage(adminName))}`;
}

function getWhatsappHref(phone?: string, adminName?: string) {
  const digits = getPhoneDigits(phone);
  if (!digits || !adminName) {
    return null;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(getIntroMessage(adminName))}`;
}

function getMailHref(email?: string) {
  if (!email?.trim()) {
    return null;
  }

  return `mailto:${email.trim()}?subject=${encodeURIComponent("Unity in Community")}`;
}

function getCallHref(phone?: string) {
  if (!phone?.trim()) {
    return null;
  }

  return `tel:${phone.trim()}`;
}

export function ResidentContactActions({
  resident,
  adminName,
  className = ""
}: ResidentContactActionsProps) {
  const callHref = getCallHref(resident.phone);
  const smsHref = getSmsHref(resident.phone, adminName);
  const whatsappHref = getWhatsappHref(resident.phone, adminName);
  const mailHref = getMailHref(resident.email);
  const classes = ["resident-contact-actions", className].filter(Boolean).join(" ");

  if (!callHref && !smsHref && !whatsappHref && !mailHref) {
    return null;
  }

  return (
    <div className={classes}>
      {callHref ? (
        <a className="button-secondary resident-contact-action" href={callHref}>
          <span aria-hidden="true">{"\u260E"}</span>
          <span>Call</span>
        </a>
      ) : null}
      {smsHref ? (
        <a className="button-secondary resident-contact-action" href={smsHref}>
          <span aria-hidden="true">{"\u2709"}</span>
          <span>Text</span>
        </a>
      ) : null}
      {whatsappHref ? (
        <a className="button-secondary resident-contact-action" href={whatsappHref} target="_blank" rel="noreferrer">
          <span aria-hidden="true">WA</span>
          <span>WhatsApp</span>
        </a>
      ) : null}
      {mailHref ? (
        <a className="button-secondary resident-contact-action" href={mailHref}>
          <span aria-hidden="true">@</span>
          <span>Email</span>
        </a>
      ) : null}
    </div>
  );
}
