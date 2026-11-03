import {useQuery} from "@tanstack/react-query";
import {useEffect, useMemo, useRef, useState} from "react";
import {previewSalesImport} from "../api/salesRepository";
import type {SalesImportPacket} from "../api/salesTypes";
import {parseSalesCsv, salesImportPacket, type SalesCsvMapping} from "../ui/salesCsv";
import {salesImportName, salesImportSourceId} from "./salesImports";

export const salesImportBatchSize = 25;

const unmapped: SalesCsvMapping = {organizerId: -1, name: -1, researchStatus: -1, summary: -1};

function guessMapping(headers: string[]): SalesCsvMapping {
  const find = (names: string[]) => headers.findIndex((header) =>
    names.includes(header.trim().toLowerCase().replaceAll(/[^a-z0-9]/gu, "")));
  return {organizerId: find(["organizerid", "hostid", "catchhostid", "id"]), name: find(["name", "hostname", "organizername"]),
    researchStatus: find(["researchstatus", "status"]), summary: find(["summary", "notes"])};
}

/** The CSV review sheet: one file, its column choices, and a server preview of the batch on show. */
export function useSalesImportSheetController({applyImport}: {
  applyImport: (packet: SalesImportPacket, previewHash: string) => Promise<boolean>;
}) {
  const [rows, setRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [mapping, setMapping] = useState<SalesCsvMapping>(unmapped);
  const [batch, setBatch] = useState(0);
  const [applied, setApplied] = useState<number[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [fileError, setFileError] = useState("");
  const [showAllRows, setShowAllRows] = useState(false);
  const latestFile = useRef(0);

  const rowCount = Math.max(0, rows.length - 1);
  const batchCount = Math.ceil(rowCount / salesImportBatchSize);
  const sourceId = salesImportSourceId(name);
  const batchApplied = applied.includes(batch);

  const chooseFile = async (file: File | null) => {
    latestFile.current += 1;
    const version = latestFile.current;
    setRows([]); setApplied([]); setFileError(""); setFileName(""); setContentHash(""); setBatch(0); setReviewed(false);
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setFileError("CSV must be at most 1 MB. Split this file into smaller uploads.");
      return;
    }
    try {
      const parsed = parseSalesCsv(await file.text());
      const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash = Array.from(new Uint8Array(bytes), (part) => part.toString(16).padStart(2, "0")).join("");
      if (version !== latestFile.current) return;
      setRows(parsed); setFileName(file.name); setContentHash(hash); setMapping(guessMapping(parsed[0]));
      setName((current) => current || salesImportName(file.name.replace(/\.[^.]+$/u, "")));
    } catch (cause) {
      if (version === latestFile.current) setFileError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  // A blank host name stops the batch before the server sees it.
  const {packet, packetError} = useMemo((): {packet: SalesImportPacket | null; packetError: string} => {
    if (!rows.length || batchApplied) return {packet: null, packetError: ""};
    if (mapping.name < 0) return {packet: null, packetError: ""};
    if (!sourceId) return {packet: null, packetError: "Give this import a name."};
    try {
      return {packet: salesImportPacket(rows, mapping, sourceId, contentHash, batch), packetError: ""};
    } catch (cause) {
      return {packet: null, packetError: cause instanceof Error ? cause.message : String(cause)};
    }
  }, [batch, batchApplied, contentHash, mapping, rows, sourceId]);

  const preview = useQuery({
    enabled: packet !== null,
    gcTime: 0,
    queryKey: ["sales-import-preview", contentHash, sourceId, mapping, batch],
    queryFn: () => previewSalesImport(packet as SalesImportPacket),
    retry: false,
  });

  // Anything that changes what would be applied needs reviewing again.
  const previewHash = preview.data?.previewHash;
  useEffect(() => setReviewed(false), [previewHash, batch]);

  const apply = async () => {
    if (!packet || !preview.data || !reviewed) return;
    const saved = await applyImport(packet, preview.data.previewHash);
    if (saved) {
      setApplied((current) => [...current, batch]);
      if (batch + 1 < batchCount) setBatch(batch + 1);
    } else {
      // A failed attempt may have committed remotely, so read the batch again before retrying.
      setReviewed(false);
      void preview.refetch();
    }
  };

  return {
    fileName, fileError, name, setName, rows, rowCount, batchCount, batch, setBatch, applied, batchApplied,
    mapping, setMapping: (next: Partial<SalesCsvMapping>) => setMapping((current) => ({...current, ...next})),
    packet, packetError, preview, reviewed, setReviewed, showAllRows, setShowAllRows, chooseFile, apply,
    hasApplied: applied.length > 0,
  };
}
