import 'package:catch_dating_app/hosts/events/event_publish_state.dart';
import 'package:catch_dating_app/hosts/events/event_settings_copy.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Who can see and book: everyone, people with the link, or only the
/// organizer's team while the event is unpublished; who can book; and the
/// guest settings. A choice saves as soon as it is made.
class HostEventPublishBody extends StatelessWidget {
  const HostEventPublishBody({
    super.key,
    required this.state,
    required this.onVisibility,
    required this.onRetry,
    this.onBookingMode,
    this.onShowGuestList,
    this.onHidePrice,
    this.saving = false,
  });

  final HostEventPublishState state;
  final ValueChanged<HostEventVisibility> onVisibility;
  final ValueChanged<HostEventBookingMode>? onBookingMode;
  final ValueChanged<bool>? onShowGuestList;
  final ValueChanged<bool>? onHidePrice;
  final VoidCallback onRetry;

  /// The publication command is on its way.
  final bool saving;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostEventPublishStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostEventPublishStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostEventsWorkspaceErrorTitle,
            message: l10n.hostEventsErrorBody,
            retryLabel: l10n.hostEventsRetry,
            onRetry: onRetry,
          ),
        );
      case HostEventPublishStatus.missing:
        return CatchPageBody.screen(
          child: CatchEmptyState(
            icon: CatchIcons.eventUnavailable,
            title: l10n.hostEventsPublishPendingTitle,
            message: l10n.hostEventsPublishPendingBody,
          ),
        );
      case HostEventPublishStatus.ready:
        break;
    }
    final canChoose = !saving && state.setupRevision != null;
    final visibility = state.visibility;
    final canReach = state.published || state.canPublish;
    VoidCallback? pick(HostEventVisibility choice) {
      if (!canChoose || visibility == choice) return null;
      if (choice != HostEventVisibility.team && !canReach) return null;
      return () => onVisibility(choice);
    }

    final canBook = canChoose && state.canChangeBooking;
    VoidCallback? book(HostEventBookingMode mode) =>
        canBook && state.bookingMode != mode && onBookingMode != null
        ? () => onBookingMode!(mode)
        : null;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchText(
                l10n.hostEventsPublishWhoCanFind,
                variant: CatchTextVariant.labelAction,
              ),
              CatchChoiceTile(
                key: const ValueKey<String>('host-event-publish-everyone'),
                variant: CatchChoiceTileVariant.row,
                title: l10n.hostEventsPublishEveryone,
                subtitle: canReach
                    ? l10n.hostEventsPublishEveryoneBody
                    : l10n.hostEventsPublishNotReady,
                selected: visibility == HostEventVisibility.everyone,
                contractExemption:
                    'A publication choice committed by its own command.',
                onTap: pick(HostEventVisibility.everyone),
              ),
              CatchChoiceTile(
                key: const ValueKey<String>('host-event-publish-link'),
                variant: CatchChoiceTileVariant.row,
                title: HostEventSettingsCopy.linkTitle,
                subtitle: canReach
                    ? HostEventSettingsCopy.linkBody
                    : l10n.hostEventsPublishNotReady,
                selected: visibility == HostEventVisibility.link,
                contractExemption:
                    'A publication choice committed by its own command.',
                onTap: pick(HostEventVisibility.link),
              ),
              CatchChoiceTile(
                key: const ValueKey<String>('host-event-publish-team'),
                variant: CatchChoiceTileVariant.row,
                title: l10n.hostEventsPublishTeam,
                subtitle: l10n.hostEventsPublishTeamBody,
                selected: visibility == HostEventVisibility.team,
                contractExemption:
                    'A publication choice committed by its own command.',
                onTap: pick(HostEventVisibility.team),
              ),
            ],
          ),
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              const CatchText(
                HostEventSettingsCopy.whoCanBook,
                variant: CatchTextVariant.labelAction,
              ),
              CatchChoiceTile(
                key: const ValueKey<String>('host-event-publish-book-anyone'),
                variant: CatchChoiceTileVariant.row,
                title: HostEventSettingsCopy.anyone,
                subtitle: HostEventSettingsCopy.anyoneBody,
                selected:
                    state.bookingMode == null ||
                    state.bookingMode == HostEventBookingMode.anyone,
                contractExemption:
                    'A booking choice committed by its own command.',
                onTap: book(HostEventBookingMode.anyone),
              ),
              CatchChoiceTile(
                key: const ValueKey<String>(
                  'host-event-publish-book-followers',
                ),
                variant: CatchChoiceTileVariant.row,
                title: HostEventSettingsCopy.followersFirst,
                subtitle: HostEventSettingsCopy.followersFirstBody,
                selected:
                    state.bookingMode == HostEventBookingMode.followersFirst,
                contractExemption:
                    'A booking choice committed by its own command.',
                onTap: book(HostEventBookingMode.followersFirst),
              ),
              CatchChoiceTile(
                key: const ValueKey<String>('host-event-publish-book-ask'),
                variant: CatchChoiceTileVariant.row,
                title: HostEventSettingsCopy.askFirst,
                subtitle: HostEventSettingsCopy.askFirstBody,
                selected: state.bookingMode == HostEventBookingMode.askFirst,
                contractExemption:
                    'A booking choice committed by its own command.',
                onTap: book(HostEventBookingMode.askFirst),
              ),
            ],
          ),
          CatchStack(
            gap: CatchStackGap.none,
            children: [
              CatchIndexRow(
                title: HostEventSettingsCopy.showGuestList,
                subtitle: HostEventSettingsCopy.showGuestListBody,
                onTap: null,
                trailing: CatchToggleInput(
                  key: const ValueKey<String>('host-event-publish-guest-list'),
                  value: state.showGuestList,
                  semanticLabel: HostEventSettingsCopy.showGuestList,
                  contractExemption:
                      'An event setting committed by the publication command.',
                  onChanged: canChoose ? onShowGuestList : null,
                ),
              ),
              CatchIndexRow(
                title: HostEventSettingsCopy.hidePrice,
                onTap: null,
                trailing: CatchToggleInput(
                  key: const ValueKey<String>('host-event-publish-hide-price'),
                  value: state.priceHiddenUntilBookingOpens,
                  semanticLabel: HostEventSettingsCopy.hidePrice,
                  contractExemption:
                      'An event setting committed by the publication command.',
                  onChanged: canChoose ? onHidePrice : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
