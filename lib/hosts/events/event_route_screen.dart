import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/events/event_guests_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_screen.dart';
import 'package:catch_dating_app/hosts/events/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/events/host_event_route_destination.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_moving_night.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_screen.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

export 'package:catch_dating_app/hosts/events/host_event_manage_screen_state.dart'
    show HostEventManageSection;

typedef _HostEventManageRouteData = ({
  String? uid,
  Organizer? organizer,
  Event? event,
});

/// The event route: every event link resolves here to the redesigned screen
/// for its section. Setup opens the event workspace and guests the guest
/// lists, which read and check access themselves. For the live and report
/// sections it reads the signed-in host, the organizer and the event, and
/// opens the report, the one-room live console, the run console or the
/// crawl board. It shows loading, a read error with retry, an event that is
/// gone, and an event this host does not run.
class HostEventManageRouteScreen extends ConsumerWidget {
  const HostEventManageRouteScreen({
    super.key,
    required this.organizerId,
    required this.eventId,
    this.initialEvent,
    this.initialSection = HostEventManageSection.setup,
    this.referenceNow,
  });

  final String organizerId;
  final String eventId;
  final Event? initialEvent;
  final HostEventManageSection initialSection;
  final DateTime? referenceNow;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // The rebuilt workspace and guest lists read and check access themselves.
    if (hostEventRouteOpensWithoutEvent(initialSection)) {
      return initialSection == HostEventManageSection.guests
          ? HostEventGuestsScreen(
              request: HostEventRequest(
                organizerId: organizerId,
                eventId: eventId,
              ),
            )
          : HostEventWorkspaceScreen(
              organizerId: organizerId,
              eventId: eventId,
              now: referenceNow,
            );
    }
    final uidAsync = ref.watch(uidProvider);
    final organizerAsync = ref.watch(watchOrganizerProvider(organizerId));
    final eventAsync = ref.watch(watchEventProvider(eventId));
    final routeDataAsync = _hostEventManageRouteData(
      uid: catchAsyncStateFromAsyncValue(uidAsync),
      organizer: catchAsyncStateFromAsyncValue(organizerAsync),
      event: catchAsyncStateFromAsyncValue(eventAsync),
      initialEvent: initialEvent,
    );

