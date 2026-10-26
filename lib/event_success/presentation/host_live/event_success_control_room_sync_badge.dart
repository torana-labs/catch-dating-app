import 'package:catch_dating_app/event_success/presentation/event_success_control_room_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessControlRoomSyncBadge extends StatelessWidget {
  const EventSuccessControlRoomSyncBadge({super.key, required this.state});

  final EventSuccessControlRoomSyncState state;

  @override
  Widget build(BuildContext context) {
    final (icon, label) = switch (state) {
      EventSuccessControlRoomSyncState.synced => (
        CatchIcons.success,
        context.l10n.eventSuccessControlRoomSynced,
      ),
      EventSuccessControlRoomSyncState.syncing => (
        CatchIcons.sync,
        context.l10n.eventSuccessControlRoomSyncing,
      ),
      EventSuccessControlRoomSyncState.failed => (
        CatchIcons.error,
        context.l10n.eventSuccessControlRoomSaveFailed,
      ),
      EventSuccessControlRoomSyncState.offline => (
        CatchIcons.offline,
        context.l10n.eventSuccessControlRoomOffline,
      ),
      EventSuccessControlRoomSyncState.conflict => (
        CatchIcons.error,
        context.l10n.eventSuccessControlRoomNeedsReview,
      ),
    };
    return Semantics(
      liveRegion: true,
      label: label,
      child: CatchBadge.onDarkStatus(
        label: context.l10n.eventSuccessControlRoomLiveSyncStatus(
          syncStatus: label,
        ),
        icon: icon,
      ),
    );
  }
}
