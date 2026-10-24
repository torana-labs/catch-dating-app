import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/clubs/data/club_name_lookup.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/data/saved_event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen_state.dart';
import 'package:catch_dating_app/events/shared/event_agenda_list.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'calendar_loading_screen.dart';
part 'calendar_stats_header.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({
    super.key,
    this.referenceNow,
    this.initialSelectedDate,
    this.initialExpanded = false,
  });

  final DateTime? referenceNow;
  final DateTime? initialSelectedDate;
  final bool initialExpanded;

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  static const double _calendarDragThreshold = 8;

  final Map<DateTime, GlobalKey> _daySectionKeys = {};

  DateTime? _selectedDate;
  late bool _calendarExpanded;

  @override
  void initState() {
    super.initState();
    _selectedDate = widget.initialSelectedDate == null
        ? null
        : DateUtils.dateOnly(widget.initialSelectedDate!);
    _calendarExpanded = widget.initialExpanded;
  }

  @override
  Widget build(BuildContext context) {
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    final referenceNow = widget.referenceNow ?? DateTime.now();
    final fallbackSelectedDate = DateUtils.dateOnly(
      _selectedDate ?? widget.initialSelectedDate ?? referenceNow,
    );
    var topBarSelectedDate = fallbackSelectedDate;
    var topBarToday = DateUtils.dateOnly(referenceNow);
    late final Widget body;

    if (uidState.isLoading) {
      body = const CalendarLoadingScreen();
    } else if (uidState.hasError) {
      body = CatchLocalizedErrorState(
        uidState.error!,
        context: AppErrorContext.auth,
        onRetry: () => ref.invalidate(uidProvider),
      );
    } else {
      final uid = uidState.value;
      final signedUpEventsAsync = uid == null
          ? const AsyncData(<Event>[])
          : ref.watch(watchSignedUpEventsProvider(uid));
      final savedEventsAsync = uid == null
          ? const AsyncData(<Event>[])
          : ref.watch(watchSavedEventDetailsForUserProvider(uid));
      final signedUpEventsState = catchAsyncStateFromAsyncValue(
        signedUpEventsAsync,
      );
      final savedEventsState = catchAsyncStateFromAsyncValue(savedEventsAsync);

      if (signedUpEventsState.isLoading || savedEventsState.isLoading) {
        body = const CalendarLoadingScreen();
      } else if (signedUpEventsState.hasError || savedEventsState.hasError) {
        body = CatchLocalizedErrorState(
          signedUpEventsState.error ?? savedEventsState.error!,
          context: AppErrorContext.event,
          onRetry: uid == null
              ? null
              : () {
                  ref.invalidate(watchSignedUpEventsProvider(uid));
                  ref.invalidate(watchSavedEventDetailsForUserProvider(uid));
                },
        );
      } else {
        final calendarState = CalendarHomeState.from(
          signedUpEvents: signedUpEventsState.value ?? const <Event>[],
          savedEvents: savedEventsState.value ?? const <Event>[],
          now: referenceNow,
          selectedDate: _selectedDate,
          expanded: _calendarExpanded,
        );
        final clubNamesAsync = calendarState.hasEvents
            ? ref.watch(
                clubNameLookupProvider(
                  ClubNameLookupQuery(calendarState.clubIds),
                ),
              )
            : const AsyncData(<String, String>{});
        final agendaState = calendarState.agendaSection(
          clubNames: _calendarClubNameLookupState(clubNamesAsync),
        );
        topBarSelectedDate = calendarState.selectedDate;
        topBarToday = calendarState.summary.today;
        body = NotificationListener<ScrollNotification>(
          onNotification: _handleCalendarScrollNotification,
          child: CustomScrollView(
            slivers: [
              SliverPersistentHeader(
                pinned: true,
                delegate: _CalendarDateHeaderDelegate(
                  height: _calendarDateHeaderHeightFor(
                    context,
                    expanded: calendarState.expanded,
                  ),
                  child: CalendarDateHeader(
                    summary: calendarState.summary,
                    selectedDate: calendarState.selectedDate,
                    expanded: calendarState.expanded,
                    onDateSelected: _selectDate,
                    onVerticalDragDelta: _handleCalendarHeaderDragDelta,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: CalendarStatsHeader(summary: calendarState.summary),
              ),
              CalendarAgendaSliverSection(
                state: agendaState,
                dayKeyBuilder: _agendaDayKey,
                onEventSelected: (event) => _openEventDetail(context, event),
                onRetryClubNames: () => ref.invalidate(clubNameLookupProvider),
              ),
              const CatchScrollTerminalGap.sliver(),
            ],
          ),
        );
      }
    }

    final t = CatchTokens.of(context);
    return CatchRouteScaffold(
      backgroundColor: t.bg,
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: _calendarMonthLabel(topBarSelectedDate),
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: [
          CatchButton.text(
            label: context.l10n.eventsCalendarScreenLabelToday,
            onPressed: () => _selectDate(topBarToday),
            foregroundColor: t.ink,
          ),
        ],
      ),
      body: CatchRouteBody.fullBleed(
        child: SafeArea(bottom: false, child: body),
      ),
    );
  }

  void _openEventDetail(BuildContext context, Event event) {
    context.pushNamed(
      Routes.calendarEventDetailScreen.name,
      pathParameters: {'clubId': event.clubId, 'eventId': event.id},
      extra: event,
    );
  }

  void _selectDate(DateTime date) {
    final day = DateUtils.dateOnly(date);
    setState(() => _selectedDate = day);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final dayContext = _daySectionKeys[day]?.currentContext;
      if (dayContext == null) return;
      final alignment = _agendaRevealAlignment(dayContext);
      Scrollable.ensureVisible(
        dayContext,
        duration: CatchMotion.calendarScroll,
        curve: CatchMotion.easeOutCubicCurve,
        alignment: alignment,
      );
    });
  }

  double _agendaRevealAlignment(BuildContext dayContext) {
    final scrollable = Scrollable.maybeOf(dayContext);
    final viewportHeight = scrollable?.position.viewportDimension;
    if (viewportHeight == null || viewportHeight <= 0) return 0.18;

    return _CalendarDateHeaderLayout.from(context).agendaRevealAlignment(
      expanded: _calendarExpanded,
      viewportHeight: viewportHeight,
    );
  }

  bool _handleCalendarScrollNotification(ScrollNotification notification) {
    if (notification.depth != 0) return false;

    if (notification is ScrollUpdateNotification) {
      final delta = notification.dragDetails?.delta.dy;
      if (delta != null) {
        _handleCalendarDragDelta(
          delta,
          scrollPixels: notification.metrics.pixels,
        );
      }
    } else if (notification is OverscrollNotification) {
      final delta = notification.dragDetails?.delta.dy;
      if (delta != null) {
        _handleCalendarDragDelta(
          delta,
          scrollPixels: notification.metrics.pixels,
        );
      }
    } else if (notification is UserScrollNotification &&
        notification.direction == ScrollDirection.reverse) {
      _setCalendarExpanded(false);
    }

    return false;
  }

  void _handleCalendarHeaderDragDelta(double delta) {
    _handleCalendarDragDelta(delta, scrollPixels: 0);
  }

  void _handleCalendarDragDelta(double delta, {required double scrollPixels}) {
    if (delta > _calendarDragThreshold && scrollPixels <= CatchSpacing.s4) {
      _setCalendarExpanded(true);
    } else if (delta < -_calendarDragThreshold) {
      _setCalendarExpanded(false);
    }
  }

  void _setCalendarExpanded(bool expanded) {
    if (_calendarExpanded == expanded) return;
    setState(() => _calendarExpanded = expanded);
  }

  Key _agendaDayKey(DateTime date) {
    final day = DateUtils.dateOnly(date);
    return _daySectionKeys.putIfAbsent(
      day,
      () => GlobalKey(
        debugLabel: context.l10n
            .eventsCalendarScreenVisiblecopyCalendarAgendaDayDatekey(
              dateKey: _dateKey(day),
            ),
      ),
    );
  }
}