    return CatchAsyncBoundary<_HostEventManageRouteData>(
      value: routeDataAsync,
      onRetry: () {
        ref.invalidate(uidProvider);
        ref.invalidate(watchOrganizerProvider(organizerId));
        ref.invalidate(watchEventProvider(eventId));
      },
      loadingBuilder: (_) => CatchRoot(
        child: CatchScreen(
          topBar: CatchTopBar(
            variant: CatchTopBarVariant.tool,
            title: context.l10n.hostsHostEventManageRouteScreenTitleManageEvent,
            back: CatchTopBarBack(label: context.l10n.hostEventsBack),
          ),
          bodyScrolls: false,
          body: const CatchPageBody.screen(child: CatchLoadingIndicator()),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRoot(
        child: CatchScreen(
          topBar: CatchTopBar(
            variant: CatchTopBarVariant.tool,
            title: context.l10n.hostsHostEventManageRouteScreenTitleManageEvent,
            back: CatchTopBarBack(label: context.l10n.hostEventsBack),
          ),
          bodyScrolls: false,
          body: CatchPageBody.screen(
            child: CatchLocalizedErrorState(
              error,
              context: AppErrorContext.event,
              onRetry: onBoundaryRetry,
            ),
          ),
        ),
      ),
      builder: (context, routeData) {
        final uid = routeData.uid;
        final organizer = routeData.organizer;
        final event = routeData.event;
        if (organizer == null || event == null) {
          return CatchRoot(
            child: CatchScreen(
              topBar: CatchTopBar(
                variant: CatchTopBarVariant.tool,
                title: context
                    .l10n
                    .hostsHostEventManageRouteScreenTitleManageEvent,
                back: CatchTopBarBack(label: context.l10n.hostEventsBack),
              ),
              bodyScrolls: false,
              body: CatchPageBody.screen(
                child: CatchErrorState(
                  title: context
                      .l10n
                      .hostsHostEventManageRouteScreenTitleEventNotFound,
                  message: context
                      .l10n
                      .hostsHostEventManageRouteScreenMessageThisHostedEventIs,
                  actions: const [CatchErrorBackButton()],
                ),
              ),
            ),
          );
        }

        if (uid == null || !organizer.isHostedBy(uid)) {
          return CatchRoot(
            child: CatchScreen(
              topBar: CatchTopBar(
                variant: CatchTopBarVariant.tool,
                title: context
                    .l10n
                    .hostsHostEventManageRouteScreenTitleManageEvent,
                back: CatchTopBarBack(label: context.l10n.hostEventsBack),
              ),
              bodyScrolls: false,
              body: CatchPageBody.screen(
                child: CatchErrorState(
                  title: context
                      .l10n
                      .hostsHostEventManageRouteScreenTitleActionUnavailable,
                  message: context
                      .l10n
                      .hostsHostEventManageRouteScreenMessageYouCanManageOnly,
                  icon: CatchIcons.block,
                  actions: const [CatchErrorBackButton()],
                ),
              ),
            ),
          );
        }

        final now = referenceNow ?? DateTime.now();
        final onBack =
            CatchWorkspaceBackScope.maybeOf(context) ??
            () => Navigator.of(context).maybePop();
        void openGuests() => context.pushNamed(
          Routes.hostEventRosterScreen.name,
          pathParameters: {'organizerId': organizer.id, 'eventId': event.id},
          extra: event,
        );
        final plan = ref.watch(watchEventSuccessPlanProvider(event.id)).value;
        final destination = hostEventRouteDestination(
          section: initialSection,
          phase: hostEventWorkspacePhaseFor(event: event, now: now),
          liveConsoleFits: hostLiveConsoleFits(event, plan: plan),
          movingNight: hostMovingNightView(event, plan: plan),
        );
        return switch (destination) {
          HostEventRouteDestination.report => HostEventReportScreen(
            organizer: organizer,
            event: event,
            onBack: CatchWorkspaceBackScope.maybeOf(context),
            now: referenceNow,
          ),
          HostEventRouteDestination.liveConsole => HostLiveScreen(
            organizer: organizer,
            event: event,
            onBack: onBack,
            onOpenGuests: openGuests,
            now: referenceNow,
          ),
          HostEventRouteDestination.runConsole => HostFormatsRunScreen(
            organizer: organizer,
            event: event,
            onBack: onBack,
            onOpenGuests: openGuests,
            now: referenceNow,
          ),
          HostEventRouteDestination.crawlBoard => HostFormatsCrawlScreen(
            organizer: organizer,
            event: event,
            onBack: onBack,
            onOpenGuests: openGuests,
            now: referenceNow,
          ),
          // Setup and guests return above.
          HostEventRouteDestination.workspace => HostEventWorkspaceScreen(
            organizerId: organizerId,
            eventId: eventId,
            now: referenceNow,
          ),
          HostEventRouteDestination.guests => HostEventGuestsScreen(
            request: HostEventRequest(
              organizerId: organizerId,
              eventId: eventId,
            ),
          ),
        };
      },
    );
  }
}

AsyncValue<_HostEventManageRouteData> _hostEventManageRouteData({
  required CatchAsyncState<String?> uid,
  required CatchAsyncState<Organizer?> organizer,
  required CatchAsyncState<Event?> event,
  required Event? initialEvent,
}) {
  final resolvedEvent = event.value ?? initialEvent;
  final error = uid.error ?? organizer.error ?? event.error;
  if (error != null) {
    final stackTrace =
        uid.stackTrace ??
        organizer.stackTrace ??
        event.stackTrace ??
        StackTrace.current;
    return AsyncError<_HostEventManageRouteData>(error, stackTrace);
  }
  final loading =
      uid.isLoading ||
      organizer.isLoading ||
      (event.isLoading && resolvedEvent == null);
  if (loading) return const AsyncLoading<_HostEventManageRouteData>();

  return AsyncData<_HostEventManageRouteData>((
    uid: uid.value,
    organizer: organizer.value,
    event: resolvedEvent,
  ));
}
