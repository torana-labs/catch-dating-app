import 'package:catch_dating_app/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/events/shared/event_route_labels.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Public route expectations; operator roles and tracking policy stay in Host.
class EventDetailRouteSection extends StatelessWidget {
  const EventDetailRouteSection({super.key, required this.plan});
  final RouteEventPlan plan;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final rows = [
      [
        routeMovementLabel(l10n, plan.movementMode),
        routeShapeLabel(l10n, plan.routeShape),
      ].join(' · '),
      [
        routeGroupLabel(l10n, plan.groupStrategy),
        routeCadenceLabel(l10n, plan.stopCadence),
      ].join(' · '),
      if (plan.stopKinds.isNotEmpty)
        plan.stopKinds.map((kind) => routeStopLabel(l10n, kind)).join(' · '),
      for (final group in plan.paceGroups)
        group.targetPaceSecondsPerKm == null
            ? group.label
            : l10n.eventsRoutePaceGroup(
                label: group.label,
                pace:
                    '${group.targetPaceSecondsPerKm! ~/ 60}:${(group.targetPaceSecondsPerKm! % 60).toString().padLeft(2, '0')}',
              ),
    ];
    return CatchSection.divided(
      title: l10n.hostsRouteEventPlanSectionTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final row in rows) ...[
            CatchText(row, variant: CatchTextVariant.supporting),
            const SizedBox(height: CatchSpacing.s2),
          ],
        ],
      ),
    );
  }
}