CalendarClubNameLookupState _calendarClubNameLookupState(
  AsyncValue<Map<String, String>> value,
) {
  final names = value.asData?.value;
  if (names != null) return CalendarClubNameLookupState.ready(names);
  if (value.hasError) return CalendarClubNameLookupState.failure(value.error!);
  return const CalendarClubNameLookupState.loading();
}

class CalendarAgendaSliverSection extends StatelessWidget {
  const CalendarAgendaSliverSection({
    super.key,
    required this.state,
    required this.dayKeyBuilder,
    required this.onEventSelected,
    required this.onRetryClubNames,
  });

  final CalendarAgendaSectionState state;
  final EventAgendaDayKeyBuilder dayKeyBuilder;
  final ValueChanged<Event> onEventSelected;
  final VoidCallback onRetryClubNames;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      CalendarAgendaEmptyState() => CatchSliverEmptyState(
        icon: CatchIcons.calendarMonthOutlined,
        title: const CalendarAgendaEmptyState().title(context.l10n),
        message: const CalendarAgendaEmptyState().body(context.l10n),
        iconSize: CatchLayout.calendarEmptyIconSize,
        padding: CatchInsets.contentSpacious,
        titleStyle: CatchTextStyles.titleL(context),
        messageStyle: CatchTextStyles.supporting(
          context,
          color: CatchTokens.of(context).ink2,
        ),
        accountForBottomOverlay: false,
      ),
      CalendarAgendaClubNamesLoadingState(:final skeletonCount) =>
        EventAgendaSliverSkeleton(count: skeletonCount),
      CalendarAgendaClubNamesErrorState(:final error) =>
        CatchStateViewport.sliver(
          accountForBottomOverlay: false,
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onRetryClubNames,
          ),
        ),
      CalendarAgendaReadyState(:final rows, :final today) =>
        EventAgendaSliverList(
          agendaRows: [
            for (final row in rows)
              EventAgendaRow(
                event: row.event,
                clubName: row.clubName,
                badgeLabel: row.badgeLabel(context.l10n),
                status: _eventTileStatusFor(row.status),
              ),
          ],
          showClubName: true,
          today: today,
          preserveInputOrder: true,
          dayKeyBuilder: dayKeyBuilder,
          onEventSelected: onEventSelected,
        ),
    };
  }
}

