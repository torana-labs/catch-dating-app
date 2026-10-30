import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_events_row.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

typedef HostProgramsLoadMoreCallback = void Function(HostEventsView view);

class HostEventsOrganizerCard extends ConsumerWidget {
  const HostEventsOrganizerCard({
    super.key,
    required this.organizer,
    required this.onEventEntrySelected,
    required this.onManageEvent,
    required this.now,
    required this.sessionBoundary,
    this.initialProgramId,
    this.initialProgramRow,
  });

  final Organizer organizer;
  final HostEventEntryCallback onEventEntrySelected;
  final HostEventsManageEventCallback onManageEvent;
  final DateTime now;
  final DateTime sessionBoundary;
  final String? initialProgramId;
  final OrganizerProgramListRow? initialProgramRow;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionState = catchAsyncStateFromAsyncValue(
      ref.watch(authenticatedSessionProvider),
    );
    final request = HostEventsTimelineRequest(
      organizerId: organizer.id,
      sessionBoundary: sessionBoundary,
      session: sessionState.value,
    );
    final timelineResult = ref.watch(
      hostEventsTimelineControllerProvider(request),
    );
    // A required private-history failure is terminal even after Upcoming has
    // rendered. Riverpod retains the pending value on AsyncError; remove that
    // value for this boundary so it cannot masquerade as usable inventory.
    final timelineState = catchAsyncStateFromAsyncValue(timelineResult);
    final retained = timelineState.value;
    final timelineAsync =
        timelineState.error != null &&
            retained != null &&
            !retained.historyInitialized &&
            retained.loadingMorePast
        ? timelineResult.unwrapPrevious()
        : timelineResult;
    final eventsAsync = timelineAsync.whenData(
      (timeline) => timeline.allEvents,
    );
    final eventsState = catchAsyncStateFromAsyncValue(eventsAsync);
    final timeline = catchAsyncStateFromAsyncValue(timelineAsync).value;
    final workspaceState = buildHostEventsWorkspaceState(
      eventsState,
      now: now,
      unpublishedUpcoming:
          timeline?.unpublishedUpcoming ??
          const <PrivateEventSetupInventoryItem>[],
      unpublishedHistory:
          timeline?.unpublishedHistory ??
          const <PrivateEventSetupInventoryItem>[],
      cancelledEvents: timeline?.cancelledEvents ?? const <Event>[],
      hasMoreActive: timeline?.hasMoreUpcoming ?? false,
      hasMorePast: timeline?.hasMoreHistory ?? false,
      loadingMoreActive: timeline?.loadingMoreActive ?? false,
      loadingMorePast: timeline?.loadingMorePast ?? false,
      activeLoadMoreError: timeline?.activeLoadMoreError,
      pastError: timeline?.pastError,
      pastStackTrace: timeline?.pastStackTrace,
    );
    final draftsAsync = ref.watch(organizerEventDraftsProvider(clubId: organizer.id));
    final drafts = switch (draftsAsync) {
      AsyncData<List<EventDraft>>(:final value) => value,
      _ => const <EventDraft>[],
    };
    final entryState = HostEventEntryState.resolve(
      organizerId: organizer.id,
      drafts: drafts,
      repeatSource: workspaceState.repeatSource,
    );

    void onRetryEvents() =>
        ref.invalidate(hostEventsTimelineControllerProvider(request));
    final accountId = ref.watch(uidProvider).value;
    final scope = accountId == null
        ? null
        : (accountId: accountId, organizerId: organizer.id);
    final programController = scope == null
        ? null
        : ref.watch(
            programEventsControllerProvider((
              scope: scope,
              anchorId: initialProgramId,
              initialRow: initialProgramRow,
            )),
          );
    return ListenableBuilder(
      listenable: Listenable.merge([?programController]),
      builder: (_, _) => HostEventsOrganizerSection(
        programs: programController?.state ?? const CatchAsyncState.loading(),
        hasMorePrograms: programController?.hasMore ?? false,
        loadingMorePrograms: programController?.loadingMore ?? false,
        programPageError: programController?.loadMoreError,
        onLoadMorePrograms: programController == null
            ? null
            : (view) => unawaited(
                programController.loadMoreMatching(
                  (program) => _programBelongsToView(program, view, now),
                ),
              ),
        now: now,
        onRetryPrograms: programController?.refresh,
        onOpenProgram: (program) async {
          await context.pushNamed(
            Routes.hostProgramWorkspaceScreen.name,
            pathParameters: {'programId': program.programId},
          );
          if (context.mounted) await programController?.refresh();
        },
        onLifecycleProgram: programController == null
            ? null
            : (program, action) => _changeProgramLifecycle(
                context,
                programController,
                program,
                action,
              ),
        isProgramPending: programController?.isPending,
        organizer: organizer,
        state: workspaceState,
        entryState: entryState,
        onRetryEvents: onRetryEvents,
        onLoadMoreActive: () => ref
            .read(hostEventsTimelineControllerProvider(request).notifier)
            .loadMoreActive(),
        onLoadMorePast: () => ref
            .read(hostEventsTimelineControllerProvider(request).notifier)
            .loadMorePast(),
        onRetryPast: () => ref
            .read(hostEventsTimelineControllerProvider(request).notifier)
            .retryPast(),
        onEventEntrySelected: onEventEntrySelected,
        onManageEvent: onManageEvent,
      ),
    );
  }
}

