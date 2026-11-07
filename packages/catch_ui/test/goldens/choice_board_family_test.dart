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

const _formats = [
  ('Quiz or trivia', CatchFormat.games),
  ('Social run', CatchFormat.run),
  ('Supper', CatchFormat.dinner),
  ('Racket sports', CatchFormat.courts),
  ('Party', CatchFormat.nightsOut),
  ('Something else', null),
];

const _days = [
  ('Mon', '26'),
  ('Tue', '27'),
  ('Wed', '28'),
  ('Thu', '29'),
  ('Fri', '30'),
  ('Sat', '31'),
  ('Sun', '1'),
];

/// The Create board's choices: format chips, admission cards, the day strip,
/// add cards and the segmented controls of the Door, Tickets and Insights.
class _Choices extends StatelessWidget {
  const _Choices({this.selectedFormat = CatchFormat.games});

  final CatchFormat? selectedFormat;

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: _themeOf(context),
    child: Padding(
      padding: const EdgeInsets.all(CatchSpacing.s5),
      child: CatchStack(
        gap: CatchStackGap.g20,
        children: [
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              for (final (label, format) in _formats)
                CatchChip.choice(
                  label: label,
                  selected: format == selectedFormat,
                  mode: CatchChipMode.single,
                  onPressed: _noop,
                  dot: format,
                  colourWhenSelected: true,
                ),
            ],
          ),
          const CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            children: [
              CatchChip.choice(
                label: 'Trivia night',
                selected: true,
                mode: CatchChipMode.single,
                onPressed: _noop,
                size: CatchChipSize.sm,
              ),
              CatchChip.choice(
                label: 'Blank',
                selected: false,
                mode: CatchChipMode.single,
                onPressed: _noop,
                size: CatchChipSize.sm,
              ),
            ],
          ),
          CatchRail(
            label: 'Dates',
            itemWidth: CatchSpacing.s12,
            wrap: CatchRailMode.never,
            children: [
              for (final (day, date) in _days)
                CatchChoiceTile(
                  title: day,
                  subtitle: date,
                  selected: date == '27',
                  onTap: _noop,
                  variant: CatchChoiceTileVariant.day,
                ),
            ],
          ),
          const CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchChoiceTile(
                title: 'Anyone can book',
                subtitle: 'Paid places are confirmed straight away',
                selected: true,
                onTap: _noop,
                variant: CatchChoiceTileVariant.row,
              ),
              CatchChoiceTile(
                title: 'You approve each request',
                subtitle: 'They pay once you let them in',
                onTap: _noop,
                variant: CatchChoiceTileVariant.row,
              ),
            ],
          ),
          const CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            equal: true,
            children: [
              CatchChoiceTile(
                title: 'Add a photo',
                onTap: _noop,
                variant: CatchChoiceTileVariant.add,
              ),
              CatchChoiceTile(
                title: 'Table 4',
                subtitle: 'Rascals',
                meta: '4 of 4',
                selected: true,
                onTap: _noop,
                variant: CatchChoiceTileVariant.tile,
              ),
              CatchChoiceTile(
                title: 'Supper',
                selected: true,
                format: CatchFormat.dinner,
                onTap: _noop,
                variant: CatchChoiceTileVariant.tile,
              ),
            ],
          ),
          CatchPageTabBar<String>.segmented(
            selected: 'arriving',
            onChanged: (_) {},
            label: 'Show guests',
            options: const [
              CatchOption(value: 'arriving', label: 'Arriving', count: 4),
              CatchOption(value: 'in', label: 'In', count: 18),
              CatchOption(value: 'waitlist', label: 'Waitlist', count: 1),
              CatchOption(value: 'asked', label: 'Asked', count: 2),
            ],
          ),
          CatchPageTabBar<String>.segmented(
            selected: '30',
            onChanged: (_) {},
            size: CatchPageTabBarSize.sm,
            label: 'Period',
            options: const [
              CatchOption(value: '7', label: '7 days'),
              CatchOption(value: '30', label: '30 days'),
              CatchOption(value: '90', label: '90 days'),
            ],
          ),
          CatchPageTabBar<String>.segmented(
            selected: 'guests',
            onChanged: (_) {},
            fill: false,
            label: 'Programme views',
            options: const [
              CatchOption(value: 'schedule', label: 'Schedule'),
              CatchOption(value: 'guests', label: 'Guests'),
              CatchOption(value: 'rooms', label: 'Rooms'),
            ],
          ),
        ],
      ),
    ),
  );
}

void main() {
  testWidgets('format chips, choice cards, the day strip and segments', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'choice_board_family',
      size: const Size(390, 900),
      builder: (_) => const _Choices(),
    );
  });

  testWidgets('a selected format chip in ink when it has no colour', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'choice_board_family_other',
      size: const Size(390, 900),
      builder: (_) => const _Choices(selectedFormat: null),
    );
  });
}
