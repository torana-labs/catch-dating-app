import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/hosts/domain/host_attendance_window.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_action_keys.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostEventToolItem {
  const HostEventToolItem({required this.event, required this.attendanceState});

  final Event event;
  final HostEventAttendanceState attendanceState;

  bool get canTakeAttendance =>
      attendanceState == HostEventAttendanceState.open;
}

class HostEventToolsRail extends StatefulWidget {
  const HostEventToolsRail({
    super.key,
    required this.tools,
    required this.onManageEvent,
    required this.onTakeAttendance,
    required this.onViewReport,
  });

  static const railKey = Key('host-event-tools-carousel');
  static const pageIndicatorKey = Key('host-event-tools-page-indicator');

  final List<HostEventToolItem> tools;
  final ValueChanged<Event> onManageEvent;
  final ValueChanged<Event> onTakeAttendance;
  final ValueChanged<Event> onViewReport;

  @override
  State<HostEventToolsRail> createState() => _HostEventToolsRailState();
}

class _HostEventToolsRailState extends State<HostEventToolsRail> {
  static const _minimumSwipeDistance = 56.0;
  static const _minimumSwipeVelocity = 360.0;

  int _selectedIndex = 0;
  double _dragDistance = 0;

  @override
  void didUpdateWidget(covariant HostEventToolsRail oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_selectedIndex >= widget.tools.length) {
      _selectedIndex = widget.tools.isEmpty ? 0 : widget.tools.length - 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tools.isEmpty) return const SizedBox.shrink();
    if (_selectedIndex >= widget.tools.length) {
      _selectedIndex = widget.tools.length - 1;
    }

    final selectedTool = widget.tools[_selectedIndex];
    final canAdvance = _selectedIndex < widget.tools.length - 1;
    final canRetreat = _selectedIndex > 0;
    return SizedBox(
      key: HostEventToolsRail.railKey,
      child: Semantics(
        label: context.l10n.hostsHostEventToolsLabelHostEventToolsCarousel,
        value: context.l10n.hostsHostEventToolsVisiblecopyHostedEventValue1Of(
          value1: _selectedIndex + 1,
          length: widget.tools.length,
        ),
        increasedValue: canAdvance
            ? context.l10n.hostsHostEventToolsVisiblecopyHostedEventValue1Of(
                value1: _selectedIndex + 2,
                length: widget.tools.length,
              )
            : null,
        decreasedValue: canRetreat
            ? context.l10n
                  .hostsHostEventToolsVisiblecopyHostedEventSelectedindexOf(
                    selectedIndex: _selectedIndex,
                    length: widget.tools.length,
                  )
            : null,
        onIncrease: widget.tools.length > 1 && canAdvance
            ? () => setState(() => _selectedIndex += 1)
            : null,
        onDecrease: widget.tools.length > 1 && canRetreat
            ? () => setState(() => _selectedIndex -= 1)
            : null,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onHorizontalDragStart: widget.tools.length > 1
              ? (_) => _dragDistance = 0
              : null,
          onHorizontalDragUpdate: widget.tools.length > 1
              ? (details) => _dragDistance += details.primaryDelta ?? 0
              : null,
          onHorizontalDragEnd: widget.tools.length > 1
              ? (details) => _handleHorizontalDragEnd(
                  details: details,
                  itemCount: widget.tools.length,
                )
              : null,
          onHorizontalDragCancel: widget.tools.length > 1
              ? () => _dragDistance = 0
              : null,
          child: AnimatedSwitcher(
            duration: CatchMotion.base,
            switchInCurve: CatchMotion.easeOutCubicCurve,
            switchOutCurve: CatchMotion.easeInCubicCurve,
            transitionBuilder: (child, animation) =>
                FadeTransition(opacity: animation, child: child),
            child: HostEventToolCard(
              key: ValueKey(
                'host-event-tool-${selectedTool.event.id}-'
                '${selectedTool.attendanceState.name}',
              ),
              item: selectedTool,
              cardIndex: _selectedIndex,
              cardCount: widget.tools.length,
              onManageEvent: widget.onManageEvent,
              onTakeAttendance: widget.onTakeAttendance,
              onViewReport: widget.onViewReport,
            ),
          ),
        ),
      ),
    );
  }

  void _handleHorizontalDragEnd({
    required DragEndDetails details,
    required int itemCount,
  }) {
    final velocity = details.primaryVelocity ?? 0;
    final shouldAdvance =
        velocity < -_minimumSwipeVelocity ||
        _dragDistance < -_minimumSwipeDistance;
    final shouldRetreat =
        velocity > _minimumSwipeVelocity ||
        _dragDistance > _minimumSwipeDistance;
    int boundIndex(int value) => value.clamp(0, itemCount - 1).toInt();
    final nextIndex = switch ((shouldAdvance, shouldRetreat)) {
      (true, _) => boundIndex(_selectedIndex + 1),
      (_, true) => boundIndex(_selectedIndex - 1),
      _ => _selectedIndex,
    };

    _dragDistance = 0;
    if (nextIndex == _selectedIndex) return;
    setState(() => _selectedIndex = nextIndex);
  }
}

