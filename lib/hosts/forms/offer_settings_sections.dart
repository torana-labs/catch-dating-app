import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/forms/offer_settings_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// How guests pay: every mode while the host chooses, then the chosen
/// mode alone with Change. Catch checkout stays visible but cannot be
/// chosen until it is available.
class HostOfferSettingsModeSection extends StatelessWidget {
  const HostOfferSettingsModeSection({
    super.key,
    required this.mode,
    required this.expanded,
    required this.editable,
    required this.checkoutAvailable,
    required this.onSelected,
    required this.onChange,
  });

  final HostOfferSettingsMode? mode;

  /// The host is choosing again.
  final bool expanded;
  final bool editable;
  final bool checkoutAvailable;
  final ValueChanged<HostOfferSettingsMode> onSelected;
  final VoidCallback onChange;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final chosen = mode;
    final choosing = chosen == null || expanded;
    return CatchSection(
      title: l10n.hostOfferPaymentModeHeading,
      dividers: CatchSectionPlacement.none,
      action: choosing || !editable
          ? null
          : CatchSectionAction(
              label: l10n.hostOfferPaymentModeChange,
              onPressed: onChange,
            ),
      children: [
        for (final candidate
            in choosing ? HostOfferSettingsMode.values : [chosen])
          _HostOfferModeTile(
            mode: candidate,
            selected: chosen == candidate,
            gated:
                candidate == HostOfferSettingsMode.catchCheckout &&
                !checkoutAvailable,
            onTap: !editable
                ? null
                : !choosing
                ? onChange
                : candidate == HostOfferSettingsMode.catchCheckout &&
                      !checkoutAvailable
                ? null
                : () => onSelected(candidate),
          ),
      ],
    );
  }
}

class _HostOfferModeTile extends StatelessWidget {
  const _HostOfferModeTile({
    required this.mode,
    required this.selected,
    required this.gated,
    required this.onTap,
  });

  final HostOfferSettingsMode mode;
  final bool selected;
  final bool gated;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Semantics(
      selected: selected,
      inMutuallyExclusiveGroup: true,
      child: CatchChoiceTile(
        key: ValueKey('offer-payment-mode-${mode.name}'),
        variant: CatchChoiceTileVariant.row,
        title: gated
            ? '${hostOfferSettingsModeTitle(l10n, mode)} · '
                  '${l10n.hostOfferPaymentComingSoon}'
            : hostOfferSettingsModeTitle(l10n, mode),
        subtitle: hostOfferSettingsModeBody(l10n, mode),
        selected: selected,
        contractExemption: 'Offer collection mode, staged locally.',
        onTap: onTap,
      ),
    );
  }
}

/// The fields the chosen mode needs: amount and currency for a paid mode,
/// how long an offer is held, the page link and its reuse confirmation,
/// the payment instructions and the offer message. The page owns every
/// value; this section only draws them.
class HostOfferSettingsDetailsSection extends StatelessWidget {
  const HostOfferSettingsDetailsSection({
    super.key,
    required this.mode,
    required this.editable,
    required this.amount,
    required this.currency,
    required this.customValidity,
    required this.pageUrl,
    required this.instructions,
    required this.message,
    required this.validityCustom,
    required this.validityMinutes,
    required this.reuseAttested,
    required this.expiryMillis,
    required this.openEditor,
    required this.instructionsError,
    required this.onFieldChanged,
    required this.onValidity,
    required this.onValidityMinutes,
    required this.onReuseAttested,
    required this.onInstructionsOpen,
    required this.onInstructionsCancel,
    required this.onInstructionsSubmit,
    required this.onInstructionsChanged,
    required this.onMessageOpen,
    required this.onMessageCancel,
    required this.onMessageSubmit,
  });

  final HostOfferSettingsMode mode;
  final bool editable;
  final TextEditingController amount;
  final TextEditingController currency;
  final TextEditingController customValidity;
  final TextEditingController pageUrl;
  final TextEditingController instructions;
  final TextEditingController message;
  final bool validityCustom;
  final int? validityMinutes;
  final bool reuseAttested;

