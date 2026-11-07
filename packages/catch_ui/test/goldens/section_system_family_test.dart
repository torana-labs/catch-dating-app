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

/// The three sections of the host Today board and an empty one.
class _Sections extends StatelessWidget {
  const _Sections({required this.sizeClass});

  final CatchWindowSize sizeClass;

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: _themeOf(context),
    size: sizeClass,
    child: Padding(
      padding: const EdgeInsets.all(CatchSpacing.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: CatchSpacing.s7,
        children: [
          CatchSection(
            title: 'Needs you',
            note: '3 before doors',
            children: [
              CatchIndexRow(
                title: '2 people want in',
                subtitle: 'Ishaan and Zoya asked to join tonight',
                marker: CatchIndexRowTone.warning,
                action: CatchIndexRowAction(label: 'Review', onPressed: () {}),
                density: CatchIndexRowSize.roomy,
                onTap: null,
              ),
              CatchIndexRow(
                title: 'A place opened up',
                subtitle: 'Offer it to Nikhil, first on the waitlist',
                marker: CatchIndexRowTone.info,
                action: CatchIndexRowAction(label: 'Offer', onPressed: () {}),
                density: CatchIndexRowSize.roomy,
                onTap: null,
              ),
            ],
          ),
          CatchSection(
            title: 'This week',
            action: CatchSectionAction(label: 'All events', onPressed: () {}),
            dividers: CatchSectionPlacement.all,
            children: [
              CatchIndexRow(
                title: 'Pickleball Ladder',
                meta: '7:00 AM · 9 of 16 booked',
                status: '7 left',
                progress: const CatchIndexRowProgress(
                  value: 9,
                  max: 16,
                  label: 'Booked',
                ),
                date: const CatchIndexRowDate(
                  day: 'Sat',
                  date: '7',
                  format: CatchFormat.courts,
                ),
                density: CatchIndexRowSize.regular,
                onTap: () {},
              ),
            ],
          ),
          CatchSection(
            title: 'Last 30 days',
            action: CatchSectionAction(label: 'Insights', onPressed: () {}),
            dividers: CatchSectionPlacement.none,
            children: const [
              CatchStack(
                direction: CatchStackDirection.row,
                equal: true,
                children: [
                  CatchMetricTile.stat(
                    label: 'Bookings',
                    value: '312',
                    note: 'Up 18%',
                    noteTone: CatchMetricTileTone.success,
                  ),
                  CatchMetricTile.stat(
                    label: 'Came back',
                    value: '41%',
                    note: 'of guests rebooked',
                  ),
                ],
              ),
            ],
          ),
          CatchSection(
            title: 'Needs you',
            empty: 'Nothing needs you before doors.',
            children: const [],
          ),
        ],
      ),
    ),
  );
}

void main() {
  testWidgets('note, action, no lines and empty on a phone', (tester) async {
    await matchCatchGolden(
      tester,
      'section_system_family_compact',
      size: const Size(390, 900),
      builder: (_) => const _Sections(sizeClass: CatchWindowSize.compact),
    );
  });

  testWidgets('the same at 1024, where the title grows to 30', (tester) async {
    await matchCatchGolden(
      tester,
      'section_system_family_expanded',
      size: const Size(1024, 860),
      builder: (_) => const _Sections(sizeClass: CatchWindowSize.expanded),
    );
  });
}
