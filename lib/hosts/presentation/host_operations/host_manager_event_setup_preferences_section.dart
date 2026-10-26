import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/hosts/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Editor for a manager-authorized setup-preferences projection. No field is
/// read from the public Club document, and a null onChanged disables writes
/// until a revision-fenced manager settings command is available.
class HostManagerEventSetupPreferencesSection extends StatelessWidget {
  const HostManagerEventSetupPreferencesSection({
    super.key,
    required this.preferences,
    this.venueLabel,
    this.onChanged,
  });

  final ManagerEventSetupPreferences preferences;
  final String? venueLabel;
  final ValueChanged<ManagerEventSetupPreferences>? onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final editable = onChanged != null;
    final inputMode = editable
        ? CatchTextInputMode.editable
        : CatchTextInputMode.inactive;
    const durationChoices = <int>[15, 30, 45, 60, 90, 120, 180, 240];
    const validityChoices = <int>[5, 15, 30, 60, 120, 1440, 2880, 10080];
    String minutes(int value) => l10n.hostsEventDefaultsMinutes(minutes: value);
    String collectionLabel(EventCollectionPreference value) => switch (value) {
      EventCollectionPreference.manualInstructions =>
        l10n.hostsEventDefaultsManualInstructions,
      EventCollectionPreference.reusablePage =>
        l10n.hostsEventDefaultsReusablePage,
      EventCollectionPreference.personalRequest =>
        l10n.hostsEventDefaultsPersonalRequest,
      EventCollectionPreference.catchCheckout =>
        l10n.hostsEventDefaultsCatchCheckout,
    };
    void update(ManagerEventSetupPreferences next) => onChanged?.call(next);

    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        CatchSection.fieldRows(
          first: true,
          title: l10n.hostsEventDefaultsBasics,
          children: [
            CatchField.input(
              copy: copy,
              key: ValueKey('manager-event-timezone-${preferences.timezone}'),
              title: l10n.hostsPrivateEventTimezone,
              contractExemption:
                  'Manager-only private event timezone suggestion.',
              initialValue: preferences.timezone ?? '',
              inputHint: l10n.hostsPrivateEventTimezoneHint,
              helperText: l10n.hostsEventDefaultsTimezoneHint,
              inputMode: inputMode,
              maxLength: 100,
              onSubmitted: editable
                  ? (value) {
                      final trimmed = value.trim();
                      if (trimmed.length > 100) return;
                      update(
                        preferences.copyWith(
                          timezone: trimmed.isEmpty ? null : trimmed,
                        ),
                      );
                    }
                  : null,
            ),
            CatchField<int>.control(
              copy: copy,
              title: l10n.hostsEventDefaultsUsualDuration,
              contractExemption:
                  'Manager-only event setup suggestion; the shared saver is gated.',
              body: preferences.usualDurationMinutes == null
                  ? l10n.hostsEventDefaultsChooseEachEvent
                  : minutes(preferences.usualDurationMinutes!),
              icon: CatchIcons.time,
              child: CatchChoiceInput<int>(
                values: durationChoices,
                itemLabelBuilder: minutes,
                selected: preferences.usualDurationMinutes == null
                    ? const <int>{}
                    : {preferences.usualDurationMinutes!},
                mode: CatchChipMode.single,
                autoClose: true,
                onChanged: editable
                    ? (selection) {
                        if (selection.isNotEmpty) {
                          update(
                            preferences.copyWith(
                              usualDurationMinutes: selection.single,
                            ),
                          );
                        }
                      }
                    : null,
              ),
            ),
            if (preferences.usualDurationMinutes != null)
              CatchField.action(
                copy: copy,
                title: l10n.hostsEventDefaultsClearDuration,
                body: l10n.hostsEventDefaultsChooseEachEvent,
                onTap: editable
                    ? () => update(
                        preferences.copyWith(usualDurationMinutes: null),
                      )
                    : null,
              ),
            CatchField.read(
              copy: copy,
              title: l10n.hostsEventDefaultsPreferredVenue,
              body: preferences.preferredVenueId == null
                  ? l10n.hostsEventDefaultsVenueUnavailable
                  : venueLabel ?? l10n.hostsEventDefaultsVenueSaved,
              icon: CatchIcons.location,
            ),
            if (preferences.preferredVenueId != null)
              CatchField.action(
                copy: copy,
                title: l10n.hostsEventDefaultsClearVenue,
                body: l10n.hostsEventDefaultsChooseEachEvent,
                onTap: editable
                    ? () => update(preferences.copyWith(preferredVenueId: null))
                    : null,
              ),
          ],
        ),
        CatchSection.fieldRows(
          title: l10n.hostsEventDefaultsOffersHeading,
          children: [
            CatchField<int>.control(
              copy: copy,
              title: l10n.hostsEventDefaultsOfferValidity,
              contractExemption:
                  'Manager-only offer validity suggestion; the shared saver is gated.',
              body: preferences.offerValidityMinutes == null
                  ? l10n.hostsEventDefaultsChooseEachEvent
                  : minutes(preferences.offerValidityMinutes!),
              icon: CatchIcons.time,
              child: CatchChoiceInput<int>(
                values: validityChoices,
                itemLabelBuilder: minutes,
                selected: preferences.offerValidityMinutes == null
                    ? const <int>{}
                    : {preferences.offerValidityMinutes!},
                mode: CatchChipMode.single,
                autoClose: true,
                onChanged: editable
                    ? (selection) {
                        if (selection.isNotEmpty) {
                          update(
                            preferences.copyWith(
                              offerValidityMinutes: selection.single,
                            ),
                          );
                        }
                      }
                    : null,
              ),
            ),
            if (preferences.offerValidityMinutes != null)
              CatchField.action(
                copy: copy,
                title: l10n.hostsEventDefaultsClearValidity,
                body: l10n.hostsEventDefaultsChooseEachEvent,
                onTap: editable
                    ? () => update(
                        preferences.copyWith(offerValidityMinutes: null),
                      )
                    : null,
              ),
            CatchField.input(
              copy: copy,
              key: ValueKey(
                'manager-offer-template-${preferences.offerMessageTemplate}',
              ),
              title: l10n.hostsEventDefaultsMessageTemplate,
              contractExemption: 'Manager-only offer handoff text.',
              initialValue: preferences.offerMessageTemplate ?? '',
              inputHint: l10n.hostsEventDefaultsMessageTemplateHint,
              inputMode: inputMode,
              maxLines: 3,
              maxLength: 1000,
              onValidate: (value) => value != null && value.trim().length > 1000
                  ? l10n.hostsEventDefaultsTextTooLong
                  : null,
              onSubmitted: editable
                  ? (value) {
                      final trimmed = value.trim();
                      if (trimmed.length > 1000) return;
                      update(
                        preferences.copyWith(
                          offerMessageTemplate: trimmed.isEmpty
                              ? null
                              : trimmed,
                        ),
                      );
                    }
                  : null,
            ),
          ],
        ),
        CatchSection.fieldRows(
          title: l10n.hostsEventDefaultsPaymentHeading,
          children: [
            CatchField<EventCollectionPreference>.control(
              copy: copy,
              title: l10n.hostsEventDefaultsCollectionPreference,
              contractExemption:
                  'Manager-only collection suggestion; the shared saver is gated.',
              body: preferences.collectionPreference == null
                  ? l10n.hostsEventDefaultsChooseEachEvent
                  : collectionLabel(preferences.collectionPreference!),
              helperText: l10n.hostsEventDefaultsCollectionSuggestionHint,
              icon: CatchIcons.payment,
              child: CatchChoiceInput<EventCollectionPreference>(
                values: EventCollectionPreference.values,
                itemLabelBuilder: collectionLabel,
                selected: preferences.collectionPreference == null
                    ? const <EventCollectionPreference>{}
                    : {preferences.collectionPreference!},
                mode: CatchChipMode.single,
                autoClose: true,
                onChanged: editable
                    ? (selection) {
                        if (selection.isNotEmpty) {
                          update(
                            preferences.copyWith(
                              collectionPreference: selection.single,
                            ),
                          );
                        }
                      }
                    : null,
              ),
            ),
            if (preferences.collectionPreference != null)
              CatchField.action(
                copy: copy,
                title: l10n.hostsEventDefaultsClearCollection,
                body: l10n.hostsEventDefaultsChooseEachEvent,
                onTap: editable
                    ? () => update(
                        preferences.copyWith(collectionPreference: null),
                      )
                    : null,
              ),
            CatchField.input(
              copy: copy,
              key: ValueKey('manager-currency-${preferences.currency}'),
              title: l10n.hostsEventDefaultsCurrency,
              contractExemption: 'Manager-only currency suggestion.',
              initialValue: preferences.currency ?? '',
              inputHint: 'INR',
              inputMode: inputMode,
              maxLength: 3,
              textCapitalization: TextCapitalization.characters,
              onValidate: (value) =>
                  value == null ||
                      value.trim().isEmpty ||
                      RegExp(r'^[A-Z]{3}$').hasMatch(value.trim().toUpperCase())
                  ? null
                  : l10n.hostsEventDefaultsInvalidCurrency,
              onSubmitted: editable
                  ? (value) {
                      final normalized = value.trim().toUpperCase();
                      if (normalized.isNotEmpty &&
                          !RegExp(r'^[A-Z]{3}$').hasMatch(normalized)) {
                        return;
                      }
                      update(
                        preferences.copyWith(
                          currency: normalized.isEmpty ? null : normalized,
                        ),
                      );
                    }
                  : null,
            ),
            CatchField.input(
              copy: copy,
              key: ValueKey(
                'manager-payment-instructions-${preferences.paymentInstructions}',
              ),
              title: l10n.hostsEventDefaultsPaymentInstructions,
              contractExemption: 'Manager-only external payment instructions.',
              initialValue: preferences.paymentInstructions ?? '',
              inputHint: l10n.hostsEventDefaultsPaymentInstructionsHint,
              inputMode: inputMode,
              maxLines: 3,
              maxLength: 1000,
              onValidate: (value) => value != null && value.trim().length > 1000
                  ? l10n.hostsEventDefaultsTextTooLong
                  : null,
              onSubmitted: editable
                  ? (value) {
                      final trimmed = value.trim();
                      if (trimmed.length > 1000) return;
                      update(
                        preferences.copyWith(
                          paymentInstructions: trimmed.isEmpty ? null : trimmed,
                        ),
                      );
                    }
                  : null,
            ),
            CatchField.input(
              copy: copy,
              key: ValueKey(
                'manager-reusable-page-${preferences.reusablePaymentPage?.url}',
              ),
              title: l10n.hostsEventDefaultsReusablePaymentPage,
              contractExemption:
                  'Only a reusable public organizer payment page.',
              initialValue: preferences.reusablePaymentPage?.url ?? '',
              inputHint: l10n.hostsEventDefaultsReusablePageHint,
              helperText: l10n.hostsEventDefaultsReusablePagePrivacyNote,
              inputMode: inputMode,
              keyboardType: TextInputType.url,
              maxLength: 2048,
              onValidate: (value) {
                if (value == null || value.trim().isEmpty) return null;
                return isCanonicalPublicPaymentPageUrl(value.trim())
                    ? null
                    : l10n.hostsEventDefaultsInvalidReusablePage;
              },
              onSubmitted: editable
                  ? (value) async {
                      final trimmed = value.trim();
                      if (trimmed.isEmpty) {
                        update(preferences.copyWith(reusablePaymentPage: null));
                        return;
                      }
                      if (!isCanonicalPublicPaymentPageUrl(trimmed)) return;
                      if (trimmed == preferences.reusablePaymentPage?.url &&
                          preferences.reusablePaymentPage?.reusableForEvents ==
                              true) {
                        return;
                      }
                      // Do not send a clear while confirmation is pending:
                      // the replacement needs one revision-fenced command.
                      final confirmed = await showCatchAdaptiveDialog<bool>(
                        context: context,
                        title: l10n.hostsEventDefaultsReusableConfirmTitle,
                        message: l10n.hostsEventDefaultsReusableConfirmBody,
                        actions: [
                          CatchDialogAction(
                            label: l10n.hostsEventDefaultsReusableConfirmCancel,
                            value: false,
                          ),
                          CatchDialogAction(
                            label: l10n.hostsEventDefaultsReusableConfirmAccept,
                            value: true,
                          ),
                        ],
                        barrierDismissible: false,
                      );
                      if (!context.mounted || confirmed != true) return;
                      update(
                        preferences.copyWith(
                          reusablePaymentPage: ReusableOrganizerPaymentPage(
                            trimmed,
                            reusableForEvents: true,
                          ),
                        ),
                      );
                    }
                  : null,
            ),
          ],
        ),
      ],
    );
  }
}
