import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_start_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_flow.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalized_layout.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_view_model.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_body.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostTodayScreen extends ConsumerStatefulWidget {
  const HostTodayScreen({super.key, this.initialOrganizerId, this.now});

  final String? initialOrganizerId;
  final DateTime? now;

  @override
  ConsumerState<HostTodayScreen> createState() => _HostTodayScreenState();
}

class _HostTodayScreenState extends ConsumerState<HostTodayScreen>
    with WidgetsBindingObserver {
  late DateTime _clockNow;
  late DateTime _sessionBoundary;
  Timer? _clockTimer;
  GoRouter? _router;
  late final ProviderSubscription<AsyncValue<String?>> _identity;
  ProviderSubscription<String?>? _selection;
  ProviderSubscription<AsyncValue<List<Club>>>? _organizers;
  String? _observedAccount;
  int _scopeEpoch = 0;
  int _routeEpoch = 0;
  bool _wasTodayIndex = false;
  bool _refreshQueued = false;
  ({HostTodayFeedRequest request, int epoch})? _pendingRefresh;
  AppLifecycleState? _lifecycle;

  bool get _isTodayIndex =>
      _router?.state.name == Routes.hostTodayScreen.name &&
      !_router!.state.uri.queryParameters.containsKey('eventId');

  @override
  void initState() {
    super.initState();
    _resetClock();
    _lifecycle = WidgetsBinding.instance.lifecycleState;
    WidgetsBinding.instance.addObserver(this);
    _identity = ref.listenManual(uidProvider, (_, next) {
      _scopeEpoch += 1;
      final account = next.asData?.value;
      if (_observedAccount == account) return;
      _observedAccount = account;
      _selection?.close();
      _organizers?.close();
      _selection = account == null
          ? null
          : ref.listenManual(hostOrganizerSelectionProvider(account), (_, _) {
              _scopeEpoch += 1;
            });
      _organizers = account == null
          ? null
          : ref.listenManual(hostOperableClubsProvider(account), (_, _) {
              _scopeEpoch += 1;
            });
    }, fireImmediately: true);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final router = GoRouter.maybeOf(context);
    if (identical(router, _router)) return;
    _router?.routerDelegate.removeListener(_onRouteChanged);
    _router = router;
    _wasTodayIndex = _isTodayIndex;
    router?.routerDelegate.addListener(_onRouteChanged);
  }

  @override
  void didUpdateWidget(HostTodayScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.now != widget.now ||
        oldWidget.initialOrganizerId != widget.initialOrganizerId) {
      _scopeEpoch += 1;
    }
    if (oldWidget.now != widget.now) _resetClock();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _router?.routerDelegate.removeListener(_onRouteChanged);
    _identity.close();
    _selection?.close();
    _organizers?.close();
    super.dispose();
  }

  void _onRouteChanged() {
    _routeEpoch += 1;
    final isToday = _isTodayIndex;
    if (isToday && !_wasTodayIndex) _queueRefresh();
    _wasTodayIndex = isToday;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final previous = _lifecycle;
    _lifecycle = state;
    final wasBackgrounded =
        previous == AppLifecycleState.inactive ||
        previous == AppLifecycleState.hidden ||
        previous == AppLifecycleState.paused;
    if (state == AppLifecycleState.resumed &&
        wasBackgrounded &&
        _isTodayIndex) {
      _queueRefresh();
    }
  }

  HostTodayFeedRequest? _currentRequest() {
    if (!mounted) return null;
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null) return null;
    final clubs = ref.read(hostOperableClubsProvider(uid)).asData?.value;
    if (clubs == null) return null;
    final selection = ref.read(hostOrganizerSelectionProvider(uid));
    final organizer = resolveSelectedHostOrganizer(
      clubs,
      selectedOrganizerId: selection,
      preferredOrganizerId: selection == null
          ? widget.initialOrganizerId
          : null,
    );
    if (organizer == null) return null;
    return HostTodayFeedRequest(
      organizerId: organizer.id,
      accountId: uid,
      sessionBoundary: _sessionBoundary,
    );
  }

  bool _ownsRequest(HostTodayFeedRequest request, int epoch) =>
      mounted && _scopeEpoch == epoch && _currentRequest() == request;

  void _queueRefresh() {
    final request = _currentRequest();
    if (request == null) return;
    _pendingRefresh = (request: request, epoch: _scopeEpoch);
    if (_refreshQueued) return;
    _refreshQueued = true;
    scheduleMicrotask(() {
      _refreshQueued = false;
      final pending = _pendingRefresh;
      _pendingRefresh = null;
      if (pending == null ||
          !_ownsRequest(pending.request, pending.epoch) ||
          !_isTodayIndex ||
          (_lifecycle != null && _lifecycle != AppLifecycleState.resumed)) {
        return;
      }
      ref.invalidate(hostTodayFeedControllerProvider(pending.request));
    });
  }

  Future<void> _showEventEntry(
    Club organizer,
    HostEventEntryState state,
    HostTodayFeedRequest request,
    int epoch,
  ) async {
    if (!_ownsRequest(request, epoch) ||
        ModalRoute.of(context)?.isCurrent == false) {
      return;
    }
    final routeEpoch = _routeEpoch;
    final intent = await showHostEventEntrySheet(
      context: context,
      state: state,
    );
    if (intent == null ||
        !mounted ||
        !_ownsRequest(request, epoch) ||
        routeEpoch != _routeEpoch ||
        ModalRoute.of(context)?.isCurrent == false) {
      return;
    }
    await runHostEventEntryFlow(
      context: context,
      ref: ref,
      club: organizer,
      state: state,
      selection: intent,
      createdAt: _clockNow,
      isCurrent: () => _ownsRequest(request, epoch),
    );
    // Route return owns feed refresh for creation and every other destination.
    // A late continuation must not invalidate its captured, obsolete request.
  }

  void _resetClock() {
    _clockTimer?.cancel();
    _clockNow = widget.now ?? DateTime.now();
    _sessionBoundary = _clockNow;
    if (widget.now != null) return;
    _scheduleClockTick();
  }

  void _scheduleClockTick() {
    final current = DateTime.now();
    final nextMinute = DateTime(
      current.year,
      current.month,
      current.day,
      current.hour,
      current.minute + 1,
    );
    _clockTimer = Timer(nextMinute.difference(current) + CatchMotion.fast, () {
      if (!mounted) return;
      setState(() => _clockNow = DateTime.now());
      _scheduleClockTick();
    });
  }

  @override
  Widget build(BuildContext context) {
    final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = uidState.value;
    final organizersState = uid == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(hostOperableClubsProvider(uid)),
          );
    if (uid != null) ref.watch(hostOrganizerSelectionProvider(uid));
    final scopeEpoch = _scopeEpoch;
    final routeState = buildHostTodayRouteState(
      uid: uidState,
      organizers: organizersState,
    );

    return CatchRootScreenScaffold.sections(
      scrollKey: const ValueKey<String>('host-today-scroll-view'),
      title: HostTodayHeader(now: _clockNow),
      children: [
        switch (routeState.status) {
          HostTodayRouteStatus.authRequired => CatchSliverErrorState(
            title: context.l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
            message:
                context.l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
            retryLabel:
                context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
            onRetry: () => context.go(Routes.authScreen.path),
          ),
          HostTodayRouteStatus.loading =>
            const CatchStateViewport.sliverLoading(),
          HostTodayRouteStatus.error => CatchLocalizedSliverErrorState(
            routeState.error!,
            context: routeState.errorContext,
            onRetry: () {
              final currentUid = routeState.uid;
              if (routeState.errorContext == AppErrorContext.auth ||
                  currentUid == null) {
                ref.invalidate(uidProvider);
                return;
              }
              ref.invalidate(hostOperableClubsProvider(currentUid));
            },
          ),
          HostTodayRouteStatus.empty => HostTodayOrganizerEmptyState(
            onCreateOrganizer: () =>
                context.pushNamed(Routes.hostCreateClubScreen.name),
          ),
          HostTodayRouteStatus.loaded => HostTodayLoadedRoute(
            routeState: routeState,
            initialOrganizerId: widget.initialOrganizerId,
            clockNow: _clockNow,
            sessionBoundary: _sessionBoundary,
            onOpenEvent: _openEvent,
            onOpenAttention: _openAttention,
            onViewEvents: () => context.goNamed(Routes.hostEventsScreen.name),
            onCreateEvent: (organizer, state, request) =>
                _showEventEntry(organizer, state, request, scopeEpoch),
            onStartRehearsal: _startRehearsal,
            onStartEventRehearsal: _showRehearsalStart,
          ),
        },
      ],
    );
  }

  Future<void> _showRehearsalStart(Club organizer, Event event) async {
    final choice = await showCatchBottomSheet<EventRehearsalStartChoice>(
      context: context,
      builder: (_) => EventRehearsalStartSheet(event: event),
    );
    if (!mounted || choice == null) return;
    _startRehearsal(
      organizer,
      sourceEventId: choice == EventRehearsalStartChoice.upcomingEvent
          ? event.id
          : null,
    );
  }

  void _startRehearsal(Club organizer, {String? sourceEventId}) {
    context.pushNamed(
      Routes.hostEventRehearsalStartScreen.name,
      pathParameters: {'clubId': organizer.id},
      queryParameters: {
        'eventId': ?sourceEventId,
        if (sourceEventId == null) 'source': 'custom',
      },
    );
  }

  void _openEvent(Club organizer, Event event) {
    final isLive =
        !event.startTime.isAfter(_clockNow) && event.endTime.isAfter(_clockNow);
    context.goNamed(
      Routes.hostTodayScreen.name,
      queryParameters: {
        'organizerId': organizer.id,
        'eventId': event.id,
        'section': isLive
            ? 'live'
            : event.endTime.isAfter(_clockNow)
            ? 'setup'
            : 'report',
      },
      extra: event,
    );
  }

  void _openAttention(Club organizer, HostAttentionItem item) {
    final destination = item.destination;
    switch (destination.route) {
      case HostAttentionDestinationRoute.hostEventManage:
        final eventId = destination.eventId ?? item.eventId;
        if (eventId == null) return;
        context.goNamed(
          Routes.hostTodayScreen.name,
          queryParameters: {
            'organizerId': organizer.id,
            'eventId': eventId,
            'section': destination.section ?? 'setup',
          },
        );
        return;
      case HostAttentionDestinationRoute.hostApplications:
        final applicationId = destination.applicationId;
        context.pushNamed(
          applicationId == null
              ? Routes.hostAudienceScreen.name
              : Routes.hostApplicationDetailScreen.name,
          pathParameters: {'applicationId': ?applicationId},
          queryParameters: {
            'organizerId': organizer.id,
            if (applicationId == null) 'view': 'responses',
            'formId': ?destination.formId,
          },
        );
        return;
      case HostAttentionDestinationRoute.hostOrganizerPayments:
        context.pushNamed(
          Routes.hostClubPaymentsScreen.name,
          queryParameters: {'clubId': organizer.id},
        );
        return;
      case HostAttentionDestinationRoute.hostAudienceForms:
        final formId = destination.formId;
        if (destination.section == 'automations') {
          context.pushNamed(
            formId == null
                ? Routes.hostAudienceAutomationsScreen.name
                : Routes.hostFormAutomationsScreen.name,
            pathParameters: {'formId': ?formId},
            queryParameters: {'organizerId': organizer.id},
          );
          return;
        }
        context.goNamed(
          Routes.hostAudienceScreen.name,
          queryParameters: {
            'organizerId': organizer.id,
            'view': destination.section == 'responses' ? 'responses' : 'forms',
            'formId': ?formId,
          },
        );
        return;
      case HostAttentionDestinationRoute.hostInbox:
        context.goNamed(
          Routes.hostInboxScreen.name,
          queryParameters: {'threadId': ?destination.threadId},
          extra: organizer,
        );
        return;
      case HostAttentionDestinationRoute.hostDressRehearsal:
        _startRehearsal(organizer);
        return;
      case HostAttentionDestinationRoute.hostEvents:
        context.goNamed(Routes.hostEventsScreen.name);
        return;
      case HostAttentionDestinationRoute.hostProgramWork:
        // Program-scoped items carry the program id as the source prefix.
        final programId = item.sourceId.split(':').first;
        if (programId.isEmpty) return;
        context.pushNamed(
          Routes.hostWorkProgramScreen.name,
          pathParameters: {'programId': programId},
        );
        return;
    }
  }
}

