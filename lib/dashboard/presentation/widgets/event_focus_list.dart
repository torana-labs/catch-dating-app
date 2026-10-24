import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_arrival_action.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

typedef EventFocusClubNameBuilder = String? Function(Event event);
typedef EventFocusEventCallback = void Function(Event event);

class EventFocusActions {
  const EventFocusActions({
    required this.onViewEvent,
    required this.onCheckIn,
    required this.onOpenSwipe,
    required this.onWriteReview,
    required this.onOpenDirections,
    required this.onAddToCalendar,
    required this.onResetCheckInError,
  });

  final EventFocusEventCallback onViewEvent;
  final EventFocusEventCallback onCheckIn;
  final EventFocusEventCallback onOpenSwipe;
  final EventFocusEventCallback onWriteReview;
  final EventFocusEventCallback onOpenDirections;
  final EventFocusEventCallback onAddToCalendar;
  final VoidCallback onResetCheckInError;
}

class EventFocusCheckInState {
  const EventFocusCheckInState({this.isPending = false, this.error});

  static const idle = EventFocusCheckInState();

  final bool isPending;
  final Object? error;
}

class EventFocusList extends StatefulWidget {
  const EventFocusList({
    super.key,
    required this.upcomingEvents,
    required this.windowedEvents,
    required this.actions,
    this.checkInState = EventFocusCheckInState.idle,
    this.arrivalAction,
    this.pendingReviewEvent,
    this.clubNameBuilder,
    this.onWindowImpression,
    this.now,
  });

  static const listKey = Key('dashboard-event-focus-list');
  static Key actionKey(String actionName) =>
      ValueKey('dashboard-event-focus-action-$actionName');

  final List<Event> upcomingEvents;
  final List<DashboardCatchWindow> windowedEvents;
  final EventFocusActions actions;
  final EventFocusCheckInState checkInState;
  final EventArrivalAction? arrivalAction;
  final Event? pendingReviewEvent;
  final EventFocusClubNameBuilder? clubNameBuilder;
  final ValueChanged<Event>? onWindowImpression;
  final DateTime? now;

  @override
  State<EventFocusList> createState() => _EventFocusListState();
}

class _EventFocusListState extends State<EventFocusList> {
  Timer? _countdownTimer;
  Duration _elapsed = Duration.zero;
  final Set<String> _impressedWindowIds = <String>{};