EventTileStatus _eventTileStatusFor(CalendarAgendaEventStatus status) {
  return switch (status) {
    CalendarAgendaEventStatus.cancelled => EventTileStatus.cancelled,
    CalendarAgendaEventStatus.saved => EventTileStatus.saved,
    CalendarAgendaEventStatus.joined => EventTileStatus.joined,
  };
}

class _CalendarDateHeaderLayout {
  const _CalendarDateHeaderLayout({required this.textScaler});

  factory _CalendarDateHeaderLayout.from(BuildContext context) {
    return _CalendarDateHeaderLayout(
      textScaler: MediaQuery.textScalerOf(context),
    );
  }

  final TextScaler textScaler;

  double extentFor({required bool expanded}) {
    return expanded ? expandedExtent : collapsedExtent;
  }

  double agendaRevealAlignment({
    required bool expanded,
    required double viewportHeight,
  }) {
    if (viewportHeight <= 0) return 0.18;
    return ((extentFor(expanded: expanded) + CatchSpacing.s2) / viewportHeight)
        .clamp(0.12, 0.32)
        .toDouble();
  }

  double get collapsedExtent {
    return CatchSpacing.s2 +
        weekStripHeight +
        CatchSpacing.s3 +
        CatchSpacing.micro2;
  }

  double get expandedExtent {
    return CatchSpacing.s2 +
        monthWeekdayHeight +
        CatchSpacing.s2 +
        CatchLayout.calendarMonthGridHeight +
        CatchLayout.calendarMonthGridGapTotal +
        CatchSpacing.s3 +
        CatchSpacing.micro2;
  }

  double get weekStripHeight {
    final weekdayHeight =
        textScaler.scale(CatchLayout.calendarWeekdayFontSize) *
        CatchLayout.calendarWeekdayLineHeight;
    final dateHeight =
        textScaler.scale(CatchLayout.calendarDateFontSize) *
        CatchLayout.calendarDateLineHeight;
    return CatchLayout.calendarWeekStripVerticalInsetTotal +
        weekdayHeight +
        CatchSpacing.micro2 +
        dateHeight +
        CatchSpacing.s1 +
        CatchLayout.calendarWeekStripBottomInset;
  }

