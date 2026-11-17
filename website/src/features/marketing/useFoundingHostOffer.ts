import {useEffect, useState} from "react";
import {watchPublicFoundingHostOffer} from "../../firebase";

/**
 * Whether a founding-host counter is open: places left and a deadline not
 * yet passed (a counter written before its deadline still reads open, so
 * the deadline is checked here too).
 */
export function foundingHostOfferIsOpen(value: unknown, now: number): boolean {
  if (value === null || typeof value !== "object") return false;
  const offer = value as {status?: unknown; placesLeft?: unknown; endsAtMillis?: unknown};
  if (offer.status !== "open") return false;
  if (typeof offer.placesLeft !== "number" || offer.placesLeft <= 0) return false;
  if (offer.endsAtMillis === null || offer.endsAtMillis === undefined) return true;
  return typeof offer.endsAtMillis === "number" && offer.endsAtMillis > now;
}

/**
 * The offer strip's switch: false on the server and until the market's
 * public counter reads open, so the strip never promises a place that is
 * gone. No market, no read.
 */
export function useFoundingHostOffer(marketId: string | undefined): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!marketId) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void watchPublicFoundingHostOffer(
      marketId,
      (value) => {
        if (active) setOpen(foundingHostOfferIsOpen(value, Date.now()));
      },
      () => {
        if (active) setOpen(false);
      },
    ).then((stop) => {
      if (active) unsubscribe = stop;
      else stop();
    }, () => undefined);
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [marketId]);
  return Boolean(marketId) && open;
}