  @override
  void initState() {
    super.initState();
    _countdownTimer = Timer.periodic(dashboardHomeClockTick, (_) {
      if (mounted && !MediaQuery.disableAnimationsOf(context)) {
        setState(() => _elapsed += dashboardHomeClockTick);
      }
    });
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _logWindowImpressions(),
    );
  }

  @override
  void didUpdateWidget(covariant EventFocusList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.now != oldWidget.now) _elapsed = Duration.zero;
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _logWindowImpressions(),
    );
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _logWindowImpressions() {
    if (!mounted) return;
    for (final window in widget.windowedEvents) {
      if (_impressedWindowIds.add(window.event.id)) {
        widget.onWindowImpression?.call(window.event);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final effectiveNow = widget.now?.add(_elapsed) ?? DateTime.now();
    final items = _buildItems(effectiveNow);
    if (items.isEmpty) return const SizedBox.shrink();
    final reducedMotion = MediaQuery.disableAnimationsOf(context);
    final cardCountLabel = items.length == 1
        ? context.l10n.dashboardEventFocusRailVisiblecopy1Event
        : context.l10n.dashboardEventFocusRailVisiblecopyLengthEvents(
            length: items.length,
          );

    return Column(
      key: EventFocusList.listKey,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            CatchText(
              context.l10n.dashboardEventFocusRailTextEventFocus,
              variant: CatchTextVariant.titleL,
            ),
            gapW8,
            CatchBadge(label: cardCountLabel, tone: CatchBadgeTone.brand),
          ],
        ),
        gapH10,
        for (var index = 0; index < items.length; index++) ...[
          if (index > 0) gapH10,
          EventFocusCard(
            key: ValueKey('event-focus-${items[index].event.id}'),
            item: items[index],
            cardIndex: index,
            cardCount: items.length,
            checkInState: widget.checkInState,
            now: effectiveNow,
            reducedMotion: reducedMotion,
            compact: index > 0 && items[index].kind == EventFocusKind.upcoming,
            onActionPressed: (action) => _handleAction(items[index], action),
          ),
        ],
        if (widget.checkInState.error != null)
          CatchLocalizedErrorBanner(
            widget.checkInState.error!,
            context: AppErrorContext.dashboard,
            onRetry: widget.actions.onResetCheckInError,
          ),
      ],
    );
  }

  List<EventFocusItem> _buildItems(DateTime now) {
    final checkInEventId =
        widget.arrivalAction?.kind == EventArrivalActionKind.selfCheckIn
        ? widget.arrivalAction?.event.id
        : null;
    final items = <EventFocusItem>[
      for (final window in widget.windowedEvents)
        EventFocusItem(
          event: window.event,
          kind: EventFocusKind.afterEvent,
          windowClosesAt: window.windowClosesAt,
          attendedCount: window.attendedCount,
          canSwipe: true,
          needsReview: widget.pendingReviewEvent?.id == window.event.id,
          clubName: widget.clubNameBuilder?.call(window.event),
        ),
      for (final event in widget.upcomingEvents)
        EventFocusItem(
          event: event,
          kind: event.id == checkInEventId
              ? EventFocusKind.checkIn
              : EventFocusKind.upcoming,
          isToday:
              event.startTime.year == now.year &&
              event.startTime.month == now.month &&
              event.startTime.day == now.day,
          clubName: widget.clubNameBuilder?.call(event),
        ),
    ];
    if (widget.pendingReviewEvent != null &&
        !widget.windowedEvents.any(
          (window) => window.event.id == widget.pendingReviewEvent!.id,
        )) {
      items.add(
        EventFocusItem(
          event: widget.pendingReviewEvent!,
          kind: EventFocusKind.afterEvent,
          needsReview: true,
          clubName: widget.clubNameBuilder?.call(widget.pendingReviewEvent!),
        ),
      );
    }
    items.sort((a, b) {
      final priority = a.priority.compareTo(b.priority);
      if (priority != 0) return priority;
      if (a.canSwipe && b.canSwipe) {
        final expiry = a.windowClosesAt!.compareTo(b.windowClosesAt!);
        return expiry != 0 ? expiry : a.event.id.compareTo(b.event.id);
      }
      if (a.kind == EventFocusKind.afterEvent &&
          b.kind == EventFocusKind.afterEvent) {
        return b.event.endTime.compareTo(a.event.endTime);
      }
      return a.event.startTime.compareTo(b.event.startTime);
    });
    return items;
  }

  void _handleAction(EventFocusItem item, EventFocusAction action) {
    switch (action) {
      case EventFocusAction.viewEvent:
        widget.actions.onViewEvent(item.event);
      case EventFocusAction.checkIn:
        widget.actions.onCheckIn(item.event);
      case EventFocusAction.swipe:
        widget.actions.onOpenSwipe(item.event);
      case EventFocusAction.review:
        widget.actions.onWriteReview(item.event);
      case EventFocusAction.directions:
        widget.actions.onOpenDirections(item.event);
      case EventFocusAction.addToCalendar:
        widget.actions.onAddToCalendar(item.event);
    }
  }
}

class EventFocusCard extends StatelessWidget {
  const EventFocusCard({
    super.key,
    required this.item,
    required this.cardIndex,
    required this.cardCount,
    required this.checkInState,
    required this.onActionPressed,
    this.now,
    this.reducedMotion = false,
    this.compact = false,
  });

  final EventFocusItem item;
  final int cardIndex;
  final int cardCount;
  final EventFocusCheckInState checkInState;
  final ValueChanged<EventFocusAction> onActionPressed;
  final DateTime? now;
  final bool reducedMotion;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final actions = [item.primaryAction, ...item.secondaryActions];
    final activity = ActivityPalette.resolve(context, item.event.activityKind);