  /// When an offer made now would expire; null while unset or past.
  final int? expiryMillis;

  /// Which text drawer is open: `instructions`, `message` or none.
  final String? openEditor;
  final String? instructionsError;
  final VoidCallback onFieldChanged;
  final void Function({int? minutes, required bool custom}) onValidity;
  final ValueChanged<String> onValidityMinutes;
  final ValueChanged<bool> onReuseAttested;
  final ValueChanged<bool> onInstructionsOpen;
  final VoidCallback onInstructionsCancel;
  final VoidCallback onInstructionsSubmit;
  final ValueChanged<String> onInstructionsChanged;
  final ValueChanged<bool> onMessageOpen;
  final VoidCallback onMessageCancel;
  final VoidCallback onMessageSubmit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final inputMode = editable
        ? CatchTextInputMode.editable
        : CatchTextInputMode.inactive;
    return CatchSection(
      title: l10n.hostOfferPaymentDetailsHeading,
      dividers: CatchSectionPlacement.none,
      children: [
        if (mode != HostOfferSettingsMode.free) ...[
          CatchField.input(
            key: const ValueKey('offer-payment-amount'),
            copy: copy,
            title: l10n.hostOfferPaymentAmount,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsExpectedAmountMinorValue,
            controller: amount,
            inputHint: '1200',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputMode: inputMode,
            onChanged: editable ? (_) => onFieldChanged() : null,
            onValidate: (text) {
              final parsed = double.tryParse(text?.trim() ?? '');
              return parsed == null || parsed <= 0
                  ? l10n.hostsEventPreferenceInvalidValue
                  : null;
            },
            helperText: l10n.hostOfferPaymentAmountHint,
          ),
          CatchField.input(
            key: const ValueKey('offer-payment-currency'),
            copy: copy,
            title: l10n.hostsEventDefaultsCurrency,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsCurrencyValue,
            controller: currency,
            inputHint: 'INR',
            maxLength: 3,
            inputMode: inputMode,
            onChanged: editable ? (_) => onFieldChanged() : null,
            onValidate: (text) =>
                RegExp(r'^[A-Za-z]{3}$').hasMatch(text?.trim() ?? '')
                ? null
                : l10n.hostsEventDefaultsInvalidCurrency,
          ),
        ],
        CatchField<int>.choices(
          copy: copy,
          title: l10n.hostOfferPaymentValidity,
          contract: CatchContractConstraints
              .configureEventOfferPreferencesCallablePayloadIntentsOfferValidityMinutesValue,
          helperText: l10n.hostOfferPaymentValidityHint,
          values: const [...hostOfferValidityChoices, hostOfferCustomValidity],
          itemLabelBuilder: (minutes) => minutes == hostOfferCustomValidity
              ? l10n.hostOfferPaymentValidityCustom
              : l10n.hostOfferPaymentValidityHours(hours: minutes ~/ 60),
          selected: {
            if (validityCustom) hostOfferCustomValidity else ?validityMinutes,
          },
          allowEmptySelection: true,
          onSelectionChanged: editable
              ? (selection) {
                  final minutes = selection.firstOrNull;
                  onValidity(
                    minutes: minutes == hostOfferCustomValidity
                        ? null
                        : minutes,
                    custom: minutes == hostOfferCustomValidity,
                  );
                }
              : null,
        ),
        if (validityCustom)
          CatchField.input(
            key: const ValueKey('offer-payment-validity-minutes'),
            copy: copy,
            title: l10n.hostOfferPaymentValidityMinutes,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsOfferValidityMinutesValue,
            controller: customValidity,
            inputHint: '5–10080',
            maxLength: 5,
            keyboardType: TextInputType.number,
            inputMode: inputMode,
            onChanged: editable ? onValidityMinutes : null,
            onValidate: (text) {
              final value = int.tryParse(text?.trim() ?? '');
              return value == null || value < 5 || value > 10080
                  ? l10n.hostsEventPreferenceInvalidValue
                  : null;
            },
          ),
        if (expiryMillis case final millis?)
          CatchIndexRow(
            key: const ValueKey('offer-payment-expires'),
            title: l10n.hostOfferPaymentExpires,
            subtitle: DateFormat.yMMMd().add_jm().format(
              DateTime.fromMillisecondsSinceEpoch(millis),
            ),
            icon: CatchIcons.time,
            onTap: null,
          ),
        if (mode == HostOfferSettingsMode.reusablePage) ...[
          CatchField.input(
            key: const ValueKey('offer-payment-page-url'),
            copy: copy,
            title: l10n.hostOfferPaymentPageLink,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsReusablePaymentPageValueUrl,
            controller: pageUrl,
            inputHint: l10n.hostsEventDefaultsReusablePageHint,
            keyboardType: TextInputType.url,
            inputMode: inputMode,
            onChanged: editable ? (_) => onFieldChanged() : null,
            onValidate: (text) =>
                isCanonicalPublicPaymentPageUrl(text?.trim() ?? '')
                ? null
                : l10n.hostsEventDefaultsInvalidReusablePage,
            helperText: l10n.hostOfferPaymentPageLinkHint,
          ),
          CatchField.toggle(
            key: const ValueKey('offer-payment-page-reuse'),
            copy: copy,
            title: l10n.hostOfferPaymentPageReuse,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsReusablePaymentPageValueReusableForEvents,
            body: l10n.hostOfferPaymentPageReuseBody,
            value: reuseAttested,
            onChanged: editable ? onReuseAttested : null,
          ),
        ],
        if (mode == HostOfferSettingsMode.manualInstructions)
          CatchField.inputActions(
            key: const ValueKey('offer-payment-instructions'),
            copy: copy,
            title: l10n.hostsEventDefaultsPaymentInstructions,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsPaymentInstructionsValue,
            controller: instructions,
            open: openEditor == 'instructions',
            onOpenChanged: onInstructionsOpen,
            onCancel: onInstructionsCancel,
            onSubmit: onInstructionsSubmit,
            inputHint: l10n.hostOfferPaymentInstructionsHint,
            maxLength: 1000,
            minLines: 3,
            maxLines: 5,
            error: instructionsError,
            onChanged: onInstructionsChanged,
            meta: CatchText(
              l10n.hostOfferPaymentInstructionsHelper,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ),
        CatchField.inputActions(
          key: const ValueKey('offer-payment-message'),
          copy: copy,
          title: l10n.hostOfferPaymentMessage,
          contractExemption:
              'Optional offer message template; submitting empty clears the '
              'saved template rather than writing an intent value.',
          controller: message,
          open: openEditor == 'message',
          onOpenChanged: onMessageOpen,
          onCancel: onMessageCancel,
          onSubmit: onMessageSubmit,
          inputHint: l10n.hostOfferPaymentMessageHint,
          maxLength: 1000,
          minLines: 3,
          maxLines: 5,
        ),
      ],
    );
  }
}

