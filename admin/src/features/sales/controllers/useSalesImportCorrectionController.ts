import {useQueries, useQuery} from "@tanstack/react-query";
import {useEffect, useState} from "react";
import {listSalesImportHosts, previewSalesImportCompensation} from "../api/salesRepository";
import type {SalesImportCompensationInput} from "../api/salesTypes";
import type {SalesImportGroup} from "./salesImports";

const hostKey = (host: SalesImportCompensationInput) => `${host.importId}|${host.organizerId}`;

/** Corrects one host of an import. Its hosts come from the import, and the server plans each correction. */
export function useSalesImportCorrectionController({group, applyCorrection}: {
  group: SalesImportGroup;
  applyCorrection: (input: SalesImportCompensationInput & {previewHash: string; reason: string}) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const batches = useQueries({queries: group.batches.map(({importId}) => ({
    queryKey: ["sales", "import-hosts", importId],
    queryFn: () => listSalesImportHosts(importId),
  }))});
  const hosts = batches.flatMap((batch) => batch.data?.rows ?? []);
  const host = hosts.find((item) => hostKey(item) === selected) ?? null;
  const plan = useQuery({
    enabled: host !== null,
    gcTime: 0,
    queryKey: ["sales-import-correction", selected],
    queryFn: () => previewSalesImportCompensation({importId: host?.importId ?? "", organizerId: host?.organizerId ?? ""}),
    retry: false,
  });
  const canApply = plan.data !== undefined && plan.data.mode !== "blocked" && !plan.data.blockers.length &&
    !plan.data.alreadyCompensated;

  useEffect(() => setReviewed(false), [selected, plan.data?.previewHash, reason]);

  const apply = async (): Promise<boolean> => {
    if (!host || !plan.data || !canApply || !reviewed || !reason.trim()) return false;
    const saved = await applyCorrection({importId: host.importId, organizerId: host.organizerId,
      previewHash: plan.data.previewHash, reason: reason.trim()});
    // A failed attempt may have committed remotely. Plan again before retrying.
    if (!saved) {
      setReviewed(false);
      void plan.refetch();
    }
    return saved;
  };

  return {
    hosts, hostKey, isLoadingHosts: batches.some((batch) => batch.isPending),
    hostsFailed: batches.some((batch) => batch.isError),
    retryHosts: () => batches.forEach((batch) => void batch.refetch()),
    selected, setSelected, host, plan, canApply, reason, setReason, reviewed, setReviewed, apply,
  };
}
