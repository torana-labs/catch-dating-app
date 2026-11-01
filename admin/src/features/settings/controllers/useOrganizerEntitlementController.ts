import {useMutation} from "@tanstack/react-query";
import {useCallback, useRef, useState} from "react";
import type {AdminGrantOrganizerEntitlementCallablePayload} from
  "../../../generated/contracts/adminGrantOrganizerEntitlementCallablePayload";
import type {AdminRevokeOrganizerEntitlementGrantCallablePayload} from
  "../../../generated/contracts/adminRevokeOrganizerEntitlementGrantCallablePayload";
import type {OrganizerEntitlementCallableResponse} from
  "../../../generated/contracts/organizerEntitlementCallableResponse";
import {useAdminPendingOperationGuard} from
  "../../../shared/pendingOperation";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  grantOrganizerEntitlement,
  loadOrganizerEntitlement,
  revokeOrganizerEntitlementGrant,
} from "../api/grantedPlansRepository";

export type OrganizerEntitlementSku =
  AdminGrantOrganizerEntitlementCallablePayload["sku"];
export type OrganizerEntitlementUnit =
  AdminGrantOrganizerEntitlementCallablePayload["unit"];
export type OrganizerEntitlementSource =
  AdminGrantOrganizerEntitlementCallablePayload["source"];

export interface OrganizerEntitlementGrantForm {
  sku: OrganizerEntitlementSku;
  unit: OrganizerEntitlementUnit;
  quantity: string;
  validFrom: string;
  validUntil: string;
  source: OrganizerEntitlementSource;
  receiptRef: string;
  note: string;
}

export interface OrganizerEntitlementController {
  organizerId: string;
  entitlement: OrganizerEntitlementCallableResponse | null;
  grantForm: OrganizerEntitlementGrantForm;
  revokeTargetGrantId: string | null;
  revokeReason: string;
  pendingGrant: AdminGrantOrganizerEntitlementCallablePayload | null;
  pendingRevoke: AdminRevokeOrganizerEntitlementGrantCallablePayload | null;
  isLoading: boolean;
  isGranting: boolean;
  isRevoking: boolean;
  grantDisabledReason: string | null;
  revokeDisabledReason: string | null;
  setOrganizerId: (value: string) => void;
  setGrantField: <K extends keyof OrganizerEntitlementGrantForm>(
    key: K,
    value: OrganizerEntitlementGrantForm[K]
  ) => void;
  setRevokeTargetGrantId: (value: string | null) => void;
  setRevokeReason: (value: string) => void;
  load: () => Promise<boolean>;
  grant: () => Promise<boolean>;
  revoke: () => Promise<boolean>;
}

const defaultGrantForm: OrganizerEntitlementGrantForm = {
  sku: "wedding_pro",
  unit: "program",
  quantity: "1",
  validFrom: "",
  validUntil: "",
  source: "manualInvoice",
  receiptRef: "",
  note: "",
};

const pendingGrantKey = "catch:finance:entitlement:grant:v1";
const pendingRevokeKey = "catch:finance:entitlement:revoke:v1";

const organizerEntitlementKeys = {
  load: () =>
    [...adminQueryKeys.all, "finance", "organizer-entitlement-load"] as const,
  grant: () =>
    [...adminQueryKeys.all, "finance", "organizer-entitlement-grant"] as const,
  revoke: () =>
    [...adminQueryKeys.all, "finance", "organizer-entitlement-revoke"] as const,
};

