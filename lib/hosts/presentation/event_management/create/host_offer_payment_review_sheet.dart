import 'dart:math' as math;

import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_mode_tile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Offer fields the payment setup screen manages; the review diff ignores
/// anything else on the event preference snapshot.
const offerManagedFields = <String>{
  'offerValidityMinutes',
  'collectionPreference',
  'currency',
  'offerMessageTemplate',
  'paymentInstructions',
  'reusablePaymentPage',
  'expectedAmountMinor',
};

/// Minor-unit amount rendered in the event currency, e.g. ₹1,200.00.
String offerAmountDisplay(int minor, String currency) {
  final format = NumberFormat.currency(name: currency);
  return format.format(minor / math.pow(10, format.decimalDigits ?? 2));
}

bool _sameResolvedValue(Object? a, Object? b) {
  if (a is Map && b is Map) {
    return a.length == b.length &&
        a.entries.every((entry) => b[entry.key] == entry.value);
  }
  return a == b;
}

String _offerFieldTitle(AppLocalizations l10n, String key) => switch (key) {
  'offerValidityMinutes' => l10n.hostOfferPaymentValidity,
  'collectionPreference' => l10n.hostsEventDefaultsCollectionPreference,
  'currency' => l10n.hostsEventDefaultsCurrency,
  'offerMessageTemplate' => l10n.hostOfferPaymentMessage,
  'paymentInstructions' => l10n.hostsEventDefaultsPaymentInstructions,
  'reusablePaymentPage' => l10n.hostOfferPaymentPageLink,
  _ => l10n.hostsEventPreferenceExpectedAmount,
};

String _resolvedValuePreview(
  AppLocalizations l10n,
  String key,
  Object? value,
  EventOfferPreferencesPreview review,
) {
  if (value == null) return l10n.hostsEventPreferenceNotSet;
  if (key == 'expectedAmountMinor' && value is int) {
    final currency = review.candidate.resolvedValues['currency'];
    return offerAmountDisplay(value, currency is String ? currency : 'INR');
  }
  if (key == 'collectionPreference' && value is String) {
    final mode = switch (value) {
      'reusablePage' => HostOfferPaymentMode.reusablePage,
      'personalRequest' => HostOfferPaymentMode.personalRequest,
      'manualInstructions' => HostOfferPaymentMode.manualInstructions,
      'catchCheckout' => HostOfferPaymentMode.catchCheckout,
      _ => null,
    };
    return mode == null
        ? l10n.hostsEventPreferenceNotSet
        : hostOfferPaymentModeTitle(l10n, mode);
  }
  if (key == 'offerValidityMinutes' && value is int) {
    return l10n.hostsEventDefaultsMinutes(minutes: value);
  }
  if (value is Map) return value['url']?.toString() ?? '';
  return value.toString();
}

/// Server-reviewed diff of the staged payment terms before the command lands.
/// Cancel leaves the draft intact; confirm applies the reviewed request.
class HostOfferPaymentReviewSheet extends StatelessWidget {
  const HostOfferPaymentReviewSheet({
    super.key,
    required this.review,
    required this.summary,
  });

  final EventOfferPreferencesPreview review;
  final String summary;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final changed = <String>[
      for (final key in offerManagedFields)
        if (review.current == null
            ? review.candidate.resolvedValues[key] != null
            : !_sameResolvedValue(
                review.current!.resolvedValues[key],
                review.candidate.resolvedValues[key],
              ))
          key,
    ];
    return CatchSheet.standard(
      title: l10n.hostOfferPaymentReviewTitle,
      subtitle: summary,
      pinFooter: true,
      footer: Row(
        children: [
          Expanded(
            child: CatchButton.sheet(
              role: CatchButtonEmphasis.dismiss,
              label: l10n.coreCatchFieldLabelCancel,
              onPressed: () => Navigator.of(context).pop(false),
            ),
          ),
          const SizedBox(width: CatchSpacing.s3),
          Expanded(
            child: CatchButton.sheet(
              role: CatchButtonEmphasis.commit,
              label: l10n.hostsEventPreferenceApply,
              onPressed: () => Navigator.of(context).pop(true),
            ),
          ),
        ],
      ),
      child: Column(
        children: [
          CatchNotice(
            dismissLabel: l10n.coreCatchNoticeTooltipDismiss,
            notice: CatchNoticeData(
              id: 'offer-payment-review-note',
              title: l10n.hostOfferPaymentReviewBody,
              message: l10n.hostsEventPreferencePublishedHint,
              icon: CatchIcons.info,
              duration: null,
              dismissible: false,
            ),
          ),
          const SizedBox(height: CatchSpacing.s3),
          CatchSection.fieldRows(
            children: [
              if (changed.isEmpty)
                CatchField.read(
                  copy: copy,
                  title: l10n.hostsEventPreferenceNoChanges,
                )
              else
                for (final key in changed)
                  CatchField.read(
                    copy: copy,
                    title: _offerFieldTitle(l10n, key),
                    body: l10n.hostsEventPreferenceBeforeAfter(
                      before: _resolvedValuePreview(
                        l10n,
                        key,
                        review.current?.resolvedValues[key],
                        review,
                      ),
                      after: _resolvedValuePreview(
                        l10n,
                        key,
                        review.candidate.resolvedValues[key],
                        review,
                      ),
                    ),
                    bodyMaxLines: 6,
                  ),
            ],
          ),
        ],
      ),
    );
  }
}
