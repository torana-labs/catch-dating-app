import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/events/events_body.dart';
import 'package:catch_dating_app/hosts/events/events_controller.dart';
import 'package:catch_dating_app/hosts/events/events_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The Host app's Events tab: every coming event, the drafts still being
/// set up and the events that are over, for the selected organizer.
///
/// It resolves who is signed in and which organizer is selected, keeps the
/// chosen list, watches [hostEventsControllerProvider] and turns the body's
/// callbacks into navigation: an event opens its workspace, a draft opens
/// creation where it stopped, New opens creation. Drafts and past events are
/// read again when either returns.
class HostEventsTabScreen extends ConsumerStatefulWidget {
  const HostEventsTabScreen({super.key, this.initialOrganizerId, this.now});

  final String? initialOrganizerId;

  /// A fixed clock for previews and tests; null reads the device clock.
  final DateTime? now;

  @override
  ConsumerState<HostEventsTabScreen> createState() =>
      _HostEventsTabScreenState();
}

class _HostEventsTabScreenState extends ConsumerState<HostEventsTabScreen> {
  HostEventsTab _tab = HostEventsTab.upcoming;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final now = widget.now ?? DateTime.now();
    final uidValue = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = uidValue.value;
    final organizersValue = uid == null
        ? const CatchAsyncState<List<Organizer>>.loading()
        : catchAsyncStateFromAsyncValue(
            ref.watch(hostOperableOrganizersProvider(uid)),
          );
    final selectedId = uid == null
        ? null
        : ref.watch(hostOrganizerSelectionProvider(uid));
    final organizers = organizersValue.value;
    final organizer = organizers == null
        ? null
        : resolveSelectedHostOrganizer(
            organizers,
            selectedOrganizerId: selectedId,
            preferredOrganizerId: selectedId == null
                ? widget.initialOrganizerId
                : null,
          );

    final Widget body;
    if (uidValue.isTerminalError && uid == null) {
      body = CatchLocalizedErrorState(
        uidValue.error!,
        context: AppErrorContext.auth,
        onRetry: () => ref.invalidate(uidProvider),
      );
    } else if (organizersValue.isTerminalError && organizers == null) {
      body = CatchLocalizedErrorState(
        organizersValue.error!,
        context: AppErrorContext.organizer,
        onRetry: () => hostOperableOrganizerReads(uid!).forEach(ref.invalidate),
      );
    } else if (organizer == null && organizers != null) {
      body = CatchPageBody.screen(
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: l10n.hostEventsNoOrganizerTitle,
          message: l10n.hostEventsNoOrganizerBody,
          actions: [
            CatchButton(
              label: l10n.hostEventsCreateOrganizer,
              leading: CatchIcon(CatchIcons.add),
              onPressed: () =>
                  context.pushNamed(Routes.hostCreateOrganizerScreen.name),
            ),
          ],
        ),
      );
    } else {
      final request = organizer == null
          ? null
          : HostEventsRequest(organizerId: organizer.id, now: now);
      body = HostEventsBody(
        state: request == null
            ? const HostEventsState.loading()
            : ref.watch(hostEventsControllerProvider(request)),
        now: now,
        tab: _tab,
        onTab: (tab) => setState(() => _tab = tab),
        onOpenEvent: (event) {
          if (organizer != null) unawaited(_openEvent(organizer, event));
        },
        onOpenDraft: (item) {
          if (organizer != null) {
            unawaited(_create(organizer, savedEventId: item.eventId));
          }
        },
        onOpenProgramme: (programme) => context.pushNamed(
          Routes.hostProgramWorkspaceScreen.name,
          pathParameters: {'programId': programme.programId},
        ),
        onNewProgramme: () {
          if (organizer == null) return;
          context.pushNamed(
            Routes.hostCreateProgramScreen.name,
            pathParameters: {'organizerId': organizer.id},
          );
        },
        onRetry: () {
          if (request != null) retryHostEventsReads(ref, request);
        },
      );
    }

    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-events-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tabHome,
          kicker: organizer?.name,
          title: l10n.hostEventsTitle,
          actions: [
            CatchButton(
              label: l10n.hostEventsNew,
              leading: CatchIcon(CatchIcons.add),
              size: CatchButtonSize.md,
              onPressed: organizer == null
                  ? null
                  : () => unawaited(_create(organizer)),
            ),
          ],
        ),
        bodyScrolls: false,
        body: body,
      ),
    );
  }

  /// Reads drafts and past events again once the tab is shown. The pushed
  /// route's future completes as its exit starts, while this tab's
  /// listeners are still paused; reading again then would rebuild them
  /// mid-frame when they resume, so it waits for the tab to tick again.
  void _refreshHistoryWhenShown() {
    if (!mounted) return;
    if (TickerMode.getValuesNotifier(context).value.enabled) {
      refreshHostEventsHistory(ref);
      return;
    }
    SchedulerBinding.instance.addPostFrameCallback(
      (_) => _refreshHistoryWhenShown(),
    );
  }

  Future<void> _openEvent(Organizer organizer, Event event) async {
    await context.pushNamed<void>(
      Routes.hostAppEventManageScreen.name,
      pathParameters: {'organizerId': organizer.id, 'eventId': event.id},
      extra: event,
    );
    _refreshHistoryWhenShown();
  }

  Future<void> _create(Organizer organizer, {String? savedEventId}) async {
    await context.pushNamed<void>(
      Routes.hostCreateEventScreen.name,
      pathParameters: {'organizerId': organizer.id},
      extra: HostCreateEventRouteArguments(
        initialOrganizer: organizer,
        initialSavedEventId: savedEventId,
        promptForDrafts: savedEventId == null,
      ),
    );
    _refreshHistoryWhenShown();
  }
}
