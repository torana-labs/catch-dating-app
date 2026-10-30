import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_flow.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_view_model.dart';
import 'package:catch_dating_app/hosts/events/presentation/widgets/host_events_list.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostEventsScreen extends ConsumerWidget {
  const HostEventsScreen({
    super.key,
    this.initialOrganizerId,
    this.initialProgramId,
    this.initialProgramAnchor,
    this.now,
  });

  final String? initialOrganizerId;
  final String? initialProgramId;
  final OrganizerProgramListAnchor? initialProgramAnchor;
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = uidState.value;
    final organizersState = uid == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(hostOperableOrganizersProvider(uid)),
          );
    final routeState = buildHostEventsRouteState(
      uid: uidState,
      organizers: organizersState,
    );

    return switch (routeState.status) {
      HostEventsRouteStatus.authRequired => CatchRootScreenScaffold.standard(
        title: CatchTopBar.primaryRail(
          title: context.l10n.hostsHostEventsListTextEvents,
        ),
        children: [
          CatchSliverErrorState(
            title: context.l10n.hostsHostAuthRequiredScreenTitleSignInRequired,
            message:
                context.l10n.hostsHostAuthRequiredScreenMessageSignInToManage,
            retryLabel:
                context.l10n.hostsHostAuthRequiredScreenVisiblecopySignIn,
            onRetry: () => context.go(Routes.authScreen.path),
          ),
        ],
      ),
      HostEventsRouteStatus.loading => CatchRootScreenScaffold.standard(
        title: CatchTopBar.primaryRail(
          title: context.l10n.hostsHostEventsListTextEvents,
        ),
        children: const [CatchStateViewport.sliverLoading()],
      ),
      HostEventsRouteStatus.error => CatchRootScreenScaffold.standard(
        title: CatchTopBar.primaryRail(
          title: context.l10n.hostsHostEventsListTextEvents,
        ),
        children: [
          CatchLocalizedSliverErrorState(
            routeState.error!,
            context: routeState.errorContext,
            onRetry: () {
              final currentUid = routeState.uid;
              if (routeState.errorContext == AppErrorContext.auth ||
                  currentUid == null) {
                ref.invalidate(uidProvider);
                return;
              }
              ref.invalidate(hostOperableOrganizersProvider(currentUid));
            },
          ),
        ],
      ),
      HostEventsRouteStatus.empty ||
      HostEventsRouteStatus.loaded => HostEventsRouteScaffold(
        organizers: routeState.organizers,
        currentUid: routeState.uid!,
        initialOrganizerId: initialOrganizerId,
        initialProgramId: initialProgramId,
        initialProgramAnchor: initialProgramAnchor,
        now: now,
      ),
    };
  }
}

class HostEventsRouteScaffold extends ConsumerStatefulWidget {
  const HostEventsRouteScaffold({
    super.key,
    required this.organizers,
    required this.currentUid,
    this.initialOrganizerId,
    this.initialProgramId,
    this.initialProgramAnchor,
    this.now,
  });

  final List<Organizer> organizers;
  final String currentUid;
  final String? initialOrganizerId;
  final String? initialProgramId;
  final OrganizerProgramListAnchor? initialProgramAnchor;
  final DateTime? now;

  @override
  ConsumerState<HostEventsRouteScaffold> createState() =>
      _HostEventsRouteScaffoldState();
}