class HostEventsOrganizerSection extends StatefulWidget {
  const HostEventsOrganizerSection({
    super.key,
    required this.organizer,
    required this.state,
    required this.entryState,
    required this.onLoadMoreActive,
    required this.onLoadMorePast,
    required this.onRetryPast,
    required this.onEventEntrySelected,
    required this.onManageEvent,
    this.onRetryEvents,
    this.programs = const CatchAsyncState.data(<OrganizerProgramListRow>[]),
    this.now,
    this.onRetryPrograms,
    this.onOpenProgram,
    this.onLifecycleProgram,
    this.isProgramPending,
    this.hasMorePrograms = false,
    this.loadingMorePrograms = false,
    this.programPageError,
    this.onLoadMorePrograms,
  });

  final CatchAsyncState<List<OrganizerProgramListRow>> programs;
  final DateTime? now;
  final VoidCallback? onRetryPrograms;
  final ValueChanged<OrganizerProgramListRow>? onOpenProgram;
  final void Function(OrganizerProgramListRow, ProgramLifecycleAction)?
  onLifecycleProgram;
  final bool Function(String)? isProgramPending;
  final bool hasMorePrograms;
  final bool loadingMorePrograms;
  final Object? programPageError;
  final HostProgramsLoadMoreCallback? onLoadMorePrograms;
  final Organizer organizer;
  final HostEventsWorkspaceState state;
  final HostEventEntryState entryState;
  final VoidCallback? onRetryEvents;
  final VoidCallback onLoadMoreActive;
  final VoidCallback onLoadMorePast;
  final VoidCallback onRetryPast;
  final HostEventEntryCallback onEventEntrySelected;
  final HostEventsManageEventCallback onManageEvent;

  @override
  State<HostEventsOrganizerSection> createState() => _HostEventsOrganizerSectionState();
}