class HostTodayLoadedRoute extends ConsumerWidget {
  const HostTodayLoadedRoute({
    super.key,
    required this.routeState,
    required this.clockNow,
    required this.sessionBoundary,
    required this.onOpenEvent,
    required this.onOpenAttention,
    required this.onViewEvents,
    required this.onCreateEvent,
    required this.onStartRehearsal,
    this.onStartEventRehearsal,
    this.initialOrganizerId,
  });

  final HostTodayRouteState routeState;
  final String? initialOrganizerId;
  final DateTime clockNow;
  final DateTime sessionBoundary;
  final void Function(Club organizer, Event event) onOpenEvent;
  final void Function(Club organizer, HostAttentionItem item) onOpenAttention;
  final VoidCallback onViewEvents;
  final void Function(
    Club organizer,
    HostEventEntryState state,
    HostTodayFeedRequest request,
  )
  onCreateEvent;
  final ValueChanged<Club> onStartRehearsal;
  final void Function(Club organizer, Event event)? onStartEventRehearsal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uid = routeState.uid!;
    final selectedOrganizerId = ref.watch(hostOrganizerSelectionProvider(uid));
    final organizer = resolveSelectedHostOrganizer(
      routeState.organizers,
      selectedOrganizerId: selectedOrganizerId,
      preferredOrganizerId: selectedOrganizerId == null
          ? initialOrganizerId
          : null,
    )!;
    final request = HostTodayFeedRequest(
      organizerId: organizer.id,
      accountId: uid,
      sessionBoundary: sessionBoundary,
    );
    final feedState = catchAsyncStateFromAsyncValue(
      ref.watch(hostTodayFeedControllerProvider(request)),
    );
    final draftsAsync = ref.watch(
      clubEventDraftsProvider(clubId: organizer.id),
    );
    final drafts = switch (draftsAsync) {
      AsyncData<List<EventDraft>>(:final value) => value,
      _ => const <EventDraft>[],
    };
    final repeatSource = HostEventsWorkspaceState.fromEvents(
      events: feedState.value?.pastEvents ?? const <Event>[],
      now: clockNow,
    ).repeatSource;
    final entryState = HostEventEntryState.resolve(
      organizerId: organizer.id,
      drafts: drafts,
      repeatSource: repeatSource,
    );
    final todayState = buildHostTodayState(
      feedState,
      now: clockNow,
      l10n: context.l10n,
    );

