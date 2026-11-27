import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// The text and number event defaults as editable field rows: usual length,
/// time zone and usual venue, how long an offer holds and its message, and
/// the collection method, currency, payment instructions and reusable
/// payment page. Each change goes to [onChange]; a null [onChange] (a save
/// on its way, or one still unresolved) shows the values read-only.
///
/// A new reusable payment page is only saved after the host confirms it can
/// be shared with different guests for different events.
class HostEventDefaultsDetailsBody extends StatelessWidget {
  const HostEventDefaultsDetailsBody({
    super.key,
    required this.state,
    required this.onRetry,
    this.onChange,
    this.unresolved = false,
  });

  final HostEventDefaultsState state;
  final VoidCallback onRetry;
  final ValueChanged<ManagerEventSetupPreferences>? onChange;

  /// A save this phone could not confirm waits on Event defaults; the
  /// editor says so and stays read-only until it goes through.
  final bool unresolved;

  static const durationChoices = <int>[15, 30, 45, 60, 90, 120, 180, 240];
  static const validityChoices = <int>[5, 15, 30, 60, 120, 1440, 2880, 10080];

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostEventDefaultsStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostEventDefaultsStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostEventsDefaultsErrorTitle,
            message: l10n.hostEventsErrorBody,
            retryLabel: l10n.hostEventsRetry,
            onRetry: onRetry,
          ),
        );
      case HostEventDefaultsStatus.missing:
        return CatchPageBody.screen(
          child: CatchEmptyState(
            icon: CatchIcons.rules,
            title: l10n.hostEventsDefaultsPendingTitle,
            message: l10n.hostEventsDefaultsPendingBody,
          ),
        );
      case HostEventDefaultsStatus.ready:
        break;
    }
    final preferences = state.preferences!;
    final copy = catchFieldCopy(l10n);
    final change = onChange;
    final duration = preferences.usualDurationMinutes;
    final validity = preferences.offerValidityMinutes;
    return CatchPageBody.screen(
      child: CatchSectionList(
        emptyStateOmitted: true,
        children: [
          if (unresolved)
            CatchNotice.inline(
              key: const ValueKey<String>('event-defaults-details-unresolved'),
              tone: CatchNoticeTone.warning,
              title: l10n.hostsEventDefaultsPendingUpdate,
              body: l10n.hostsEventDefaultsPendingUpdateBody,
            ),
          CatchSection.fieldRows(
            first: true,
            title: l10n.hostEventsDefaultsEachEvent,
            children: [
              CatchField<int>.control(
                copy: copy,
                key: const ValueKey<String>('event-defaults-duration'),
                title: l10n.hostsEventDefaultsUsualDuration,
                contractExemption:
                    'Organizer event default saved by its command.',
                body: duration == null
                    ? l10n.hostsEventDefaultsChooseEachEvent
                    : _minutes(l10n, duration),
                icon: CatchIcons.time,
                child: CatchChoiceInput<int>(
                  values: durationChoices,
                  itemLabelBuilder: (value) => _minutes(l10n, value),
                  selected: duration == null ? const <int>{} : {duration},
                  mode: CatchChipMode.single,
                  autoClose: true,
                  onChanged: change == null
                      ? null
                      : (selection) {
                          if (selection.isEmpty) return;
                          change(
                            preferences.copyWith(
                              usualDurationMinutes: selection.single,
                            ),
                          );
                        },
                ),
              ),
              if (duration != null)
                CatchField.action(
                  copy: copy,
                  key: const ValueKey<String>('event-defaults-clear-duration'),
                  title: l10n.hostsEventDefaultsClearDuration,
                  body: l10n.hostsEventDefaultsChooseEachEvent,
                  onTap: change == null
                      ? null
                      : () => change(
                          preferences.copyWith(usualDurationMinutes: null),
                        ),
                ),
              CatchField.input(
                copy: copy,
                key: ValueKey<String>(
                  'event-defaults-timezone-${preferences.timezone}',
                ),
                title: l10n.hostsPrivateEventTimezone,
                contractExemption:
                    'Organizer event default saved by its command.',
                initialValue: preferences.timezone ?? '',
                inputHint: l10n.hostsPrivateEventTimezoneHint,
                helperText: l10n.hostsEventDefaultsTimezoneHint,
                inputMode: _inputMode,
                maxLength: 100,
                onSubmitted: change == null
                    ? null
                    : (value) {
                        final trimmed = value.trim();
                        if (trimmed.length > 100) return;
                        change(
                          preferences.copyWith(
                            timezone: trimmed.isEmpty ? null : trimmed,
                          ),
                        );
                      },
              ),
              CatchField.read(
                copy: copy,
                title: l10n.hostsEventDefaultsPreferredVenue,
                body: preferences.preferredVenueId == null
                    ? l10n.hostsEventDefaultsVenueUnavailable
                    : l10n.hostsEventDefaultsVenueSaved,
                icon: CatchIcons.location,
              ),
              if (preferences.preferredVenueId != null)
                CatchField.action(
                  copy: copy,
                  key: const ValueKey<String>('event-defaults-clear-venue'),
                  title: l10n.hostsEventDefaultsClearVenue,
                  body: l10n.hostsEventDefaultsChooseEachEvent,
                  onTap: change == null
                      ? null
                      : () => change(
                          preferences.copyWith(preferredVenueId: null),
                        ),
                ),
            ],
          ),
          CatchSection.fieldRows(
            title: l10n.hostEventsDefaultsOffers,
            children: [
              CatchField<int>.control(
                copy: copy,
                key: const ValueKey<String>('event-defaults-offer-validity'),
                title: l10n.hostsEventDefaultsOfferValidity,
                contractExemption:
                    'Organizer event default saved by its command.',
                body: validity == null
                    ? l10n.hostsEventDefaultsChooseEachEvent
                    : _minutes(l10n, validity),
                icon: CatchIcons.time,
                child: CatchChoiceInput<int>(
                  values: validityChoices,
                  itemLabelBuilder: (value) => _minutes(l10n, value),
                  selected: validity == null ? const <int>{} : {validity},
                  mode: CatchChipMode.single,
                  autoClose: true,
                  onChanged: change == null
                      ? null
                      : (selection) {
                          if (selection.isEmpty) return;
                          change(
                            preferences.copyWith(
                              offerValidityMinutes: selection.single,
                            ),
                          );
                        },
                ),
              ),
              if (validity != null)
                CatchField.action(
                  copy: copy,
                  key: const ValueKey<String>('event-defaults-clear-validity'),
                  title: l10n.hostsEventDefaultsClearValidity,
                  body: l10n.hostsEventDefaultsChooseEachEvent,
                  onTap: change == null
                      ? null
                      : () => change(
                          preferences.copyWith(offerValidityMinutes: null),
                        ),
                ),
              CatchField.input(
                copy: copy,
                key: ValueKey<String>(
                  'event-defaults-offer-message-${preferences.offerMessageTemplate}',
                ),
                title: l10n.hostsEventDefaultsMessageTemplate,
                contractExemption:
                    'Organizer event default saved by its command.',
                initialValue: preferences.offerMessageTemplate ?? '',
                inputHint: l10n.hostsEventDefaultsMessageTemplateHint,
                inputMode: _inputMode,
                maxLines: 3,
                maxLength: 1000,
                onValidate: (value) => _tooLong(l10n, value),
                onSubmitted: change == null
                    ? null
                    : (value) {
                        final trimmed = value.trim();
                        if (trimmed.length > 1000) return;
                        change(
                          preferences.copyWith(
                            offerMessageTemplate: trimmed.isEmpty
                                ? null
                                : trimmed,
                          ),
                        );
                      },
              ),
            ],
          ),
          CatchSection.fieldRows(
            title: l10n.hostEventsDefaultsPayments,
            children: [
              if (preferences.collectionPreference != null)
                CatchField.action(
                  copy: copy,
                  key: const ValueKey<String>(
                    'event-defaults-clear-collection',
                  ),
                  title: l10n.hostsEventDefaultsClearCollection,
                  body: l10n.hostsEventDefaultsCollectionSuggestionHint,
                  onTap: change == null
                      ? null
                      : () => change(
                          preferences.copyWith(collectionPreference: null),
                        ),
                ),
              CatchField.input(
                copy: copy,
                key: ValueKey<String>(
                  'event-defaults-currency-${preferences.currency}',
                ),
                title: l10n.hostsEventDefaultsCurrency,
                contractExemption:
                    'Organizer event default saved by its command.',
                initialValue: preferences.currency ?? '',
                inputHint: 'INR',
                inputMode: _inputMode,
                maxLength: 3,
                textCapitalization: TextCapitalization.characters,
                onValidate: (value) {
                  final normalized = value?.trim().toUpperCase() ?? '';
                  return normalized.isEmpty || _currency.hasMatch(normalized)
                      ? null
                      : l10n.hostsEventDefaultsInvalidCurrency;
                },
                onSubmitted: change == null
                    ? null
                    : (value) {
                        final normalized = value.trim().toUpperCase();
                        if (normalized.isNotEmpty &&
                            !_currency.hasMatch(normalized)) {
                          return;
                        }
                        change(
                          preferences.copyWith(
                            currency: normalized.isEmpty ? null : normalized,
                          ),
                        );
                      },
              ),
              CatchField.input(
                copy: copy,
                key: ValueKey<String>(
                  'event-defaults-instructions-${preferences.paymentInstructions}',
                ),
                title: l10n.hostsEventDefaultsPaymentInstructions,
                contractExemption:
                    'Organizer event default saved by its command.',
                initialValue: preferences.paymentInstructions ?? '',
                inputHint: l10n.hostsEventDefaultsPaymentInstructionsHint,
                inputMode: _inputMode,
                maxLines: 3,
                maxLength: 1000,
                onValidate: (value) => _tooLong(l10n, value),
                onSubmitted: change == null
                    ? null
                    : (value) {
                        final trimmed = value.trim();
                        if (trimmed.length > 1000) return;
                        change(
                          preferences.copyWith(
                            paymentInstructions: trimmed.isEmpty
                                ? null
                                : trimmed,
                          ),
                        );
                      },
              ),
              CatchField.input(
                copy: copy,
                key: ValueKey<String>(
                  'event-defaults-payment-page-${preferences.reusablePaymentPage?.url}',
                ),
                title: l10n.hostsEventDefaultsReusablePaymentPage,
                contractExemption:
                    'Only a reusable public organizer payment page.',
                initialValue: preferences.reusablePaymentPage?.url ?? '',
                inputHint: l10n.hostsEventDefaultsReusablePageHint,
                helperText: l10n.hostsEventDefaultsReusablePagePrivacyNote,
                inputMode: _inputMode,
                keyboardType: TextInputType.url,
                maxLength: 2048,
                onValidate: (value) {
                  final trimmed = value?.trim() ?? '';
                  return trimmed.isEmpty ||
                          isCanonicalPublicPaymentPageUrl(trimmed)
                      ? null
                      : l10n.hostsEventDefaultsInvalidReusablePage;
                },
                onSubmitted: change == null
                    ? null
                    : (value) =>
                          _submitPaymentPage(context, preferences, value),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _submitPaymentPage(
    BuildContext context,
    ManagerEventSetupPreferences preferences,
    String value,
  ) async {
    final change = onChange;
    if (change == null) return;
    final l10n = context.l10n;
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      change(preferences.copyWith(reusablePaymentPage: null));
      return;
    }
    if (!isCanonicalPublicPaymentPageUrl(trimmed)) return;
    final current = preferences.reusablePaymentPage;
    if (trimmed == current?.url && current?.reusableForEvents == true) return;
    // Nothing is sent while the host decides: the replacement goes as one
    // revision-fenced save.
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
    change(
      preferences.copyWith(
        reusablePaymentPage: ReusableOrganizerPaymentPage(
          trimmed,
          reusableForEvents: true,
        ),
      ),
    );
  }

  CatchTextInputMode get _inputMode => onChange == null
      ? CatchTextInputMode.inactive
      : CatchTextInputMode.editable;

  static final _currency = RegExp(r'^[A-Z]{3}$');

  static String _minutes(AppLocalizations l10n, int value) =>
      l10n.hostsEventDefaultsMinutes(minutes: value);

  static String? _tooLong(AppLocalizations l10n, String? value) =>
      value != null && value.trim().length > 1000
      ? l10n.hostsEventDefaultsTextTooLong
      : null;
}
