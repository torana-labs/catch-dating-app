import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// The states the Create, Door, Live console and Insights boards add to
// existing contracts. This file sorts after each contract page it extends,
// so the collected states keep the registry order.

Widget _state(
  BuildContext context, {
  required String label,
  required String description,
  required Widget child,
  bool night = false,
  CatchWindowSize? size,
  double width = WidgetbookPreviewLayout.standardContractWidth,
}) => WidgetbookContractStateCard(
  label: label,
  description: description,
  child: SizedBox(
    width: width,
    child: CatchRoot(
      theme: night ? CatchThemeMode.night : widgetbookThemeOf(context),
      size: size,
      format: CatchFormat.games,
      child: child,
    ),
  ),
);

const _plan = [
  ('8:40', 'Mix the teams', 'Done'),
  ('9:00', 'Round two', 'Now'),
  ('9:40', 'Scores and goodbyes', 'Next'),
];

Widget _planRow((String, String, String) step) {
  final (time, title, status) = step;
  return CatchIndexRow(
    title: title,
    time: time,
    status: status,
    onTap: null,
    density: CatchIndexRowSize.compact,
    emphasis: status == 'Done'
        ? CatchIndexRowEmphasis.done
        : CatchIndexRowEmphasis.regular,
    leading: switch (status) {
      'Done' => const CatchMarker(
        tone: CatchMarkerTone.muted,
        size: CatchMarkerSize.lg,
      ),
      'Now' => const CatchMarker(
        tone: CatchMarkerTone.format,
        size: CatchMarkerSize.lg,
        live: true,
      ),
      _ => const CatchMarker(
        variant: CatchMarkerVariant.ring,
        size: CatchMarkerSize.lg,
      ),
    },
  );
}

List<Widget> _scores() => [
  for (final (rank, name, score) in const [
    (1, 'Quizzy Rascals', '41'),
    (2, 'Harbour Lights', '38'),
    (3, 'Vada Pav Theory', '35'),
    (4, 'The Late Ones', '29'),
  ])
    CatchIndexRow(
      title: name,
      rank: rank,
      value: score,
      onTap: null,
      density: CatchIndexRowSize.compact,
    ),
];

