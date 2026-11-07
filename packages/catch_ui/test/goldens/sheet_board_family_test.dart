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

void _noop() {}

/// Create step 2's date sheet: the calendar with marked days, weekly rings
/// and its legend, in a contained sheet over a dimmed screen.
class _CalendarSheet extends StatelessWidget {
  const _CalendarSheet();

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: _themeOf(context),
    child: CatchSheet.contained(
      title: 'Pick a date',
      footer: const CatchButton(
        label: 'Use Tue 3 Nov',
        onPressed: _noop,
        fullWidth: true,
      ),
      child: CatchCalendar(
        label: 'Pick a date',
        month: DateTime(2026, 11),
        value: DateTime(2026, 11, 3),
        min: DateTime(2026, 10, 27),
        onChanged: (_) {},
        marked: [DateTime(2026, 11, 1), DateTime(2026, 11, 4)],
        repeats: [
          DateTime(2026, 11, 10),
          DateTime(2026, 11, 17),
          DateTime(2026, 11, 24),
        ],
        markedLabel: 'You already have something on',
        repeatsLabel: 'Rings show the next weekly dates',
      ),
    ),
  );
}

/// The door's scan result: a floating success sheet with inline stats, and
/// the inline notices from Tickets and the door tablet behind it.
class _ScanResult extends StatelessWidget {
  const _ScanResult();

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: CatchThemeMode.night,
    child: Stack(
      children: [
        Padding(
          padding: const EdgeInsets.all(CatchSpacing.s5),
          child: CatchStack(
            children: [
              const CatchBadge(label: '19 of 26 in', size: CatchBadgeSize.md),
              CatchNotice.inline(
                body:
                    'Guests pay into your own Razorpay account. After 30 '
                    'days free, Catch bills you 5% of ticket sales.',
              ),
              CatchNotice.inline(
                title: 'Kabir Rao is in',
                body: 'Last scan · 7:41 PM · 1 place · paid',
                tone: CatchNoticeTone.success,
              ),
            ],
          ),
        ),
        const CatchSheet.contained(
          kicker: 'Checked in',
          title: 'Dev Patel',
          tone: CatchSheetTone.success,
          scrim: false,
          footer: CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g16,
            children: [
              Expanded(
                child: CatchButton(
                  label: 'Next ticket',
                  onPressed: _noop,
                  fullWidth: true,
                ),
              ),
              CatchButton(
                label: 'Undo',
                onPressed: _noop,
                variant: CatchButtonVariant.quiet,
              ),
            ],
          ),
          child: CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              CatchMetricTile.stat(
                label: 'places',
                value: '2',
                mode: CatchMetricTileMode.plain,
              ),
              CatchMetricTile.stat(
                label: 'paid on Catch',
                value: '₹998',
                mode: CatchMetricTileMode.plain,
              ),
              CatchMetricTile.stat(
                label: 'first night',
                value: 'New',
                mode: CatchMetricTileMode.plain,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

void main() {
  testWidgets('the date sheet on a phone', (tester) async {
    await matchCatchGolden(
      tester,
      'sheet_calendar_board',
      size: const Size(390, 844),
      builder: (_) => const _CalendarSheet(),
    );
  });

  testWidgets('the scan result over the door, always night', (tester) async {
    await matchCatchGolden(
      tester,
      'sheet_scan_result_board',
      size: const Size(390, 640),
      builder: (_) => const _ScanResult(),
    );
  });
}