/// How an offer in the chosen mode is confirmed, said plainly before the
/// host saves.
class HostOfferSettingsConfirmation extends StatelessWidget {
  const HostOfferSettingsConfirmation({super.key, required this.mode});

  final HostOfferSettingsMode mode;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final (title, body, icon, tone) = switch (mode) {
      HostOfferSettingsMode.free => (
        l10n.hostOfferPaymentConfirmFreeTitle,
        l10n.hostOfferPaymentConfirmFreeBody,
        CatchIcons.ticket,
        CatchNoticeTone.success,
      ),
      HostOfferSettingsMode.catchCheckout => (
        l10n.hostOfferPaymentConfirmAutoTitle,
        l10n.hostOfferPaymentConfirmAutoBody,
        CatchIcons.verified,
        CatchNoticeTone.success,
      ),
      HostOfferSettingsMode.reusablePage => (
        l10n.hostOfferPaymentConfirmManualTitle,
        l10n.hostOfferPaymentConfirmPageBody,
        CatchIcons.taskDone,
        CatchNoticeTone.warning,
      ),
      HostOfferSettingsMode.personalRequest => (
        l10n.hostOfferPaymentConfirmManualTitle,
        l10n.hostOfferPaymentConfirmRequestBody,
        CatchIcons.taskDone,
        CatchNoticeTone.warning,
      ),
      HostOfferSettingsMode.manualInstructions => (
        l10n.hostOfferPaymentConfirmManualTitle,
        l10n.hostOfferPaymentConfirmManualBody,
        CatchIcons.taskDone,
        CatchNoticeTone.warning,
      ),
    };
    return CatchSection(
      title: l10n.hostOfferPaymentConfirmationHeading,
      dividers: CatchSectionPlacement.none,
      children: [
        CatchNotice.inline(
          key: const ValueKey('offer-payment-confirmation'),
          title: title,
          body: body,
          icon: icon,
          tone: tone,
        ),
      ],
    );
  }
}