@widgetbook.UseCase(
  name: 'Board states',
  type: CatchIndexRow,
  path: '[Core primitives]/Rows',
)
Widget catchIndexRowBoardStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchIndexRow',
    contractId: 'catch.index_row',
    states: const [
      'time',
      'icon',
      'rank',
      'badge',
      'body',
      'value',
      'chevron',
      'done',
      'selected-system',
      'timeline',
      'columns',
    ],
    children: [
      _state(
        context,
        label: 'time',
        description: 'A plan step: the time, then the live marker.',
        child: _planRow(_plan[1]),
      ),
      _state(
        context,
        label: 'icon',
        description: 'A tinted icon tile with a row action.',
        child: CatchIndexRow(
          title: 'A QR for the door',
          subtitle: 'Walk-ins scan it to book on the spot',
          icon: CatchIcons.qrCode,
          onTap: null,
          density: CatchIndexRowSize.regular,
          action: const CatchIndexRowAction(
            label: 'Print',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      _state(
        context,
        label: 'rank',
        description: 'A team on the scoreboard with its score.',
        child: _scores().first,
      ),
      _state(
        context,
        label: 'badge',
        description: 'A first-timer at the door, checked in with primary.',
        child: const CatchIndexRow(
          title: 'Dev Patel',
          subtitle: '2 places · first time',
          onTap: null,
          density: CatchIndexRowSize.compact,
          leading: CatchAvatar(
            size: GeneratedCatchSizeTokens.avatarLg,
            name: 'Dev Patel',
          ),
          badge: CatchIndexRowBadge(label: 'New', format: CatchFormat.games),
          action: CatchIndexRowAction(
            label: 'Check in',
            onPressed: widgetbookNoop,
            variant: CatchIndexRowActionVariant.primary,
          ),
        ),
      ),
      _state(
        context,
        label: 'body',
        description: 'A review: wrapping copy and a success meta line.',
        child: const CatchIndexRow(
          title: 'Rhea K.',
          status: 'Rated 5',
          body:
              'Came alone, left with a team for next week. The food round '
              'was brilliant.',
          meta: 'Booked on Catch',
          metaTone: CatchIndexRowTone.success,
          onTap: null,
          density: CatchIndexRowSize.roomy,
        ),
      ),
      _state(
        context,
        label: 'value',
        description: 'A download with its file type.',
        child: CatchIndexRow(
          title: 'Guest list and check-ins',
          icon: CatchIcons.download,
          value: 'CSV',
          onTap: widgetbookNoop,
          density: CatchIndexRowSize.regular,
        ),
      ),
      _state(
        context,
        label: 'chevron',
        description: 'A row that opens something.',
        child: const CatchIndexRow(
          title: 'Your page had 3,412 visits',
          subtitle: '1,086 link clicks · 318 went on to book',
          chevron: true,
          onTap: widgetbookNoop,
          density: CatchIndexRowSize.regular,
        ),
      ),
      _state(
        context,
        label: 'done',
        description: 'A step already run, in the secondary ink.',
        child: _planRow(_plan[0]),
      ),
      _state(
        context,
        label: 'selected-system',
        description: 'The editor step rail: the tile bleeds past the row.',
        child: CatchListSection(
          dividers: CatchSectionPlacement.none,
          children: const [
            CatchIndexRow(
              title: 'The basics',
              subtitle: 'Name, format, photos',
              selected: true,
              onTap: widgetbookNoop,
              density: CatchIndexRowSize.compact,
              leading: CatchMarker.number(1),
            ),
            CatchIndexRow(
              title: 'When and where',
              onTap: widgetbookNoop,
              density: CatchIndexRowSize.compact,
              leading: CatchMarker.number(2, tone: CatchMarkerTone.muted),
            ),
          ],
        ),
      ),
      _state(
        context,
        label: 'timeline',
        description: 'Plan rows joined by the section timeline.',
        child: CatchListSection(
          timeline: true,
          dividers: CatchSectionPlacement.none,
          children: [for (final step in _plan) _planRow(step)],
        ),
      ),
      _state(
        context,
        label: 'columns',
        description: 'The scoreboard in two columns on a wide window.',
        size: CatchWindowSize.expanded,
        width: WidgetbookPreviewLayout.wideContractWidth * 2,
        child: CatchListSection(columns: 2, children: _scores()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Board states',
  type: CatchListSection,
  path: '[Core primitives]/Rows',
)
Widget catchSectionBoardStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSection',
    contractId: 'catch.section',
    states: const ['system-timeline', 'system-columns'],
    children: [
      _state(
        context,
        label: 'system-timeline',
        description: "Tonight's plan as a timeline.",
        child: CatchListSection(
          title: "Tonight's plan",
          timeline: true,
          dividers: CatchSectionPlacement.none,
          children: [for (final step in _plan) _planRow(step)],
        ),
      ),
      _state(
        context,
        label: 'system-columns',
        description: 'Folds back to one column on a phone.',
        size: CatchWindowSize.compact,
        child: CatchListSection(
          title: 'Scores after round one',
          columns: 2,
          children: _scores(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Board states',
  type: CatchChip,
  path: '[Core primitives]/Choices',
)
Widget catchChipBoardStates(BuildContext context) {
  Widget chip(String label, CatchFormat? dot, {bool selected = false}) =>
      CatchChip.choice(
        label: label,
        selected: selected,
        mode: CatchChipMode.single,
        onPressed: widgetbookNoop,
        dot: dot,
        colourWhenSelected: true,
      );
  return WidgetbookContractFrame(
    title: 'CatchChip',
    contractId: 'catch.chip',
    states: const ['choice-dot', 'choice-colour', 'choice-sm'],
    children: [
      _state(
        context,
        label: 'choice-dot',
        description: 'A format colour before the label.',
        child: Wrap(
          spacing: CatchSpacing.s2,
          children: [
            chip('Social run', CatchFormat.run),
            chip('Supper', CatchFormat.dinner),
          ],
        ),
      ),
      _state(
        context,
        label: 'choice-colour',
        description: 'Selected, it fills with the format colour.',
        child: chip('Quiz or trivia', CatchFormat.games, selected: true),
      ),
      _state(
        context,
        label: 'choice-sm',
        description: 'The 32 px chip: start the plan from a template.',
        child: const Wrap(
          spacing: CatchSpacing.s2,
          children: [
            CatchChip.choice(
              label: 'Trivia night',
              selected: true,
              mode: CatchChipMode.single,
              onPressed: widgetbookNoop,
              size: CatchChipSize.sm,
            ),
            CatchChip.choice(
              label: 'Blank',
              selected: false,
              mode: CatchChipMode.single,
              onPressed: widgetbookNoop,
              size: CatchChipSize.sm,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Board states',
  type: CatchChoiceTile,
  path: '[Core primitives]/Choices',
)
Widget catchChoiceTileBoardStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchChoiceTile',
    contractId: 'catch.option_card',
    states: const ['row', 'tile', 'day', 'add', 'format'],
    children: [
      _state(
        context,
        label: 'row',
        description: 'Who can come: the radio at the end.',
        child: const CatchChoiceTile(
          title: 'Anyone can book',
          subtitle: 'Paid places are confirmed straight away',
          selected: true,
          onTap: widgetbookNoop,
          variant: CatchChoiceTileVariant.row,
        ),
      ),
      _state(
        context,
        label: 'tile',
        description: 'A card in a grid with its corner meta and tick.',
        child: const SizedBox(
          width: GeneratedCatchSpacingTokens.s28,
          child: CatchChoiceTile(
            title: 'Table 4',
            subtitle: 'Rascals',
            meta: '4 of 4',
            selected: true,
            onTap: widgetbookNoop,
            variant: CatchChoiceTileVariant.tile,
          ),
        ),
      ),
      _state(
        context,
        label: 'day',
        description: 'The date strip: the chosen day in ink.',
        child: CatchRail(
          label: 'Dates',
          itemWidth: CatchSpacing.s12,
          wrap: CatchRailMode.never,
          children: [
            for (final (day, date) in const [
              ('Mon', '26'),
              ('Tue', '27'),
              ('Wed', '28'),
              ('Thu', '29'),
            ])
              CatchChoiceTile(
                title: day,
                subtitle: date,
                selected: date == '27',
                onTap: widgetbookNoop,
                variant: CatchChoiceTileVariant.day,
              ),
          ],
        ),
      ),
      _state(
        context,
        label: 'add',
        description: 'Dashed, to add a photo or a step.',
        child: const CatchChoiceTile(
          title: 'Add a step',
          onTap: widgetbookNoop,
          variant: CatchChoiceTileVariant.add,
        ),
      ),
      _state(
        context,
        label: 'format',
        description: 'Selected with a format, it fills with that colour.',
        child: const SizedBox(
          width: GeneratedCatchSpacingTokens.s28,
          child: CatchChoiceTile(
            title: 'Supper',
            selected: true,
            format: CatchFormat.dinner,
            onTap: widgetbookNoop,
            variant: CatchChoiceTileVariant.tile,
          ),
        ),
      ),
    ],
  );
}
