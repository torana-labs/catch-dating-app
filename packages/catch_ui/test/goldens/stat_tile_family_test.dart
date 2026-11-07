@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

const _stats = [
  CatchMetricTile.stat(
    label: 'Bookings',
    value: '312',
    note: 'Up 18%',
    noteTone: CatchMetricTileTone.success,
  ),
  CatchMetricTile.stat(
    label: 'Ticket sales',
    value: '₹1.48L',
    note: 'Up 11%',
    noteTone: CatchMetricTileTone.success,
  ),
  CatchMetricTile.stat(
    label: 'Came back',
    value: '41%',
    note: 'of guests rebooked',
  ),
  CatchMetricTile.stat(
    label: 'Followers',
    value: '1,284',
    note: '148 new this month',
    noteTone: CatchMetricTileTone.success,
  ),
];

/// The four stats in equal rows of [perRow].
class _Stats extends StatelessWidget {
  const _Stats({required this.perRow, required this.sizeClass});

  final int perRow;
  final CatchWindowSize sizeClass;

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: _themeOf(context),
    size: sizeClass,
    child: Padding(
      padding: const EdgeInsets.all(CatchSpacing.s5),
      child: CatchStack(
        children: [
          for (var start = 0; start < _stats.length; start += perRow)
            CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              children: _stats.sublist(start, start + perRow),
            ),
        ],
      ),
    ),
  );
}

void main() {
  testWidgets('two to a row on a phone', (tester) async {
    await matchCatchGolden(
      tester,
      'stat_tile_family_compact',
      size: const Size(390, 320),
      builder: (_) =>
          const _Stats(perRow: 2, sizeClass: CatchWindowSize.compact),
    );
  });

  testWidgets('four to a row at 1024', (tester) async {
    await matchCatchGolden(
      tester,
      'stat_tile_family_expanded',
      size: const Size(1024, 200),
      builder: (_) =>
          const _Stats(perRow: 4, sizeClass: CatchWindowSize.expanded),
    );
  });
}