class _HostEventsOrganizerSectionState extends State<HostEventsOrganizerSection>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final Set<HostEventsView> _autoAdvancedProgramViews = {};

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: HostEventsView.values.length, vsync: this);
    _tabs.addListener(_scheduleProgramAutoAdvance);
    _scheduleProgramAutoAdvance();
  }

  @override
  void didUpdateWidget(HostEventsOrganizerSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizer.id != widget.organizer.id) {
      _autoAdvancedProgramViews.clear();
      _tabs.index = 0;
    }
    if (oldWidget.programs != widget.programs ||
        oldWidget.hasMorePrograms != widget.hasMorePrograms ||
        oldWidget.loadingMorePrograms != widget.loadingMorePrograms) {
      _scheduleProgramAutoAdvance();
    }
  }

  @override
  void dispose() {
    _tabs.removeListener(_scheduleProgramAutoAdvance);
    _tabs.dispose();
    super.dispose();
  }

  void _scheduleProgramAutoAdvance() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final view = HostEventsView.values[_tabs.index];
      final programs = widget.programs.value;
      if (programs == null ||
          widget.onLoadMorePrograms == null ||
          !widget.hasMorePrograms ||
          widget.loadingMorePrograms ||
          programs.any(
            (program) => _programBelongsToView(
              program,
              view,
              widget.now ?? DateTime.now(),
            ),
          ) ||
          !_autoAdvancedProgramViews.add(view)) {
        return;
      }
      widget.onLoadMorePrograms!(view);
    });
  }

  @override
  Widget build(BuildContext context) {
    return CatchRootScreenScaffold.withPrimaryRail(
      scrollKey: const ValueKey<String>('host-events-scroll-view'),
      header: CatchRootScreenHeader.title(
        title: context.l10n.hostsHostEventsListTextEvents,
        actions: [
          CatchTopBarPrimaryButton(
            key: const ValueKey<String>('host-events-create-event'),
            label: context.l10n.hostsHostEventsListLabelNewEvent,
            icon: CatchIcons.add,
            onPressed: _showEventEntrySheet,
          ),
        ],
      ),
      actions: CatchPageTabBar<HostEventsView>.controlled(
        controller: _tabs,
        groupKey: const ValueKey('host-events-tabs'),
        options: [
          for (final view in HostEventsView.values)
            CatchOption(
              value: view,
              label: switch (view) {
                HostEventsView.upcoming => context.l10n.hostEventsUpcomingTab,
                HostEventsView.past => context.l10n.hostEventsPastTab,
              },
            ),
        ],
      ),
      body: CatchRootScreenBody.paged(
        controller: _tabs,
        pages: [
          for (final view in HostEventsView.values)
            CatchRootScreenPageSpec.scroll(
              page: HostEventsTimelineBody(
                key: ValueKey('host-events-${widget.organizer.id}-${view.name}'),
                organizerId: widget.organizer.id,
                programs: widget.programs,
                now: widget.now,
                onRetryPrograms: widget.onRetryPrograms,
                onOpenProgram: widget.onOpenProgram,
                onLifecycleProgram: widget.onLifecycleProgram,
                isProgramPending: widget.isProgramPending,
                hasMorePrograms: widget.hasMorePrograms,
                loadingMorePrograms: widget.loadingMorePrograms,
                programPageError: widget.programPageError,
                onLoadMorePrograms: widget.onLoadMorePrograms == null
                    ? null
                    : () => widget.onLoadMorePrograms!(view),
                view: view,
                state: widget.state,
                onRetryEvents: widget.onRetryEvents,
                onLoadMore: view == HostEventsView.upcoming
                    ? widget.onLoadMoreActive
                    : widget.onLoadMorePast,
                onRetryPage: view == HostEventsView.upcoming
                    ? widget.onLoadMoreActive
                    : widget.onRetryPast,
                onCreateEvent: _showEventEntrySheet,
                onManageEvent: (event) =>
                    widget.onManageEvent(widget.organizer, event),
                onResumeUnpublished: (eventId) => widget.onEventEntrySelected(
                  widget.organizer,
                  widget.entryState,
                  HostEventEntrySelection.saved(eventId),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _showEventEntrySheet() async {
    final intent = await showHostEventEntrySheet(
      context: context,
      state: widget.entryState,
    );
    if (intent == null || !mounted) return;
    widget.onEventEntrySelected(widget.organizer, widget.entryState, intent);
  }
}

/// One lifecycle page. The root owns tabs and scrolling chrome; this adapter
/// selects data/state only, and the shared page/section/record owners lay it out.
class HostEventsTimelineBody extends StatelessWidget
    implements CatchRootScreenPageOwner {
  const HostEventsTimelineBody({
    super.key,
    required this.organizerId,
    required this.view,
    required this.state,
    required this.onLoadMore,
    required this.onRetryPage,
    required this.onCreateEvent,
    required this.onManageEvent,
    required this.onResumeUnpublished,
    this.onRetryEvents,
    this.programs = const CatchAsyncState.data(<OrganizerProgramListRow>[]),
    this.now,
    this.onRetryPrograms,
    this.onOpenProgram,
    this.onLifecycleProgram,
    this.isProgramPending,
    this.hasMorePrograms = false,
    this.loadingMorePrograms = false,
    this.programPageError,
    this.onLoadMorePrograms,
  });

  final CatchAsyncState<List<OrganizerProgramListRow>> programs;
  final DateTime? now;
  final VoidCallback? onRetryPrograms;
  final ValueChanged<OrganizerProgramListRow>? onOpenProgram;
  final void Function(OrganizerProgramListRow, ProgramLifecycleAction)?
  onLifecycleProgram;
  final bool Function(String)? isProgramPending;
  final bool hasMorePrograms;
  final bool loadingMorePrograms;
  final Object? programPageError;
  final VoidCallback? onLoadMorePrograms;
  final String organizerId;
  final HostEventsView view;
  final HostEventsWorkspaceState state;
  final VoidCallback onLoadMore;
  final VoidCallback onRetryPage;
  final VoidCallback onCreateEvent;
  final ValueChanged<Event> onManageEvent;

  /// Opens a saved-but-unpublished event in the unified setup flow.
  final ValueChanged<String> onResumeUnpublished;
  final VoidCallback? onRetryEvents;

  @override
  Widget build(BuildContext context) {
    final upcoming = view == HostEventsView.upcoming;
    final clock = now ?? DateTime.now();
    final programRows = (programs.value ?? const <OrganizerProgramListRow>[])
        .where((program) => _programBelongsToView(program, view, clock))
        .toList(growable: false);
    final sections = upcoming ? state.activeSections : state.pastSections;
    final pageError = upcoming ? state.activeLoadMoreError : state.pastError;
    final hasMore = upcoming ? state.hasMoreActive : state.hasMorePast;
    final loadingMore = upcoming
        ? state.loadingMoreActive
        : state.loadingMorePast;
    return CatchRootScreenPageScrollView.sections(
      scrollKey: PageStorageKey('host-events-$organizerId-${view.name}'),
      children: [
        if (programs.isLoading)
          CatchSection.sliverLoadingRows(
            itemCount: 1,
            layoutBuilder: (_, _) => CatchRecordLayout.placeholder(
              icon: CatchIcons.date,
              factCount: 2,
              hasMetadata: true,
            ),
          ),
        if (programRows.isNotEmpty) ...[
          CatchSection.sliverRows(
            key: ValueKey('host-programs-$organizerId-${view.name}'),
            title: context.l10n.programsListTitle,
            itemCount: programRows.length,
            itemBuilder: (context, index) {
              final program = programRows[index];
              final pending =
                  isProgramPending?.call(program.programId) ?? false;
              return programEventsField(
                context,
                program: program,
                now: clock,
                pending: pending,
                onOpen: () => onOpenProgram?.call(program),
                onLifecycle: (action) =>
                    onLifecycleProgram?.call(program, action),
              );
            },
          ),
          const SliverToBoxAdapter(child: gapH24),
        ],
        if (programs.error != null)
          CatchLocalizedSliverErrorState(
            programs.error!,
            context: AppErrorContext.event,
            onRetry: onRetryPrograms,
          ),
        if (programPageError != null)
          CatchLocalizedSliverErrorState(
            programPageError!,
            context: AppErrorContext.event,
            onRetry: onLoadMorePrograms,
          )
        else if (hasMorePrograms)
          CatchPageBody.sliver(
            child: SliverToBoxAdapter(
              child: Align(
                child: CatchButton(
                  key: ValueKey('host-programs-load-more-${view.name}'),
                  label: context.l10n.programsEventsLoadMore,
                  variant: CatchButtonVariant.secondary,
                  status: loadingMorePrograms
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed: loadingMorePrograms ? null : onLoadMorePrograms,
                ),
              ),
            ),
          ),
        if (state.status == HostEventsWorkspaceStatus.loading ||
            (sections.isEmpty && loadingMore))
          CatchSection.sliverLoadingRows(
            itemCount: 4,
            layoutBuilder: (_, _) => CatchRecordLayout.placeholder(
              icon: CatchIcons.event,
              factCount: 2,
            ),
          )
        else if (state.status == HostEventsWorkspaceStatus.error)
          CatchLocalizedSliverErrorState(
            state.error!,
            context: AppErrorContext.event,
            onRetry: onRetryEvents,
          )
        else if (sections.isEmpty && pageError != null)
          CatchLocalizedSliverErrorState(
            pageError,
            context: AppErrorContext.event,
            onRetry: onRetryPage,
          )
        else if (sections.isEmpty &&
            !hasMore &&
            programRows.isEmpty &&
            !hasMorePrograms &&
            programs.isSettledData)
          CatchSliverEmptyState(
            icon: CatchIcons.eventUnavailable,
            title: upcoming
                ? state.emptyTitle(context.l10n)
                : context.l10n.hostEventsPastEmptyTitle,
            message: upcoming
                ? state.emptyBody(context.l10n)
                : context.l10n.hostEventsPastEmptyBody,
            actions: [
              ?upcoming
                  ? CatchButton(
                      label: context.l10n.hostsHostEventsListLabelNewEvent,
                      onPressed: onCreateEvent,
                    )
                  : null,
            ],
          )
        else ...[
          for (final section in sections) ...[
            if (section != sections.first)
              const SliverToBoxAdapter(child: gapH24),
            CatchSection.sliverRows(
              key: ValueKey(
                'host-events-${section.grouping.name}-${section.key}',
              ),
              title: section.label(context.l10n),
              itemCount: section.rows.length,
              indexForKeyBuilder: (key) {
                final index = section.rows.indexWhere(
                  (row) => key == ValueKey('host-event-row-${row.id}'),
                );
                return index < 0 ? null : index;
              },
              itemBuilder: (context, index) {
                final row = section.rows[index];
                final event = row.event;
                return CatchField.navigate(
                  key: ValueKey('host-event-row-${row.id}'),
                  content: hostEventRecordLayout(context, row),
                  onActivate: () => event != null
                      ? onManageEvent(event)
                      : onResumeUnpublished(row.id),
                );
              },
            ),
          ],
          if (pageError != null)
            CatchLocalizedSliverErrorState(
              pageError,
              context: AppErrorContext.event,
              onRetry: onRetryPage,
            )
          else if (hasMore)
            CatchPageBody.sliver(
              child: SliverToBoxAdapter(
                child: Align(
                  child: CatchButton(
                    key: ValueKey(
                      upcoming
                          ? 'host-events-load-more-active'
                          : 'host-events-load-more-past',
                    ),
                    label: upcoming
                        ? context.l10n.hostEventsTimelineLoadMoreSchedule
                        : context.l10n.hostEventsTimelineLoadMoreHistory,
                    variant: CatchButtonVariant.secondary,
                    status: loadingMore
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: loadingMore ? null : onLoadMore,
                  ),
                ),
              ),
            ),
        ],
      ],
    );
  }
}

/// Domain facts only. Field owns activation and Section owns the collection.
CatchRecordLayout hostEventRecordLayout(
  BuildContext context,
  HostEventLifecycleRowData data,
) {
  final unpublished = data.unpublished;
  if (unpublished != null) {
    return CatchRecordLayout(
      title: data.title,
      icon: CatchIcons.note,
      facts: data.facts(context.l10n, time: unpublished.localStartTime),
    );
  }
  final event = data.event!;
  final activity = ActivityPalette.resolve(context, event.activityKind);
  return CatchRecordLayout(
    title: event.title,
    icon: activity.glyph,
    color: activity.accent,
    facts: data.facts(
      context.l10n,
      time: MaterialLocalizations.of(context).formatTimeOfDay(
        TimeOfDay.fromDateTime(event.startTime),
        alwaysUse24HourFormat: MediaQuery.alwaysUse24HourFormatOf(context),
      ),
    ),
  );
}

bool _programBelongsToView(
  OrganizerProgramListRow program,
  HostEventsView view,
  DateTime now,
) {
  // Draft programs stay discoverable while they are being configured.
  final history =
      program.isArchived ||
      program.status == 'completed' ||
      (program.status != 'draft' &&
          program.endsAt != null &&
          !program.endsAt!.isAfter(now));
  return (view == HostEventsView.upcoming) != history;
}

Future<void> _changeProgramLifecycle(
  BuildContext context,
  ProgramEventsController controller,
  OrganizerProgramListRow program,
  ProgramLifecycleAction action,
) async {
  if (controller.isPending(program.programId)) return;
  final archiving = action == ProgramLifecycleAction.archive;
  if (!archiving && !program.canUnarchiveAt(DateTime.now())) return;
  final l10n = context.l10n;
  final deadline = AppTimeFormatters.shortDate(
    DateTime.now().add(const Duration(days: 14)),
  );
  final confirmed = await showCatchAdaptiveDialog<bool>(
    context: context,
    title: archiving
        ? l10n.programsListArchiveConfirmTitle(title: program.title)
        : l10n.programsListUnarchiveConfirmTitle(title: program.title),
    message: archiving
        ? l10n.programsListArchiveConfirmMessage(date: deadline)
        : l10n.programsListUnarchiveConfirmMessage,
    actions: [
      CatchDialogAction(
        label: l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
        value: false,
      ),
      CatchDialogAction(
        label: archiving
            ? l10n.programsListArchiveAction
            : l10n.programsListUnarchiveAction,
        value: true,
      ),
    ],
  );
  if (confirmed != true || !context.mounted) return;
  try {
    final changed = await controller.changeLifecycle(
      program,
      action,
      DateTime.now(),
    );
    if (changed && context.mounted) {
      showCatchNotice(
        context,
        archiving
            ? l10n.programsListArchiveDone(date: deadline)
            : l10n.programsListUnarchiveDone,
        tone: CatchNoticeTone.success,
      );
    }
  } catch (error) {
    if (context.mounted) showCatchNoticeError(context, error);
  }
}
