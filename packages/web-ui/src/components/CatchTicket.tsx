"use client";

import type {ReactNode} from "react";
import {CatchBadge} from "./CatchBadge";
import type {CatchFormat} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import {CatchQrCode} from "./CatchQrCode";
import {CatchText} from "./CatchText";
import styles from "./CatchTicket.module.css";

export const catchTicketStatuses = ["valid", "used", "refunded"] as const;
export type CatchTicketStatus = (typeof catchTicketStatuses)[number];

/** One fact on the ticket: When · Tue 3 Nov. */
export interface CatchTicketFact {
  label: ReactNode;
  value: ReactNode;
}

export interface CatchTicketProps {
  title: ReactNode;
  format: CatchFormat;
  organiser?: ReactNode;
  formatLabel?: ReactNode;
  facts: readonly CatchTicketFact[];
  /** The code guests show at the door; drawn as a QR code with the code under it. */
  code?: string;
  guest?: ReactNode;
  status?: CatchTicketStatus;
  /** The door instruction under the code. */
  codeHint?: string;
  /** The QR code's accessible name. */
  codeLabel?: string;
  usedLabel?: string;
  refundedLabel?: string;
}

/**
 * catch.ticket: the guest's ticket. The event in its format colour, the
 * facts in three columns, a perforation and the code to show at the door. A
 * used or refunded ticket fades its code and carries a badge.
 */
export function CatchTicket({
  title, format, organiser, formatLabel, facts, code, guest, status = "valid",
  codeHint = "Show this at the door", codeLabel = "Ticket code", usedLabel = "Used", refundedLabel = "Refunded",
}: CatchTicketProps) {
  const {ground} = useCatch();
  return (
    <section aria-label="Ticket" className={styles.ticket} data-on={ground} data-status={status}>
      <div className={styles.head} data-format={format}>
        <span className={styles.kicker}><span>{organiser}</span><span>{formatLabel}</span></span>
        <CatchText as="h2" variant="display-section">{title}</CatchText>
      </div>
      <div className={styles.facts}>
        {facts.map((fact, index) => (
          <span key={index}>
            <CatchText tone="secondary" variant="label-badge">{fact.label}</CatchText>
            <CatchText variant="label-button">{fact.value}</CatchText>
          </span>
        ))}
      </div>
      {code ? (
        <>
          <div aria-hidden="true" className={styles.perforation} />
          <div className={styles.code}>
            <span className={styles.qr}><CatchQrCode label={codeLabel} value={code} /></span>
            <span className={styles.codeText}>
              {guest ? <CatchText variant="title-row">{guest}</CatchText> : null}
              <CatchText variant="label-code">{code}</CatchText>
              <CatchText tone="secondary" variant="body-small">{codeHint}</CatchText>
            </span>
          </div>
        </>
      ) : null}
      {status !== "valid" ? (
        <span className={styles.status}>
          <CatchBadge label={status === "used" ? usedLabel : refundedLabel} size="md" tone={status === "used" ? "neutral" : "danger"} />
        </span>
      ) : null}
    </section>
  );
}
