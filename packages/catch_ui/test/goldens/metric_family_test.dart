import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('metric recipes at scale $scale', (tester) async {
      await matchCatchGolden(
        tester,
        'metric_family@$scale',
        textScale: scale,
        size: const Size(560, 2300),
        builder: (context) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 20,
            children: [
              const CatchMetricTile(value: '24', label: 'Guests'),
              const CatchMetricTile(
                value: '12',
                label: 'Events',
                icon: Icons.event,
                highlight: true,
                center: true,
              ),
              const CatchMetricTile(
                value: '42',
                label: 'Kilometres this month',
                variant: CatchMetricTileVariant.mono,
                mode: CatchMetricTileMode.surface,
              ),
              const CatchMetricTile.compact(
                item: CatchMetricValue(
                  value: '8.4',
                  unit: 'km',
                  label: 'Distance',
                ),
              ),
              const CatchMetricSection(
                items: [
                  CatchMetricValue(value: '12', label: 'Guests'),
                  CatchMetricValue(value: '8.4', unit: 'km', label: 'Distance'),
                  CatchMetricValue(value: '3', label: 'Events'),
                ],
              ),
              for (final status in CatchMetricDataStatus.values)
                CatchDataQualityMetricTile(
                  data: CatchMetricData(
                    icon: Icons.people,
                    value: '24',
                    label: 'Confirmed guests',
                    caption: 'Includes the latest registrations',
                    status: status,
                    partialBadgeLabel: 'Partial',
                    missingBadgeLabel: 'Missing',
                  ),
                ),
              const CatchMetricSection.dataQuality(
                metrics: [
                  CatchMetricData(
                    icon: Icons.people,
                    value: '24',
                    label: 'Guests',
                    partialBadgeLabel: 'Partial',
                    missingBadgeLabel: 'Missing',
                  ),
                  CatchMetricData(
                    icon: Icons.event,
                    value: '3',
                    label: 'Events',
                    status: CatchMetricDataStatus.partial,
                    partialBadgeLabel: 'Partial',
                    missingBadgeLabel: 'Missing',
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}
