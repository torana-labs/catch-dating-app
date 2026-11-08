import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Event defaults in the board's idiom: what every new event starts with,
/// as value rows, and how guests pay as a choice that saves on change.
/// The rows hold only the defaults the organizer can set today.
class HostEventDefaultsBody extends StatelessWidget {
  const HostEventDefaultsBody({
    super.key,
    required this.state,
    required this.onCollection,
    required this.onEdit,
    required this.onRetry,
    this.saving = false,
  });

  final HostEventDefaultsState state;
  final ValueChanged<EventCollectionPreference> onCollection;

  /// Opens the editor for the text and number defaults.
  final VoidCallback onEdit;
  final VoidCallback onRetry;

  /// A defaults save is on its way.
  final bool saving;

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
    final notSet = l10n.hostEventsDefaultsNotSet;
    final duration = preferences.usualDurationMinutes;
    final validity = preferences.offerValidityMinutes;
    final edit = CatchSectionAction(
      label: l10n.hostEventsDefaultsEdit,
      onPressed: onEdit,
    );
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchSection(
            title: l10n.hostEventsDefaultsEachEvent,
            action: edit,
            children: [
              CatchIndexRow(
                title: l10n.hostEventsDefaultsLength,
                subtitle: l10n.hostEventsDefaultsLengthBody,
                value: duration == null
                    ? notSet
                    : EventFormatters.durationMinutes(duration),
                onTap: onEdit,
              ),
              CatchIndexRow(
                title: l10n.hostEventsDefaultsTimezone,
                value: preferences.timezone ?? notSet,
                onTap: onEdit,
              ),
              CatchIndexRow(
                title: l10n.hostEventsDefaultsVenue,
                value: preferences.preferredVenueId == null
                    ? notSet
                    : l10n.hostEventsDefaultsVenueSet,
                onTap: onEdit,
              ),
            ],
          ),
          CatchSection(
            title: l10n.hostEventsDefaultsOffers,
            action: edit,
            children: [
              CatchIndexRow(
                title: l10n.hostEventsDefaultsOfferHolds,
                subtitle: l10n.hostEventsDefaultsOfferHoldsBody,
                value: validity == null
                    ? notSet
                    : EventFormatters.durationMinutes(validity),
                onTap: onEdit,
              ),
              CatchIndexRow(
                title: l10n.hostEventsDefaultsOfferMessage,
                subtitle: preferences.offerMessageTemplate ?? notSet,
                onTap: onEdit,
              ),
            ],
          ),
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchText(
                l10n.hostEventsDefaultsHowGuestsPay,
                variant: CatchTextVariant.sectionTitle,
              ),
              CatchText(
                l10n.hostEventsDefaultsHowGuestsPayBody,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              for (final option in EventCollectionPreference.values)
                CatchChoiceTile(
                  key: ValueKey<String>('host-event-defaults-${option.name}'),
                  variant: CatchChoiceTileVariant.row,
                  title: _collectionTitle(context, option),
                  subtitle: _collectionBody(context, option),
                  selected: preferences.collectionPreference == option,
                  contractExemption:
                      'An organizer default committed by its own command.',
                  onTap: saving || preferences.collectionPreference == option
                      ? null
                      : () => onCollection(option),
                ),
            ],
          ),
          CatchSection(
            title: l10n.hostEventsDefaultsPayments,
            action: edit,
            children: [
              CatchIndexRow(
                title: l10n.hostEventsDefaultsCurrency,
                value: preferences.currency ?? notSet,
                onTap: onEdit,
              ),
              CatchIndexRow(
                title: l10n.hostEventsDefaultsInstructions,
                subtitle: preferences.paymentInstructions ?? notSet,
                onTap: onEdit,
              ),
              CatchIndexRow(
                title: l10n.hostEventsDefaultsPaymentPage,
                subtitle: preferences.reusablePaymentPage?.url ?? notSet,
                onTap: onEdit,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

String _collectionTitle(
  BuildContext context,
  EventCollectionPreference option,
) {
  final l10n = context.l10n;
  return switch (option) {
    EventCollectionPreference.catchCheckout => l10n.hostEventsDefaultsCheckout,
    EventCollectionPreference.reusablePage => l10n.hostEventsDefaultsPage,
    EventCollectionPreference.personalRequest => l10n.hostEventsDefaultsRequest,
    EventCollectionPreference.manualInstructions =>
      l10n.hostEventsDefaultsManual,
  };
}

String _collectionBody(BuildContext context, EventCollectionPreference option) {
  final l10n = context.l10n;
  return switch (option) {
    EventCollectionPreference.catchCheckout =>
      l10n.hostEventsDefaultsCheckoutBody,
    EventCollectionPreference.reusablePage => l10n.hostEventsDefaultsPageBody,
    EventCollectionPreference.personalRequest =>
      l10n.hostEventsDefaultsRequestBody,
    EventCollectionPreference.manualInstructions =>
      l10n.hostEventsDefaultsManualBody,
  };
}