  double get monthWeekdayHeight {
    return textScaler.scale(CatchLayout.calendarMonthWeekdayFontSize) *
        CatchLayout.calendarMonthWeekdayLineHeight;
  }
}

double _calendarDateHeaderHeightFor(
  BuildContext context, {
  required bool expanded,
}) {
  return _CalendarDateHeaderLayout.from(context).extentFor(expanded: expanded);
}

class CalendarDateHeader extends StatelessWidget {
  const CalendarDateHeader({
    super.key,
    required this.summary,
    required this.selectedDate,
    required this.expanded,
    required this.onDateSelected,
    required this.onVerticalDragDelta,
  });

  final CalendarEventSummary summary;
  final DateTime selectedDate;
  final bool expanded;
  final ValueChanged<DateTime> onDateSelected;
  final ValueChanged<double> onVerticalDragDelta;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: expanded
          ? context.l10n.eventsCalendarScreenLabelCalendarDateHeaderDrag
          : context.l10n.eventsCalendarScreenLabelCalendarDateHeaderDrag0f5be6,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onVerticalDragUpdate: (details) =>
            onVerticalDragDelta(details.delta.dy),
        child: Padding(
          padding: CatchInsets.pageHeaderCompact,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (expanded)
                CalendarMonthGrid(
                  summary: summary,
                  selectedDate: selectedDate,
                  onDateSelected: onDateSelected,
                )
              else
                CalendarWeekRow(
                  summary: summary,
                  selectedDate: selectedDate,
                  onDateSelected: onDateSelected,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

String _calendarMonthLabel(DateTime date) {
  return '${_monthName(date.month)} ${date.year}';
}

class CalendarDateHeaderSkeleton extends StatelessWidget {
  const CalendarDateHeaderSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: CatchInsets.pageHeaderCompact,
      child: CalendarWeekRowSkeleton(),
    );
  }
}

class CalendarWeekRowSkeleton extends StatelessWidget {
  const CalendarWeekRowSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < DateTime.daysPerWeek; i++) ...[
          Expanded(
            child: CatchSkeleton.box(
              height: CatchSpacing.s12,
              radius: CatchRadius.sm,
              borderColor: i == 2 ? CatchTokens.of(context).line2 : null,
            ),
          ),
          if (i < DateTime.daysPerWeek - 1) gapW4,
        ],
      ],
    );
  }
}

class _CalendarDateHeaderDelegate extends SliverPersistentHeaderDelegate {
  const _CalendarDateHeaderDelegate({
    required this.child,
    required this.height,
  });

  final Widget child;
  final double height;

  @override
  double get minExtent => height;

  @override
  double get maxExtent => height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    final t = CatchTokens.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.bg,
        border: overlapsContent
            ? Border(bottom: BorderSide(color: t.line))
            : null,
      ),
      child: SizedBox.expand(child: child),
    );
  }

  @override
  bool shouldRebuild(covariant _CalendarDateHeaderDelegate oldDelegate) {
    return child != oldDelegate.child || height != oldDelegate.height;
  }
}

class CalendarStatsHeaderSkeleton extends StatelessWidget {
  const CalendarStatsHeaderSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.pageBody.copyWith(
        top: CatchSpacing.micro2,
        bottom: CatchSpacing.s3,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: CatchLayout.maxContentWidth,
          ),
          child: const CatchSurface(
            padding: CatchInsets.tileContentCompact,
            radius: CatchRadius.md,
            borderRole: CatchBorderRole.separator,
            child: Row(
              children: [
                Expanded(child: CalendarStatSkeleton()),
                CalendarStatDivider(),
                Expanded(child: CalendarStatSkeleton()),
                CalendarStatDivider(),
                Expanded(child: CalendarStatSkeleton()),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class CalendarStatSkeleton extends StatelessWidget {
  const CalendarStatSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchSkeleton.text(width: CatchLayout.skeletonTextShortWidth),
        gapH8,
        CatchSkeleton.text(width: CatchSpacing.s10),
      ],
    );
  }
}

class CalendarWeekRow extends StatelessWidget {
  const CalendarWeekRow({
    super.key,
    required this.summary,
    required this.selectedDate,
    required this.onDateSelected,
  });

  final CalendarEventSummary summary;
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateSelected;

