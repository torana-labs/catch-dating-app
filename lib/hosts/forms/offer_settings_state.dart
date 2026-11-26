import 'dart:math' as math;

import 'package:catch_l10n/l10n.dart';
import 'package:intl/intl.dart';

/// How an event collects offer payments. A free offer collects nothing;
/// each paid mode changes the fields it needs and who confirms payment.
enum HostOfferSettingsMode {
  free,
  catchCheckout,
  reusablePage,
  personalRequest,
  manualInstructions,
}

/// The validity choices, in hours as minutes; Custom opens a minutes field.
const hostOfferValidityChoices = <int>[1440, 2880, 4320];

/// The Custom validity choice, which is not a duration.
const hostOfferCustomValidity = -1;

/// The offer fields this page manages; the review leaves anything else on
/// the event's settings alone.
const hostOfferManagedFields = <String>{
  'offerValidityMinutes',
  'collectionPreference',
  'currency',
  'offerMessageTemplate',
  'paymentInstructions',
  'reusablePaymentPage',
  'expectedAmountMinor',
};

String hostOfferSettingsModeTitle(
  AppLocalizations l10n,
  HostOfferSettingsMode mode,
) => switch (mode) {
  HostOfferSettingsMode.free => l10n.hostEventOfferFree,
  HostOfferSettingsMode.catchCheckout => l10n.hostsEventDefaultsCatchCheckout,
  HostOfferSettingsMode.reusablePage => l10n.hostOfferPaymentModePage,
  HostOfferSettingsMode.personalRequest =>
    l10n.hostsEventDefaultsPersonalRequest,
  HostOfferSettingsMode.manualInstructions =>
    l10n.hostsEventDefaultsManualInstructions,
};

String hostOfferSettingsModeBody(
  AppLocalizations l10n,
  HostOfferSettingsMode mode,
) => switch (mode) {
  HostOfferSettingsMode.free => l10n.hostOfferPaymentModeFreeBody,
  HostOfferSettingsMode.catchCheckout => l10n.hostOfferPaymentModeCheckoutBody,
  HostOfferSettingsMode.reusablePage => l10n.hostOfferPaymentModePageBody,
  HostOfferSettingsMode.personalRequest => l10n.hostOfferPaymentModeRequestBody,
  HostOfferSettingsMode.manualInstructions =>
    l10n.hostOfferPaymentModeManualBody,
};

/// The mode a saved collection preference stands for; null when unknown.
HostOfferSettingsMode? hostOfferSettingsModeFor(String collection) =>
    switch (collection) {
      'reusablePage' => HostOfferSettingsMode.reusablePage,
      'personalRequest' => HostOfferSettingsMode.personalRequest,
      'manualInstructions' => HostOfferSettingsMode.manualInstructions,
      'catchCheckout' => HostOfferSettingsMode.catchCheckout,
      _ => null,
    };

/// A minor-unit amount in the event's currency, such as ₹1,200.00.
String hostOfferAmountText(int minor, String currency) {
  final format = NumberFormat.currency(name: currency);
  return format.format(minor / math.pow(10, format.decimalDigits ?? 2));
}