class _HostEventsRouteScaffoldState
    extends ConsumerState<HostEventsRouteScaffold> {
  late DateTime _clockNow;
  late DateTime _timelineBoundary;
  Timer? _clockTimer;
  GoRouter? _router;
  bool _wasEventsIndex = false;
  bool _refreshQueued = false;

  bool get _isEventsIndex =>
      _router?.state.name == Routes.hostEventsScreen.name &&
      !_router!.state.uri.queryParameters.containsKey('eventId');

  @override
  void initState() {
    super.initState();
    _resetClock();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final router = GoRouter.maybeOf(context);
    if (identical(router, _router)) return;
    _router?.routerDelegate.removeListener(_onRouteChanged);
    _router = router;
    _wasEventsIndex = _isEventsIndex;
    router?.routerDelegate.addListener(_onRouteChanged);
  }

  @override
  void didUpdateWidget(HostEventsRouteScaffold oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.now != widget.now) _resetClock();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _router?.routerDelegate.removeListener(_onRouteChanged);
    super.dispose();
  }

  // Create, resume, repeat and program flows, the embedded event workspace and
  // other tabs all return through the router. The retained timeline keeps its
  // session boundary, so returning re-reads it, private setups included.
  void _onRouteChanged() {
    final isEventsIndex = _isEventsIndex;
    if (isEventsIndex && !_wasEventsIndex) _queueRefresh();
    _wasEventsIndex = isEventsIndex;
  }

  void _queueRefresh() {
    if (_refreshQueued) return;
    _refreshQueued = true;
    // A covered list pauses its timeline subscription, and Riverpod schedules
    // no refresh for a paused provider. Invalidate once the return frame has
    // shown the list again.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshQueued = false;
      if (!mounted || !_isEventsIndex) return;
      ref.invalidate(hostEventsTimelineControllerProvider);
    });
  }

  void _resetClock() {
    _clockTimer?.cancel();
    _clockNow = widget.now ?? DateTime.now();
    _timelineBoundary = _clockNow;
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
    final selectedOrganizerId = ref.watch(
      hostOrganizerSelectionProvider(widget.currentUid),
    );
    final selectedOrganizer = resolveSelectedHostOrganizer(
      widget.organizers,
      selectedOrganizerId: selectedOrganizerId,
      preferredOrganizerId: selectedOrganizerId == null
          ? widget.initialOrganizerId
          : null,
    );

    if (selectedOrganizer != null) {
      return HostEventsOrganizerCard(
        organizer: selectedOrganizer,
        initialProgramRow:
            widget.initialProgramAnchor?.accountId == widget.currentUid &&
                widget.initialProgramAnchor?.organizerId == selectedOrganizer.id &&
                widget.initialProgramAnchor?.row.programId ==
                    widget.initialProgramId
            ? widget.initialProgramAnchor!.row
            : null,
        initialProgramId: selectedOrganizer.id == widget.initialOrganizerId
            ? widget.initialProgramId
            : null,
        onEventEntrySelected: _handleEventEntrySelected,
        onManageEvent: _openEvent,
        now: _clockNow,
        sessionBoundary: _timelineBoundary,
      );
    }
    return CatchRootScreenScaffold.standard(
      title: CatchTopBar.primaryRail(
        title: context.l10n.hostsHostEventsListTextEvents,
      ),
      children: [
        CatchSliverEmptyState(
          icon: CatchIcons.people,
          title: context.l10n.hostsHostEventsScaffoldTitleCreateYourFirstOrganizer,
          message: context.l10n.hostsHostEventsScaffoldBodyCreateAOrganizerTo,
          actions: [
            CatchButton(
              label: context.l10n.hostsHostEventsScaffoldLabelCreateOrganizer,
              leading: Icon(CatchIcons.add, size: CatchIconSize.md),
              size: CatchButtonSize.md,
              onPressed: () =>
                  context.pushNamed(Routes.hostCreateOrganizerScreen.name),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _handleEventEntrySelected(
    Organizer organizer,
    HostEventEntryState state,
    HostEventEntrySelection selection,
  ) => runHostEventEntryFlow(
    context: context,
    ref: ref,
    organizer: organizer,
    state: state,
    selection: selection,
    createdAt: _clockNow,
  );

  void _openEvent(Organizer organizer, Event event) {
    final isLive =
        !event.startTime.isAfter(_clockNow) && event.endTime.isAfter(_clockNow);
    final section = isLive
        ? 'live'
        : event.endTime.isAfter(_clockNow)
        ? 'setup'
        : 'report';
    context.goNamed(
      Routes.hostEventsScreen.name,
      queryParameters: {
        ...GoRouterState.of(context).uri.queryParameters,
        'organizerId': organizer.id,
        'eventId': event.id,
        'section': section,
      },
      extra: event,
    );
  }
}
