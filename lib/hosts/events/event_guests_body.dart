import 'package:catch_dating_app/contexts/audience/parts/host_event_guest_row.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/hosts/events/event_guests_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/events/widgets/host_event_tab_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The event's guests in board order: the views, four numbers, the lists
/// with their counts, the chosen list's rows with Let in or Offer, and
/// Message all and Download the list.
///
/// Tapping a guest opens them ([onGuest]); on the waitlist, Offer the next
/// places offers every open place at once when there are two or more.
class HostEventGuestsBody extends StatelessWidget {
  const HostEventGuestsBody({
    super.key,
    required this.state,
    required this.list,
    required this.onView,
    required this.onList,
    required this.onLetIn,
    required this.onOffer,
    required this.onMessageAll,
    required this.onDownload,
    required this.onRetry,
    this.pending = const <String>{},
    this.downloading = false,
    this.offeringAll = false,
    this.onOfferAll,
    this.onGuest,
  });

  final HostEventGuestsState state;
  final HostEventGuestList list;
  final ValueChanged<HostEventView> onView;
  final ValueChanged<HostEventGuestList> onList;
  final ValueChanged<HostEventGuest> onLetIn;
  final ValueChanged<HostEventGuest> onOffer;

  /// Offers the places left to the guests first in line; null hides it.
  final VoidCallback? onOfferAll;

  /// Opens a guest who has an account; null leaves the rows still.
  final ValueChanged<HostEventGuest>? onGuest;
  final VoidCallback onMessageAll;
  final VoidCallback onDownload;
  final VoidCallback onRetry;

  /// Guests whose Let in or Offer is on its way.
  final Set<String> pending;
  final bool downloading;

  /// Offer the next places is on its way.
  final bool offeringAll;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostEventGuestsStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostEventGuestsStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostEventsWorkspaceErrorTitle,
            message: l10n.hostEventsErrorBody,
            retryLabel: l10n.hostEventsRetry,
            onRetry: onRetry,
          ),
        );
      case HostEventGuestsStatus.ready:
        break;
    }
    final event = state.event;
    final format = event == null
        ? null
        : catchFormatForActivity(event.activityKind);
    final placesLeft = state.placesLeft;
    final firstTime = state.firstTime;
    final offerAll = list == HostEventGuestList.waitlist
        ? state.offerAllUids.length
        : 0;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          HostEventTabBar(selected: HostEventView.guests, onView: onView),
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              CatchMetricTile.stat(
                label: l10n.hostEventsGuestsStatBooked,
                value: '${state.booked}',
                mode: CatchMetricTileMode.plain,
              ),
              if (placesLeft != null)
                CatchMetricTile.stat(
                  label: l10n.hostEventsGuestsStatLeft,
                  value: '$placesLeft',
                  mode: CatchMetricTileMode.plain,
                ),
              CatchMetricTile.stat(
                label: l10n.hostEventsGuestsStatWaitlist,
                value: '${state.listOf(HostEventGuestList.waitlist).length}',
                mode: CatchMetricTileMode.plain,
              ),
              if (firstTime != null)
                CatchMetricTile.stat(
                  label: l10n.hostEventsGuestsStatFirstTime,
                  value: '$firstTime',
                  mode: CatchMetricTileMode.plain,
                ),
            ],
          ),
          CatchPageTabBar<HostEventGuestList>.segmented(
            selected: list,
            label: l10n.hostEventsGuestsListsLabel,
            size: CatchPageTabBarSize.sm,
            fill: false,
            onChanged: onList,
            options: [
              for (final value in HostEventGuestList.values)
                CatchOption<HostEventGuestList>(
                  value: value,
                  label: switch (value) {
                    HostEventGuestList.booked => l10n.hostEventsGuestsBooked,
                    HostEventGuestList.asked => l10n.hostEventsGuestsAsked,
                    HostEventGuestList.waitlist =>
                      l10n.hostEventsGuestsWaitlist,
                    HostEventGuestList.cancelled =>
                      l10n.hostEventsGuestsCancelled,
                  },
                  count: state.listOf(value).length,
                ),
            ],
          ),
          if (offerAll > 1 && onOfferAll != null)
            CatchButton(
              key: const ValueKey<String>('host-event-guests-offer-all'),
              label: l10n.hostEventsGuestsOfferAll(count: offerAll),
              variant: CatchButtonVariant.secondary,
              leading: CatchIcon(CatchIcons.addPerson),
              fullWidth: true,
              onPressed: offeringAll ? null : onOfferAll,
            ),
          CatchSection(
            empty: l10n.hostEventsGuestsEmpty,
            children: [
              for (final guest in state.listOf(list))
                HostEventGuestRow(
                  key: ValueKey<String>('host-event-guest-${guest.id}'),
                  name: guest.name,
                  photoUrl: guest.photoUrl,
                  format: format,
                  insight: guest.insight,
                  action: _action(context, guest),
                  onTap: guest.uid == null || onGuest == null
                      ? null
                      : () => onGuest!(guest),
                ),
            ],
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            children: [
              Expanded(
                child: CatchButton(
                  label: l10n.hostEventsGuestsMessageAll(count: state.booked),
                  leading: CatchIcon(CatchIcons.chat),
                  fullWidth: true,
                  onPressed: state.booked == 0 ? null : onMessageAll,
                ),
              ),
              CatchButton(
                label: l10n.hostEventsGuestsDownload,
                variant: CatchButtonVariant.secondary,
                leading: CatchIcon(CatchIcons.download),
                onPressed: downloading ? null : onDownload,
              ),
            ],
          ),
        ],
      ),
    );
  }

  CatchIndexRowAction? _action(BuildContext context, HostEventGuest guest) {
    final l10n = context.l10n;
    if (guest.uid == null) return null;
    final busy = pending.contains(guest.id);
    return switch (list) {
      HostEventGuestList.asked => CatchIndexRowAction(
        label: l10n.hostEventsGuestsLetIn,
        variant: CatchIndexRowActionVariant.primary,
        onPressed: busy ? null : () => onLetIn(guest),
      ),
      HostEventGuestList.waitlist when guest.offered => CatchIndexRowAction(
        label: l10n.hostEventsGuestsOffered,
      ),
      HostEventGuestList.waitlist => CatchIndexRowAction(
        label: l10n.hostEventsGuestsOffer,
        onPressed: busy || offeringAll ? null : () => onOffer(guest),
      ),
      HostEventGuestList.booked || HostEventGuestList.cancelled => null,
    };
  }
}
