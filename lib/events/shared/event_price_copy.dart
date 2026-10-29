import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

/// Canonical price copy for Catch-owned events.
///
/// Demand-priced events say "From" only while the viewer has no resolved
/// quote. Once a quote exists, the exact quoted price is shown.
String eventPriceLabel(
  AppLocalizations l10n,
  Event event, {
  int? quotedPriceInPaise,
}) {
  final priceInPaise = quotedPriceInPaise ?? event.priceInPaise;
  if (priceInPaise <= 0) return l10n.eventsEventPriceCopyFree;

  final formatted = EventFormatters.priceInPaise(
    priceInPaise,
    currencyCode: event.currency,
  );
  if (quotedPriceInPaise == null &&
      event.effectiveEventPolicy.usesDemandPricing) {
    return l10n.eventsEventPriceCopyFromPrice(price: formatted);
  }
  return formatted;
}

/// Localized fallback price copy for externally sourced events.
String externalEventPriceLabel(AppLocalizations l10n, ExternalEvent event) {
  final display = event.priceDisplayText?.trim();
  if (display != null && display.isNotEmpty) return display;
  final parsed = event.parsedPriceInPaise;
  if (parsed == null) return l10n.eventsEventPriceCopyPriceOnSource;
  if (parsed <= 0) return l10n.eventsEventPriceCopyFree;
  return formatMinorCurrency(parsed, currencyCode: event.currency);
}
