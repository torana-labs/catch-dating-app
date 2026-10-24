import 'dart:math' as math;

import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/domain/event_success_layout.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessRoomSummarySection extends StatelessWidget {
  const EventSuccessRoomSummarySection({
    super.key,
    required this.layout,
    required this.assignments,
    required this.attentionCount,
  });

  final EventSuccessLayout layout;
  final List<EventSuccessAssignment> assignments;
  final int attentionCount;

  @override
  Widget build(BuildContext context) {
    final placedCount = assignments
        .where((assignment) => assignment.layoutUnitId != null)
        .length;
    final confirmedCount = assignments
        .where((assignment) => assignment.confirmedLayoutUnitId != null)
        .length;
    final unconfirmedCount = math.max(0, placedCount - confirmedCount);
    final seatCount = layout.units.fold<int>(
      0,
      (total, unit) => total + unit.capacity,
    );
    final t = CatchTokens.of(context);
    final largeText = MediaQuery.textScalerOf(context).scale(1) >= 1.4;
    final metrics = [
      CatchMetricTile(
        value: '$placedCount',
        label: context.l10n.eventSuccessRoomWorkspacePlaced,
        center: !largeText,
      ),
      CatchMetricTile(
        value: '$unconfirmedCount',
        label: context.l10n.eventSuccessRoomWorkspaceUnconfirmed,
        center: !largeText,
        highlight: unconfirmedCount > 0,
      ),
      CatchMetricTile(
        value: '$attentionCount',
        label: context.l10n.eventSuccessRoomWorkspaceNeedsAttention,
        center: !largeText,
        highlight: attentionCount > 0,
      ),
    ];
    return CatchSurface(
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchText(
            context.l10n.eventSuccessRoomWorkspaceCapacitySummary(
              units: _eventSuccessRoomUnitCountLabel(context, layout),
              seats: seatCount,
            ),
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          gapH16,
          if (largeText)
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final indexed in metrics.indexed) ...[
                  indexed.$2,
                  if (indexed.$1 != metrics.length - 1) ...[
                    gapH8,
                    Divider(color: t.line),
                    gapH8,
                  ],
                ],
              ],
            )
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final indexed in metrics.indexed) ...[
                  Expanded(child: indexed.$2),
                  if (indexed.$1 != metrics.length - 1)
                    VerticalDivider(color: t.line, width: CatchSpacing.s3),
                ],
              ],
            ),
        ],
      ),
    );
  }
}

String _eventSuccessRoomUnitCountLabel(
  BuildContext context,
  EventSuccessLayout layout,
) {
  final count = layout.units.length;
  final shapes = layout.units.map((unit) => unit.shape).toSet();
  if (shapes.every(
    (shape) =>
        shape == EventSuccessLayoutShape.round ||
        shape == EventSuccessLayoutShape.rect,
  )) {
    return context.l10n.eventSuccessRoomWorkspaceTableCount(count: count);
  }
  if (shapes.length == 1) {
    return switch (shapes.single) {
      EventSuccessLayoutShape.row =>
        context.l10n.eventSuccessRoomWorkspaceRowCount(count: count),
      EventSuccessLayoutShape.court =>
        context.l10n.eventSuccessRoomWorkspaceCourtCount(count: count),
      EventSuccessLayoutShape.zone =>
        context.l10n.eventSuccessRoomWorkspaceZoneCount(count: count),
      EventSuccessLayoutShape.round || EventSuccessLayoutShape.rect =>
        context.l10n.eventSuccessRoomWorkspaceTableCount(count: count),
    };
  }
  return context.l10n.eventSuccessRoomWorkspaceAreaCount(count: count);
}
