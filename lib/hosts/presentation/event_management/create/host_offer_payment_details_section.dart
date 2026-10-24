import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_mode_tile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Validity chip minutes offered by the offer payment details section; the
/// sentinel represents the custom-minutes editor rather than a duration.
const offerPaymentValidityChips = <int>[1440, 2880, 4320];
const offerPaymentCustomValiditySentinel = -1;

/// The fields a chosen collection mode actually needs: amount/currency for
/// paid modes, validity chips, reusable-page URL + reuse attestation, and the
/// explicit-commit text drawers for instructions and the offer message. All
/// state stays owned by the page body; this section only renders it.
class HostOfferPaymentDetailsSection extends StatelessWidget {
  const HostOfferPaymentDetailsSection({
    super.key,
    required this.mode,
    required this.editable,
    required this.amountController,
    required this.currencyController,
    required this.customValidityController,
    required this.pageUrlController,
    required this.instructionsController,
    required this.messageController,
    required this.validityCustom,
    required this.validityMinutes,
    required this.reuseAttested,
    required this.resolvedExpiryMillis,
    required this.openEditor,
    required this.instructionsError,
    required this.onFieldChanged,
    required this.onValiditySelected,
    required this.onValidityMinutesChanged,
    required this.onReuseAttestedChanged,
    required this.onInstructionsOpenChanged,
    required this.onInstructionsCancel,
    required this.onInstructionsSubmit,
    required this.onInstructionsChanged,
    required this.onMessageOpenChanged,
    required this.onMessageCancel,
    required this.onMessageSubmit,
  });

