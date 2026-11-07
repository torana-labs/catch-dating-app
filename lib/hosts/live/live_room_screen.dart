import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_room_body.dart';
import 'package:catch_dating_app/hosts/live/live_screen.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The room on a tablet, on the night theme, from the console's own
/// controller: who is seated where and who still needs a place.
class HostLiveRoomScreen extends ConsumerWidget {
  const HostLiveRoomScreen({
    super.key,
    required this.organizer,
    required this.event,
    required this.onOpenGuests,
    this.now,
  });

  final Organizer organizer;
  final Event event;
  final VoidCallback onOpenGuests;

  /// A fixed clock for previews and tests; null reads the app clock.
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(hostLiveControllerProvider(event));
    final actions = HostLiveActions(
      context: context,
      ref: ref,
      organizer: organizer,
      event: event,
      onOpenGuests: onOpenGuests,
      now: now,
    );
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: CatchScreen(
        key: const ValueKey<String>('host-live-room-screen'),
        topBar: hostLiveTopBar(
          context,
          event: event,
          now: now ?? ref.read(appClockProvider).now(),
        ),
        body: HostLiveRoomBody(state: state, onView: actions.openView),
      ),
    );
  }
}