export function useOrganizerEntitlementController({
  actorUid,
  onError,
  onNotice,
}: {
  actorUid: string;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}): OrganizerEntitlementController {
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const loadMutation = useMutation({
    mutationKey: organizerEntitlementKeys.load(),
    mutationFn: loadOrganizerEntitlement,
  });
  const grantMutation = useMutation({
    mutationKey: organizerEntitlementKeys.grant(),
    mutationFn: grantOrganizerEntitlement,
  });
  const revokeMutation = useMutation({
    mutationKey: organizerEntitlementKeys.revoke(),
    mutationFn: revokeOrganizerEntitlementGrant,
  });
  const [organizerId, setOrganizerIdState] = useState("");
  const [entitlement, setEntitlement] =
    useState<OrganizerEntitlementCallableResponse | null>(null);
  const [grantForm, setGrantForm] = useState(defaultGrantForm);
  const [revokeTargetGrantId, setRevokeTargetGrantId] =
    useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const grantKey = `${pendingGrantKey}:${actorUid}`;
  const revokeKey = `${pendingRevokeKey}:${actorUid}`;
  const [frozenGrant, setFrozenGrant] = useState<
    AdminGrantOrganizerEntitlementCallablePayload | null>(() =>
    readPending<AdminGrantOrganizerEntitlementCallablePayload>(
      grantKey, actorUid));
  const [frozenRevoke, setFrozenRevoke] = useState<
    AdminRevokeOrganizerEntitlementGrantCallablePayload | null>(() =>
    readPending<AdminRevokeOrganizerEntitlementGrantCallablePayload>(
      revokeKey, actorUid));
  const frozenGrantRef = useRef(frozenGrant);
  const frozenRevokeRef = useRef(frozenRevoke);
  const ledgerRequestGeneration = useRef(0);

  const clearGrant = useCallback((expectedOperationId: string) => {
    if (frozenGrantRef.current?.operationId !== expectedOperationId) return;
    if (readPending<AdminGrantOrganizerEntitlementCallablePayload>(
      grantKey, actorUid)?.operationId !== expectedOperationId) return;
    clearPending(grantKey);
    frozenGrantRef.current = null;
    setFrozenGrant(null);
  }, [actorUid, grantKey]);
  const clearRevoke = useCallback((expectedOperationId: string) => {
    if (frozenRevokeRef.current?.operationId !== expectedOperationId) return;
    if (readPending<AdminRevokeOrganizerEntitlementGrantCallablePayload>(
      revokeKey, actorUid)?.operationId !== expectedOperationId) return;
    clearPending(revokeKey);
    frozenRevokeRef.current = null;
    setFrozenRevoke(null);
  }, [actorUid, revokeKey]);

  const setOrganizerId = useCallback((value: string) => {
    ++ledgerRequestGeneration.current;
    setOrganizerIdState(value);
    setEntitlement(null);
    setRevokeTargetGrantId(null);
  }, []);

  const setGrantField = useCallback(<
    K extends keyof OrganizerEntitlementGrantForm,
  >(key: K, value: OrganizerEntitlementGrantForm[K]) => {
    setGrantForm((current) => {
      const next = {...current, [key]: value};
      if (key === "sku") {
        const catalogUnit = entitlement?.skuCatalog[value as OrganizerEntitlementSku]?.unit;
        if (catalogUnit) next.unit = catalogUnit;
      }
      return next;
    });
  }, [entitlement]);

  const load = useCallback(async () => {
    const trimmedOrganizerId = organizerId.trim();
    if (!trimmedOrganizerId) {
      onError("Enter the organizer identifier.");
      return false;
    }
    const generation = ++ledgerRequestGeneration.current;
    try {
      const response = await loadMutation.mutateAsync({
        organizerId: trimmedOrganizerId,
      });
      if (generation !== ledgerRequestGeneration.current) return true;
      setOrganizerIdState(trimmedOrganizerId);
      setEntitlement(response);
      setRevokeTargetGrantId(null);
      if (frozenGrant?.organizerId === trimmedOrganizerId &&
          response.grants.some((grant) =>
            grant.grantId === `grant_${frozenGrant.operationId}`)) {
        clearGrant(frozenGrant.operationId);
      }
      if (frozenRevoke?.organizerId === trimmedOrganizerId &&
          response.grants.some((grant) =>
            grant.grantId === frozenRevoke.grantId && grant.revoked)) {
        clearRevoke(frozenRevoke.operationId);
      }
      onError(null);
      onNotice("Current organizer entitlement ledger loaded. " +
        "Unconfirmed mutations remain available for exact retry.");
      return true;
    } catch (error) {
      if (generation !== ledgerRequestGeneration.current) return false;
      setEntitlement(null);
      onError(messageFromError(
        error,
        "Unable to load the organizer entitlement ledger."
      ));
      return false;
    }
  }, [clearGrant, clearRevoke, loadMutation, onError, onNotice,
    organizerId, frozenGrant, frozenRevoke]);

  const grantDisabledReason = frozenGrant ? null :
    grantBlocker({grantForm, organizerId});
  const grant = useCallback(async () => {
    const trimmedOrganizerId = organizerId.trim();
    if (grantDisabledReason) {
      onError(grantDisabledReason);
      return false;
    }
    const withoutOperationId = {
      organizerId: trimmedOrganizerId,
      sku: grantForm.sku,
      unit: grantForm.unit,
      quantityTotal: parseCountValue(grantForm.quantity)!,
      source: grantForm.source,
      ...(grantForm.validFrom.trim() ?
        {validFromMillis: Date.parse(grantForm.validFrom)} : {}),
      ...(grantForm.validUntil.trim() ?
        {validUntilMillis: Date.parse(grantForm.validUntil)} : {}),
      ...(grantForm.receiptRef.trim() ?
        {receiptRef: grantForm.receiptRef.trim()} : {}),
      ...(grantForm.note.trim() ? {note: grantForm.note.trim()} : {}),
    };
    const payload = frozenGrant ?? {
        operationId: createOperationId("entitlement-grant"),
        ...withoutOperationId,
      };
    const operation = beginOperation();
    if (!operation) return false;
    if (!frozenGrant && !writePending(grantKey, actorUid, payload)) {
      endOperation(operation);
      onError("This browser could not retain the grant for a safe retry.");
      return false;
    }
    if (!frozenGrant) {
      frozenGrantRef.current = payload;
      setFrozenGrant(payload);
    }
    try {
      const result = await grantMutation.mutateAsync(payload);
      clearGrant(payload.operationId);
      setOrganizerIdState(payload.organizerId);
      setRevokeTargetGrantId(null);
      setRevokeReason("");
      onError(null);
      onNotice(result.replayed ?
        "That grant operation was already recorded; the ledger was refreshed." :
        `Entitlement grant recorded at revision ${result.revision}. It grants no dispatch authority.`);
      const generation = ++ledgerRequestGeneration.current;
      try {
        const response = await loadMutation.mutateAsync({
          organizerId: payload.organizerId,
        });
        if (generation === ledgerRequestGeneration.current) {
          setEntitlement(response);
        }
      } catch {
        if (generation === ledgerRequestGeneration.current) {
          setEntitlement(null);
        }
      }
      return true;
    } catch (error) {
      // This callable rejects invalid arguments before opening a transaction.
      // Only that definitive response can release a request for correction.
      if (isPrewriteGrantRejection(error)) clearGrant(payload.operationId);
      onError(messageFromError(
        error,
        "Unable to record the entitlement grant."
      ));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    actorUid,
    clearGrant,
    endOperation,
    grantDisabledReason,
    grantForm,
    grantMutation,
    loadMutation,
    onError,
    onNotice,
    organizerId,
    frozenGrant,
  ]);

  const revokeDisabledReason = frozenRevoke ? null : revokeBlocker({
    entitlement,
    revokeReason,
    revokeTargetGrantId,
  });
  const revoke = useCallback(async () => {
    const trimmedOrganizerId = organizerId.trim();
    if (revokeDisabledReason) {
      onError(revokeDisabledReason ?? "Choose a grant to revoke.");
      return false;
    }
    const withoutOperationId = {
      organizerId: trimmedOrganizerId,
      grantId: revokeTargetGrantId!,
      reason: revokeReason.trim(),
    };
    const payload = frozenRevoke ?? {
        operationId: createOperationId("entitlement-revoke"),
        ...withoutOperationId,
      };
    const operation = beginOperation();
    if (!operation) return false;
    if (!frozenRevoke && !writePending(revokeKey, actorUid, payload)) {
      endOperation(operation);
      onError("This browser could not retain the revocation for a safe retry.");
      return false;
    }
    if (!frozenRevoke) {
      frozenRevokeRef.current = payload;
      setFrozenRevoke(payload);
    }
    try {
      const result = await revokeMutation.mutateAsync(payload);
      clearRevoke(payload.operationId);
      setOrganizerIdState(payload.organizerId);
      setRevokeTargetGrantId(null);
      setRevokeReason("");
      onError(null);
      onNotice(result.replayed ?
        "That revoke operation was already recorded; the ledger was refreshed." :
        `Entitlement grant revoked at revision ${result.revision}.`);
      const generation = ++ledgerRequestGeneration.current;
      try {
        const response = await loadMutation.mutateAsync({
          organizerId: payload.organizerId,
        });
        if (generation === ledgerRequestGeneration.current) {
          setEntitlement(response);
        }
      } catch {
        if (generation === ledgerRequestGeneration.current) {
          setEntitlement(null);
        }
      }
      return true;
    } catch (error) {
      if (isRequestValidationRejection(error,
        "adminRevokeOrganizerEntitlementGrant")) {
        clearRevoke(payload.operationId);
      }
      onError(messageFromError(
        error,
        "Unable to revoke the entitlement grant."
      ));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    actorUid,
    clearRevoke,
    endOperation,
    entitlement,
    loadMutation,
    onError,
    onNotice,
    organizerId,
    frozenRevoke,
    revokeDisabledReason,
    revokeMutation,
    revokeReason,
    revokeTargetGrantId,
  ]);

  return {
    organizerId,
    entitlement,
    grantForm,
    revokeTargetGrantId,
    revokeReason,
    pendingGrant: frozenGrant,
    pendingRevoke: frozenRevoke,
    isLoading: loadMutation.isPending,
    isGranting: grantMutation.isPending,
    isRevoking: revokeMutation.isPending,
    grantDisabledReason,
    revokeDisabledReason,
    setOrganizerId,
    setGrantField,
    setRevokeTargetGrantId,
    setRevokeReason,
    load,
    grant,
    revoke,
  };
}

export function parseCountValue(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/u.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 1_000_000 ?
    parsed : null;
}

function grantBlocker({
  grantForm,
  organizerId,
}: {
  grantForm: OrganizerEntitlementGrantForm;
  organizerId: string;
}): string | null {
  if (!organizerId.trim()) return "Enter the organizer identifier.";
  if (parseCountValue(grantForm.quantity) === null) {
    return "Enter a whole grant quantity of 1 or more.";
  }
  const validFrom = grantForm.validFrom.trim() ?
    Date.parse(grantForm.validFrom) : null;
  if (grantForm.validFrom.trim() && !Number.isSafeInteger(validFrom)) {
    return "Valid-from must be a real date-time.";
  }
  const validUntil = grantForm.validUntil.trim() ?
    Date.parse(grantForm.validUntil) : null;
  if (grantForm.validUntil.trim() && !Number.isSafeInteger(validUntil)) {
    return "Valid-until must be a real date-time.";
  }
  if (validFrom !== null && validUntil !== null && validUntil <= validFrom) {
    return "Valid-until must be after valid-from.";
  }
  if (validFrom === null && validUntil !== null &&
      validUntil <= Date.now()) {
    return "Valid-until must be in the future when valid-from is blank.";
  }
  if (grantForm.source === "manualInvoice" && !grantForm.receiptRef.trim()) {
    return "Manual invoice grants need the invoice receipt reference.";
  }
  return null;
}

function revokeBlocker({
  entitlement,
  revokeReason,
  revokeTargetGrantId,
}: {
  entitlement: OrganizerEntitlementCallableResponse | null;
  revokeReason: string;
  revokeTargetGrantId: string | null;
}): string | null {
  if (!entitlement) return "Load the current entitlement ledger first.";
  if (!revokeTargetGrantId) return "Choose a grant to revoke.";
  const grant = entitlement.grants.find((entry) =>
    entry.grantId === revokeTargetGrantId);
  if (!grant) return "The chosen grant is no longer in this ledger.";
  if (grant.revoked) return "This entitlement grant is already revoked.";
  if (!revokeReason.trim()) return "Add a revoke reason.";
  return null;
}

function createOperationId(prefix: string): string {
  const entropy = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${entropy}`.replace(/[^A-Za-z0-9_-]+/gu, "-");
}

function readPending<T extends {operationId: string; organizerId: string}>(
  key: string, actorUid: string
): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const envelope: unknown = JSON.parse(raw);
    if (envelope && typeof envelope === "object" &&
        "actorUid" in envelope && envelope.actorUid === actorUid &&
        "payload" in envelope && envelope.payload &&
        typeof envelope.payload === "object" &&
        "operationId" in envelope.payload &&
        typeof envelope.payload.operationId === "string" &&
        "organizerId" in envelope.payload &&
        typeof envelope.payload.organizerId === "string") {
      return envelope.payload as T;
    }
  } catch {
    // An unavailable browser store cannot provide a safe pending operation.
  }
  return null;
}

function writePending(key: string, actorUid: string, payload: unknown): boolean {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({actorUid, payload}));
    return true;
  } catch {
    return false;
  }
}

function isPrewriteGrantRejection(error: unknown): boolean {
  if (isRequestValidationRejection(error,
    "adminGrantOrganizerEntitlement")) return true;
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }
  if (error.code === "functions/invalid-argument") return true;
  return error.code === "functions/failed-precondition" &&
    "message" in error && typeof error.message === "string" &&
    error.message.includes("validUntil must be after validFrom.");
}

function isRequestValidationRejection(
  error: unknown, callable: string
): boolean {
  return Boolean(error && typeof error === "object" &&
    "name" in error && error.name === "AdminCallableValidationError" &&
    "direction" in error && error.direction === "request" &&
    "callable" in error && error.callable === callable);
}

function clearPending(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // The completed server response is authoritative even if storage fails.
  }
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