  final HostOfferPaymentMode mode;
  final bool editable;
  final TextEditingController amountController;
  final TextEditingController currencyController;
  final TextEditingController customValidityController;
  final TextEditingController pageUrlController;
  final TextEditingController instructionsController;
  final TextEditingController messageController;
  final bool validityCustom;
  final int? validityMinutes;
  final bool reuseAttested;
  final int? resolvedExpiryMillis;
  final String? openEditor;
  final String? instructionsError;
  final VoidCallback onFieldChanged;
  final void Function({int? minutes, required bool custom}) onValiditySelected;
  final ValueChanged<String> onValidityMinutesChanged;
  final ValueChanged<bool> onReuseAttestedChanged;
  final ValueChanged<bool> onInstructionsOpenChanged;
  final VoidCallback onInstructionsCancel;
  final VoidCallback onInstructionsSubmit;
  final ValueChanged<String> onInstructionsChanged;
  final ValueChanged<bool> onMessageOpenChanged;
  final VoidCallback onMessageCancel;
  final VoidCallback onMessageSubmit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    return CatchSection.fieldRows(
      title: l10n.hostOfferPaymentDetailsHeading,
      children: [
        if (mode != HostOfferPaymentMode.free) ...[
          CatchField.input(
            copy: copy,
            key: const ValueKey('offer-payment-amount'),
            title: l10n.hostOfferPaymentAmount,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsExpectedAmountMinorValue,
            controller: amountController,
            inputHint: '1200',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputMode: editable
                ? CatchTextInputMode.editable
                : CatchTextInputMode.inactive,
            onChanged: editable ? (_) => onFieldChanged() : null,
            onValidate: (text) {
              final parsed = double.tryParse(text?.trim() ?? '');
              if (parsed == null || parsed <= 0) {
                return l10n.hostsEventPreferenceInvalidValue;
              }
              return null;
            },
            helperText: l10n.hostOfferPaymentAmountHint,
          ),
          CatchField.input(
            copy: copy,
            key: const ValueKey('offer-payment-currency'),
            title: l10n.hostsEventDefaultsCurrency,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsCurrencyValue,
            controller: currencyController,
            inputHint: 'INR',
            maxLength: 3,
            inputMode: editable
                ? CatchTextInputMode.editable
                : CatchTextInputMode.inactive,
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
          values: const [
            ...offerPaymentValidityChips,
            offerPaymentCustomValiditySentinel,
          ],
          itemLabelBuilder: (minutes) =>
              minutes == offerPaymentCustomValiditySentinel
              ? l10n.hostOfferPaymentValidityCustom
              : l10n.hostOfferPaymentValidityHours(hours: minutes ~/ 60),
          selected: {
            if (validityCustom)
              offerPaymentCustomValiditySentinel
            else
              ?validityMinutes,
          },
          allowEmptySelection: true,
          onSelectionChanged: editable
              ? (selection) {
                  final minutes = selection.isEmpty ? null : selection.first;
                  onValiditySelected(
                    minutes: minutes == offerPaymentCustomValiditySentinel
                        ? null
                        : minutes,
                    custom: minutes == offerPaymentCustomValiditySentinel,
                  );
                }
              : null,
        ),
        if (validityCustom)
          CatchField.input(
            copy: copy,
            key: const ValueKey('offer-payment-validity-minutes'),
            title: l10n.hostOfferPaymentValidityMinutes,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsOfferValidityMinutesValue,
            controller: customValidityController,
            inputHint: '5–10080',
            maxLength: 5,
            keyboardType: TextInputType.number,
            inputMode: editable
                ? CatchTextInputMode.editable
                : CatchTextInputMode.inactive,
            onChanged: editable ? onValidityMinutesChanged : null,
            onValidate: (text) {
              final value = int.tryParse(text?.trim() ?? '');
              if (value == null || value < 5 || value > 10080) {
                return l10n.hostsEventPreferenceInvalidValue;
              }
              return null;
            },
          ),
        if (resolvedExpiryMillis case final millis?)
          CatchField.read(
            copy: copy,
            title: l10n.hostOfferPaymentExpires,
            body: DateFormat.yMMMd().add_jm().format(
              DateTime.fromMillisecondsSinceEpoch(millis),
            ),
            icon: CatchIcons.scheduleOutlined,
          ),
        if (mode == HostOfferPaymentMode.reusablePage) ...[
          CatchField.input(
            copy: copy,
            key: const ValueKey('offer-payment-page-url'),
            title: l10n.hostOfferPaymentPageLink,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsReusablePaymentPageValueUrl,
            controller: pageUrlController,
            inputHint: l10n.hostsEventDefaultsReusablePageHint,
            keyboardType: TextInputType.url,
            inputMode: editable
                ? CatchTextInputMode.editable
                : CatchTextInputMode.inactive,
            onChanged: editable ? (_) => onFieldChanged() : null,
            onValidate: (text) =>
                isCanonicalPublicPaymentPageUrl(text?.trim() ?? '')
                ? null
                : l10n.hostsEventDefaultsInvalidReusablePage,
            helperText: l10n.hostOfferPaymentPageLinkHint,
          ),
          CatchField.toggle(
            copy: copy,
            key: const ValueKey('offer-payment-page-reuse'),
            title: l10n.hostOfferPaymentPageReuse,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsReusablePaymentPageValueReusableForEvents,
            body: l10n.hostOfferPaymentPageReuseBody,
            value: reuseAttested,
            onChanged: editable ? onReuseAttestedChanged : null,
          ),
        ],
        if (mode == HostOfferPaymentMode.manualInstructions)
          CatchField.inputActions(
            copy: copy,
            key: const ValueKey('offer-payment-instructions'),
            title: l10n.hostsEventDefaultsPaymentInstructions,
            contract: CatchContractConstraints
                .configureEventOfferPreferencesCallablePayloadIntentsPaymentInstructionsValue,
            controller: instructionsController,
            open: openEditor == 'instructions',
            onOpenChanged: onInstructionsOpenChanged,
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
              variant: CatchTextVariant.supporting,
              color: CatchTokens.of(context).ink2,
            ),
          ),
        CatchField.inputActions(
          copy: copy,
          key: const ValueKey('offer-payment-message'),
          title: l10n.hostOfferPaymentMessage,
          contractExemption:
              'Optional offer message template; submitting empty clears the saved template rather than writing an intent value.',
          controller: messageController,
          open: openEditor == 'message',
          onOpenChanged: onMessageOpenChanged,
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