    return EventActionCard(
      event: item.event,
      onTap: item.canSwipe
          ? () => onActionPressed(EventFocusAction.swipe)
          : null,
      topAccentColors: [activity.accent, activity.deep],
      subtitle: item.clubName,
      urgent: item.isUrgent,
      indexLabel: cardCount > 1
          ? context.l10n.dashboardEventFocusRailVisiblecopyValue1Cardcount(
              value1: cardIndex + 1,
              cardCount: cardCount,
            )
          : null,
      badges: [
        EventActionCardBadge(
          label: item.badgeLabel(context.l10n),
          tone: item.isUrgent ? CatchBadgeTone.brand : CatchBadgeTone.neutral,
        ),
        if (item.canSwipe) ...[
          EventActionCardBadge(
            label: reducedMotion
                ? context.l10n.dashboardEventFocusListLabelStaticTimeLeft(
                    hours: _hoursLeft(
                      item.windowClosesAt!,
                      now ?? DateTime.now(),
                    ),
                  )
                : context.l10n.dashboardEventFocusListLabelTimeLeft(
                    timeLeft: _swipeCountdown(
                      item.windowClosesAt!,
                      now ?? DateTime.now(),
                    ),
                  ),
            tone: CatchBadgeTone.brand,
            icon: PhosphorIconsFill.heart,
          ),
          EventActionCardBadge(
            label: context.l10n.dashboardEventFocusListLabelAttendeesCheckedIn(
              attendedCount: item.attendedCount ?? item.event.attendedCount,
            ),
            tone: CatchBadgeTone.neutral,
            icon: CatchIcons.group,
          ),
        ],
        if (item.needsReview)
          EventActionCardBadge(
            label: context.l10n.dashboardEventFocusRailLabelReviewPending,
            tone: CatchBadgeTone.warning,
            icon: PhosphorIconsRegular.pencilLine,
          ),
      ],
      metaRows: compact
          ? const []
          : [
              [
                CatchMetaEntry(
                  icon: CatchIcons.clock,
                  label: context.l10n
                      .dashboardEventFocusRailLabelShortweekdayDayShortmonthTimerangelabel(
                        shortWeekday: EventFormatters.shortWeekday(
                          item.event.startTime,
                        ),
                        day: item.event.startTime.day,
                        shortMonth: EventFormatters.shortMonth(
                          item.event.startTime,
                        ),
                        timeRangeLabel: item.event.timeRangeLabel,
                      ),
                ),
              ],
              [
                CatchMetaEntry(
                  icon: CatchIcons.pinOutlined,
                  label: item.event.locationName,
                ),
              ],
              [
                CatchMetaEntry(
                  icon: activityKindGlyph(item.event.activityKind),
                  label: item.event.activitySummaryLabel,
                ),
                CatchMetaEntry(
                  icon: CatchIcons.group,
                  label: context.l10n
                      .dashboardEventFocusRailLabelSignedupcountCapacitylimit(
                        signedUpCount: item.event.signedUpCount,
                        capacityLimit: item.event.capacityLimit,
                      ),
                ),
              ],
            ],
      actions: [
        for (var index = 0; index < actions.length; index += 1)
          EventActionCardAction(
            key: actions[index].key,
            label: actions[index].label(context.l10n),
            icon: actions[index].icon,
            variant: index == 0
                ? CatchButtonVariant.primary
                : CatchButtonVariant.secondary,
            accentColor: index == 0 ? activity.accent : null,
            isLoading:
                index == 0 &&
                item.primaryAction == EventFocusAction.checkIn &&
                checkInState.isPending,
            onPressed:
                index == 0 &&
                    item.primaryAction == EventFocusAction.checkIn &&
                    checkInState.isPending
                ? null
                : () => onActionPressed(actions[index]),
          ),
      ],
    );
  }
}

