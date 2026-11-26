import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_dating_app/hosts/door/door_screen.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// One event a staff member works at, from the staff work list: the door
/// for that event, limited to what their grant allows.
///
/// It reads [hostEventOperatorAccessProvider] (the event, the organizer
/// managers and the account own `eventStaffGrants` row). A manager gets the
/// whole door; event staff get check-in and claim review only as their
/// grant allows, and the door says who they are and when the grant ends. A
/// cancelled event shows that instead of its guests. It writes nothing
/// itself; the door commands do, and the server checks each again.
class StaffEventScreen extends ConsumerWidget {
  const StaffEventScreen({super.key, required this.eventId});

  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(hostEventOperatorAccessProvider(eventId));
    if (access.value case final value? when value.eventStatus != 'cancelled') {
      return DoorScreen(
        organizerId: value.organizerId,
        eventId: eventId,
        access: DoorAccess.operator(value),
      );
    }
    final l10n = context.l10n;
    final Widget body = switch (access) {
      AsyncValue(hasValue: true) => CatchErrorState(
        title: l10n.hostsEventOperatorCancelledTitle,
        message: l10n.hostsEventOperatorCancelledMessage,
        icon: CatchIcons.eventUnavailable,
      ),
      AsyncValue(:final error?) => CatchLocalizedErrorState(
        error,
        context: AppErrorContext.event,
        // Retry the listeners access is built from, not the composition.
        onRetry: () => ref
          ..invalidate(hostOperatorEventProvider(eventId))
          ..invalidate(hostOperatorOrganizerManagerIdsProvider)
          ..invalidate(hostOwnEventStaffGrantProvider),
      ),
      _ => const CatchLoadingIndicator(),
    };
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: CatchScreen(
        key: const ValueKey<String>('staff-event-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: access.value?.title ?? l10n.doorTitle,
          back: CatchTopBarBack(
            label: l10n.hostStaffBackToJobs,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
        ),
        body: CatchPageBody.screen(child: body),
      ),
    );
  }
}