    return HostTodayPersonalizedLayout(
      scope: HostTodayPreferenceScope(
        accountId: uid,
        organizerId: organizer.id,
      ),
      today: todayState,
      now: clockNow,
      onCreateEvent: () => onCreateEvent(organizer, entryState, request),
      operationalSurface: HostTodayBody(
        organizer: organizer,
        state: todayState,
        now: clockNow,
        onRetry: () =>
            ref.read(hostTodayFeedControllerProvider(request).notifier).retry(),
        onOpenEvent: (event) => onOpenEvent(organizer, event),
        onOpenAttention: (item) => onOpenAttention(organizer, item),
        onCreateEvent: () => onCreateEvent(organizer, entryState, request),
        onViewEvents: onViewEvents,
        onStartRehearsal: () => onStartRehearsal(organizer),
        onStartEventRehearsal: onStartEventRehearsal == null
            ? null
            : (event) => onStartEventRehearsal!(organizer, event),
      ),
    );
  }
}

class HostTodayOrganizerEmptyState extends StatelessWidget {
  const HostTodayOrganizerEmptyState({
    super.key,
    required this.onCreateOrganizer,
  });

  final VoidCallback onCreateOrganizer;

  @override
  Widget build(BuildContext context) {
    return CatchSliverEmptyState(
      icon: CatchIcons.people,
      title: context.l10n.hostsHostEventsScaffoldTitleCreateYourFirstClub,
      message: context.l10n.hostsHostEventsScaffoldBodyCreateAClubTo,
      actions: [
        CatchButton(
          label: context.l10n.hostsHostEventsScaffoldLabelCreateClub,
          leading: Icon(CatchIcons.add, size: CatchIconSize.md),
          size: CatchButtonSize.md,
          onPressed: onCreateOrganizer,
        ),
      ],
    );
  }
}