enum EventFocusKind { upcoming, checkIn, afterEvent }

enum EventFocusAction {
  viewEvent,
  checkIn,
  directions,
  addToCalendar,
  swipe,
  review,
}

extension on EventFocusAction {
  String label(AppLocalizations l10n) {
    return switch (this) {
      EventFocusAction.viewEvent => l10n.dashboardEventFocusRailLabelViewEvent,
      EventFocusAction.checkIn => l10n.dashboardEventFocusRailLabelCheckIn,
      EventFocusAction.directions =>
        l10n.dashboardEventFocusRailLabelDirections,
      EventFocusAction.addToCalendar =>
        l10n.dashboardEventFocusRailLabelAddToCalendar,
      EventFocusAction.swipe => l10n.dashboardEventFocusRailLabelStartCatching,
      EventFocusAction.review => l10n.dashboardEventFocusRailLabelWriteReview,
    };
  }

  IconData get icon {
    return switch (this) {
      EventFocusAction.viewEvent => CatchIcons.forwardArrow,
      EventFocusAction.checkIn => CatchIcons.pin,
      EventFocusAction.directions => PhosphorIconsRegular.compass,
      EventFocusAction.addToCalendar => CatchIcons.calendarAdd,
      EventFocusAction.swipe => PhosphorIconsFill.heart,
      EventFocusAction.review => PhosphorIconsRegular.pencilLine,
    };
  }

  Key get key => EventFocusList.actionKey(name);
}

class EventFocusItem {
  const EventFocusItem({
    required this.event,
    required this.kind,
    this.clubName,
    this.canSwipe = false,
    this.needsReview = false,
    this.isToday = false,
    this.windowClosesAt,
    this.attendedCount,
  });

  final Event event;
  final EventFocusKind kind;
  final String? clubName;
  final bool canSwipe;
  final bool needsReview;
  final bool isToday;
  final DateTime? windowClosesAt;
  final int? attendedCount;

  bool get isUrgent =>
      kind == EventFocusKind.checkIn || canSwipe || needsReview;

  int get priority {
    if (canSwipe) return 0;
    if (kind == EventFocusKind.checkIn || isToday) return 1;
    if (kind == EventFocusKind.upcoming) return 2;
    return 3;
  }

  String badgeLabel(AppLocalizations l10n) {
    return switch (kind) {
      EventFocusKind.checkIn =>
        l10n.dashboardEventFocusRailBadgelabelCheckInOpen,
      EventFocusKind.afterEvent =>
        l10n.dashboardEventFocusRailBadgelabelAfterTheEvent,
      EventFocusKind.upcoming =>
        l10n.dashboardEventFocusRailBadgelabelNextEvent,
    };
  }

  EventFocusAction get primaryAction {
    if (kind == EventFocusKind.checkIn) return EventFocusAction.checkIn;
    if (canSwipe) return EventFocusAction.swipe;
    if (needsReview) return EventFocusAction.review;
    return EventFocusAction.viewEvent;
  }

  List<EventFocusAction> get secondaryActions {
    if (kind == EventFocusKind.checkIn) {
      return const [EventFocusAction.directions];
    }
    if (kind == EventFocusKind.upcoming) {
      return const [
        EventFocusAction.directions,
        EventFocusAction.addToCalendar,
      ];
    }
    if (canSwipe && needsReview) return const [EventFocusAction.review];
    return const [];
  }
}

int _hoursLeft(DateTime windowClosesAt, DateTime now) {
  final remaining = windowClosesAt.difference(now);
  if (remaining.isNegative) return 0;
  return (remaining.inMinutes / 60).ceil();
}

String _swipeCountdown(DateTime windowClosesAt, DateTime now) {
  final remaining = windowClosesAt.difference(now);
  if (remaining.isNegative) return '0h 00m';
  final h = remaining.inHours;
  final m = remaining.inMinutes.remainder(60);
  return '${h}h ${m.toString().padLeft(2, '0')}m';
}