class HostEventToolsPageIndicator extends StatelessWidget {
  const HostEventToolsPageIndicator({
    super.key,
    required this.selectedIndex,
    required this.itemCount,
  });

  final int selectedIndex;
  final int itemCount;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    final progress = ((selectedIndex + 1) / itemCount).clamp(0.0, 1.0);

    return Semantics(
      label: context.l10n.hostsHostEventToolsLabelHostEventValue1Of(
        value1: selectedIndex + 1,
        itemCount: itemCount,
      ),
      child: Row(
        children: [
          CatchText(
            context.l10n.hostsHostEventToolsTextValue1OfItemcount(
              value1: selectedIndex + 1,
              itemCount: itemCount,
            ),
            maxLines: 1,

            variant: CatchTextVariant.statusLabel,
            color: t.ink2,
          ),
          gapW10,
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(CatchRadius.pill),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: CatchSpacing.micro6,
                backgroundColor: t.line2.withValues(
                  alpha: CatchOpacity.pageDotInactive,
                ),
                valueColor: AlwaysStoppedAnimation<Color>(t.primary),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class HostEventToolCard extends StatelessWidget {
  const HostEventToolCard({
    super.key,
    required this.item,
    required this.cardIndex,
    required this.cardCount,
    required this.onManageEvent,
    required this.onTakeAttendance,
    required this.onViewReport,
  });

  final HostEventToolItem item;
  final int cardIndex;
  final int cardCount;
  final ValueChanged<Event> onManageEvent;
  final ValueChanged<Event> onTakeAttendance;
  final ValueChanged<Event> onViewReport;

  @override
  Widget build(BuildContext context) {
    final palette = HostToolPalette.forAttendanceState(
      context,
      item.attendanceState,
    );
    final event = item.event;
    final action = _hostEventActionForState(item.attendanceState);

    return EventActionCard(
      event: event,
      radius: CatchRadius.heroCard,
      backgroundColor: palette.background,
      borderColor: palette.border,
      gradientColors: palette.gradientColors,
      badges: [
        EventActionCardBadge(
          label: context.l10n.hostsHostEventToolsLabelHostEvent,
          tone: CatchBadgeTone.brand,
        ),
        EventActionCardBadge(
          label: item.attendanceState.badgeLabel(context.l10n),
          tone: item.attendanceState.badgeTone,
          icon: item.canTakeAttendance ? CatchIcons.checklistRounded : null,
        ),
      ],
      headerAccessory: cardCount > 1
          ? HostEventToolsPageIndicator(
              key: HostEventToolsRail.pageIndicatorKey,
              selectedIndex: cardIndex,
              itemCount: cardCount,
            )
          : null,
      metaRows: [
        [
          CatchMetaEntry(
            icon: CatchIcons.accessTimeRounded,
            label: context.l10n
                .hostsHostEventToolsLabelShortdatelabelTimerangelabel(
                  shortDateLabel: event.shortDateLabel,
                  timeRangeLabel: event.timeRangeLabel,
                ),
          ),
        ],
        [
          CatchMetaEntry(
            icon: CatchIcons.locationOnOutlined,
            label: event.locationName,
          ),
        ],
        [
          CatchMetaEntry(
            icon: CatchIcons.groupsOutlined,
            label: context.l10n
                .hostsHostEventToolsLabelSignedupcountCapacitylimitBookedWaitlistcount(
                  signedUpCount: event.signedUpCount,
                  capacityLimit: event.capacityLimit,
                  waitlistCount: event.waitlistCount,
                ),
          ),
        ],
      ],
      actions: [
        EventActionCardAction(
          key: switch (action) {
            _HostEventAction.takeAttendance =>
              HostEventActionKeys.takeAttendanceButton,
            _ => null,
          },
          label: action.label(context.l10n),
          icon: action.icon,
          variant: CatchButtonVariant.primary,
          onPressed: () => _handleAction(action),
        ),
      ],
    );
  }

  void _handleAction(_HostEventAction action) {
    switch (action) {
      case _HostEventAction.manage:
        onManageEvent(item.event);
      case _HostEventAction.takeAttendance:
        onTakeAttendance(item.event);
      case _HostEventAction.viewReport:
        onViewReport(item.event);
    }
  }
}

class HostToolPalette {
  const HostToolPalette({
    required this.background,
    required this.border,
    required this.gradientColors,
  });

  final Color background;
  final Color border;
  final List<Color> gradientColors;

  factory HostToolPalette.forAttendanceState(
    BuildContext context,
    HostEventAttendanceState state,
  ) {
    final t = CatchTokens.of(context);
    final isOpen = state == HostEventAttendanceState.open;

    return HostToolPalette(
      background: isOpen ? t.primarySoft : t.surface,
      border: isOpen
          ? t.primary.withValues(alpha: CatchOpacity.gradientBandSoft)
          : t.line2,
      gradientColors: [
        isOpen
            ? t.primarySoft.withValues(
                alpha: CatchOpacity.revealMutedForeground,
              )
            : t.primarySoft.withValues(
                alpha: CatchOpacity.clubCoverPaletteLine,
              ),
        t.surface,
        t.raised.withValues(alpha: CatchOpacity.eventHeroMutedInk),
      ],
    );
  }

  factory HostToolPalette.defaultPanel(BuildContext context) {
    final t = CatchTokens.of(context);

    return HostToolPalette(
      background: t.surface,
      border: t.primary.withValues(
        alpha: CatchOpacity.eventSuccessSubtleBorder,
      ),
      gradientColors: [
        t.primarySoft.withValues(alpha: CatchOpacity.eventSuccessMuted),
        t.surface,
        t.raised.withValues(alpha: CatchOpacity.eventHeroMutedInk),
      ],
    );
  }
}

enum _HostEventAction { manage, takeAttendance, viewReport }

_HostEventAction _hostEventActionForState(HostEventAttendanceState state) {
  return switch (state) {
    HostEventAttendanceState.open => _HostEventAction.takeAttendance,
    HostEventAttendanceState.opensLater => _HostEventAction.manage,
    HostEventAttendanceState.closed => _HostEventAction.viewReport,
  };
}

extension on _HostEventAction {
  IconData get icon {
    return switch (this) {
      _HostEventAction.manage => CatchIcons.tuneRounded,
      _HostEventAction.takeAttendance => CatchIcons.checklistRounded,
      _HostEventAction.viewReport => CatchIcons.insightsOutlined,
    };
  }

  String label(AppLocalizations l10n) {
    return switch (this) {
      _HostEventAction.manage => l10n.hostsHostEventToolsLabelManageEvent,
      _HostEventAction.takeAttendance =>
        l10n.hostsHostEventToolsLabelTakeAttendance,
      _HostEventAction.viewReport => l10n.hostsHostEventToolsLabelViewReport,
    };
  }
}

extension HostEventAttendanceStateLabels on HostEventAttendanceState {
  String badgeLabel(AppLocalizations l10n) {
    return switch (this) {
      HostEventAttendanceState.open =>
        l10n.hostsHostEventToolsBadgelabelAttendanceOpen,
      HostEventAttendanceState.opensLater =>
        l10n.hostsHostEventToolsBadgelabelUpcoming,
      HostEventAttendanceState.closed =>
        l10n.hostsHostEventToolsBadgelabelAttendanceClosed,
    };
  }

  CatchBadgeTone get badgeTone {
    return switch (this) {
      HostEventAttendanceState.open => CatchBadgeTone.brand,
      HostEventAttendanceState.opensLater => CatchBadgeTone.neutral,
      HostEventAttendanceState.closed => CatchBadgeTone.neutral,
    };
  }
}