  @override
  Widget build(BuildContext context) {
    final anchor = selectedDate;
    final monday = anchor.subtract(Duration(days: anchor.weekday - 1));
    final eventDays = summary.events
        .map((event) => DateUtils.dateOnly(event.startTime))
        .toSet();

    return Row(
      children: [
        for (var i = 0; i < 7; i++) ...[
          Expanded(
            child: Builder(
              builder: (context) {
                final date = DateUtils.dateOnly(monday.add(Duration(days: i)));
                return EventDateTile(
                  key: _calendarWeekDayKey(date),
                  date: date,
                  active: DateUtils.isSameDay(date, selectedDate),
                  hasEvent: eventDays.contains(date),
                  onTap: () => onDateSelected(date),
                );
              },
            ),
          ),
          if (i < 6) gapW4,
        ],
      ],
    );
  }
}

class CalendarMonthGrid extends StatelessWidget {
  const CalendarMonthGrid({
    super.key,
    required this.summary,
    required this.selectedDate,
    required this.onDateSelected,
  });

  final CalendarEventSummary summary;
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateSelected;

  @override
  Widget build(BuildContext context) {
    final firstOfMonth = DateTime(selectedDate.year, selectedDate.month);
    final gridStart = firstOfMonth.subtract(
      Duration(days: firstOfMonth.weekday % DateTime.daysPerWeek),
    );
    final eventDays = summary.events
        .map((event) => DateUtils.dateOnly(event.startTime))
        .toSet();

    return Column(
      children: [
        Row(
          children: [
            for (final day in [
              context.l10n.eventsCalendarScreenVisiblecopyS,
              context.l10n.eventsCalendarScreenVisiblecopyM,
              context.l10n.eventsCalendarScreenVisiblecopyT,
              context.l10n.eventsCalendarScreenVisiblecopyW,
              context.l10n.eventsCalendarScreenVisiblecopyT,
              context.l10n.eventsCalendarScreenVisiblecopyF,
              context.l10n.eventsCalendarScreenVisiblecopyS,
            ])
              Expanded(
                child: CatchText(
                  day,
                  textAlign: TextAlign.center,
                  variant: CatchTextVariant.statusLabel,
                  color: CatchTokens.of(context).ink2,
                ),
              ),
          ],
        ),
        gapH8,
        for (var week = 0; week < 6; week += 1) ...[
          Row(
            children: [
              for (
                var weekday = 0;
                weekday < DateTime.daysPerWeek;
                weekday += 1
              )
                Expanded(
                  child: Builder(
                    builder: (context) {
                      final date = DateUtils.dateOnly(
                        gridStart.add(
                          Duration(
                            days: (week * DateTime.daysPerWeek) + weekday,
                          ),
                        ),
                      );
                      final inMonth = date.month == selectedDate.month;
                      return EventDateTile(
                        key: inMonth ? _calendarMonthDayKey(date) : null,
                        date: date,
                        layout: EventDateTileVariant.monthGrid,
                        enabled: inMonth,
                        active: DateUtils.isSameDay(date, selectedDate),
                        today: DateUtils.isSameDay(date, summary.today),
                        hasEvent: eventDays.contains(date),
                        onTap: () => onDateSelected(date),
                      );
                    },
                  ),
                ),
            ],
          ),
          if (week < 5) gapH6,
        ],
      ],
    );
  }
}

class CalendarStatDivider extends StatelessWidget {
  const CalendarStatDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: CatchLayout.calendarStatDividerHorizontalMargin,
      ),
      child: SizedBox(
        width: CatchStroke.hairline,
        height: CatchLayout.calendarStatDividerHeight,
        child: ColoredBox(color: t.line),
      ),
    );
  }
}

String _monthName(int month) {
  return const [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ][month - 1];
}

Key _calendarWeekDayKey(DateTime date) {
  return ValueKey<String>('calendar-week-day-${_dateKey(date)}');
}

Key _calendarMonthDayKey(DateTime date) {
  return ValueKey<String>('calendar-month-day-${_dateKey(date)}');
}

String _dateKey(DateTime date) {
  final day = DateUtils.dateOnly(date);
  final month = day.month.toString().padLeft(2, '0');
  final dateOfMonth = day.day.toString().padLeft(2, '0');
  return '${day.year}-$month-$dateOfMonth';
}