/// The server's review of the staged terms: each changed field, before and
/// after. Cancel keeps the draft; Apply returns true.
class HostOfferSettingsReviewSheet extends StatelessWidget {
  const HostOfferSettingsReviewSheet({
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
    final current = review.current?.resolvedValues;
    final candidate = review.candidate.resolvedValues;
    final changed = [
      for (final key in hostOfferManagedFields)
        if (current == null
            ? candidate[key] != null
            : !_same(current[key], candidate[key]))
          key,
    ];
    return CatchSheet.standard(
      title: l10n.hostOfferPaymentReviewTitle,
      subtitle: summary,
      pinFooter: true,
      footer: CatchStack(
        direction: CatchStackDirection.row,
        gap: CatchStackGap.g8,
        equal: true,
        children: [
          CatchButton(
            label: l10n.coreCatchFieldLabelCancel,
            variant: CatchButtonVariant.secondary,
            fullWidth: true,
            onPressed: () => Navigator.of(context).pop(false),
          ),
          CatchButton(
            key: const ValueKey('offer-payment-review-apply'),
            label: l10n.hostsEventPreferenceApply,
            fullWidth: true,
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ],
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchNotice.inline(
            title: l10n.hostOfferPaymentReviewBody,
            body: l10n.hostsEventPreferencePublishedHint,
            icon: CatchIcons.info,
          ),
          CatchSection(
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
                    title: _fieldTitle(l10n, key),
                    body: l10n.hostsEventPreferenceBeforeAfter(
                      before: _preview(l10n, key, current?[key]),
                      after: _preview(l10n, key, candidate[key]),
                    ),
                    bodyMaxLines: 6,
                  ),
            ],
          ),
        ],
      ),
    );
  }

  static bool _same(Object? a, Object? b) {
    if (a is Map && b is Map) {
      return a.length == b.length &&
          a.entries.every((entry) => b[entry.key] == entry.value);
    }
    return a == b;
  }

  static String _fieldTitle(AppLocalizations l10n, String key) => switch (key) {
    'offerValidityMinutes' => l10n.hostOfferPaymentValidity,
    'collectionPreference' => l10n.hostsEventDefaultsCollectionPreference,
    'currency' => l10n.hostsEventDefaultsCurrency,
    'offerMessageTemplate' => l10n.hostOfferPaymentMessage,
    'paymentInstructions' => l10n.hostsEventDefaultsPaymentInstructions,
    'reusablePaymentPage' => l10n.hostOfferPaymentPageLink,
    _ => l10n.hostsEventPreferenceExpectedAmount,
  };

  String _preview(AppLocalizations l10n, String key, Object? value) {
    if (value == null) return l10n.hostsEventPreferenceNotSet;
    if (key == 'expectedAmountMinor' && value is int) {
      final currency = review.candidate.resolvedValues['currency'];
      return hostOfferAmountText(value, currency is String ? currency : 'INR');
    }
    if (key == 'collectionPreference' && value is String) {
      final mode = hostOfferSettingsModeFor(value);
      return mode == null
          ? l10n.hostsEventPreferenceNotSet
          : hostOfferSettingsModeTitle(l10n, mode);
    }
    if (key == 'offerValidityMinutes' && value is int) {
      return l10n.hostsEventDefaultsMinutes(minutes: value);
    }
    if (value is Map) return value['url']?.toString() ?? '';
    return value.toString();
  }
}
