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

Widget _frame(BuildContext context, List<Widget> children) => CatchRoot(
  theme: _themeOf(context),
  format: CatchFormat.nightsOut,
  child: TickerMode(
    enabled: false,
    child: Padding(
      padding: const EdgeInsets.all(CatchSpacing.s5),
      child: CatchStack(gap: CatchStackGap.g20, children: children),
    ),
  ),
);

void _noop() {}

/// Badges, a data table, notices, choice cards, the dock, the slider and
/// countdowns that the programme and formats boards draw.
class _Board extends StatelessWidget {
  const _Board();

  @override
  Widget build(BuildContext context) => _frame(context, [
    const Wrap(
      spacing: CatchSpacing.s2,
      children: [
        CatchBadge(label: 'Yes', tone: CatchBadgeTone.success),
        CatchBadge(label: 'Maybe', tone: CatchBadgeTone.warning),
        CatchBadge(
          label: '?',
          emphasis: CatchBadgeEmphasis.outline,
          semanticLabel: 'No reply yet',
        ),
        CatchBadge(label: '4 of 6', emphasis: CatchBadgeEmphasis.outline),
      ],
    ),
    const CatchTable(
      label: 'Guests by household',
      columns: [
        CatchTableColumn(
          label: 'Household',
          flex: 2,
          variant: CatchTableColumnVariant.title,
        ),
        CatchTableColumn(
          label: 'Guests',
          variant: CatchTableColumnVariant.number,
        ),
        CatchTableColumn(
          label: 'Reply',
          variant: CatchTableColumnVariant.badge,
        ),
      ],
      children: [
        CatchTableRow.cells(
          cells: [
            CatchTableCell.title('The Mehras', subtitle: 'Bride side'),
            CatchTableCell.number(6),
            CatchTableCell.badge(
              CatchBadge(label: 'Yes', tone: CatchBadgeTone.success),
            ),
          ],
        ),
        CatchTableRow.cells(
          cells: [
            CatchTableCell.title('Farhan Qureshi', subtitle: 'Friends'),
            CatchTableCell.number(2),
            CatchTableCell.badge(
              CatchBadge(label: '?', emphasis: CatchBadgeEmphasis.outline),
            ),
          ],
        ),
      ],
    ),
    CatchNotice.inline(
      title: 'Kabir landed early',
      body: 'Flight AI 865 is on the ground. No car is there yet.',
      tone: CatchNoticeTone.warning,
      footer: const Wrap(
        spacing: CatchSpacing.s2,
        children: [
          CatchButton(
            label: 'Call them',
            onPressed: _noop,
            variant: CatchButtonVariant.secondary,
            size: CatchButtonSize.sm,
          ),
          CatchButton(
            label: 'Tell the planner',
            onPressed: _noop,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.sm,
          ),
        ],
      ),
    ),
    const Row(
      spacing: CatchSpacing.s2,
      children: [
        Expanded(
          child: CatchChoiceTile(
            title: '214',
            subtitle: 'Neha and Rohan',
            meta: 'King',
            variant: CatchChoiceTileVariant.tile,
            onTap: _noop,
          ),
        ),
        Expanded(
          child: CatchChoiceTile(
            title: '216',
            subtitle: 'Mehra · Dadi',
            meta: 'Twin',
            variant: CatchChoiceTileVariant.tile,
            emphasis: CatchChoiceTileEmphasis.attention,
            onTap: _noop,
          ),
        ),
        Expanded(
          child: CatchChoiceTile(
            title: '222',
            subtitle: 'Free',
            meta: 'King',
            variant: CatchChoiceTileVariant.tile,
            emphasis: CatchChoiceTileEmphasis.vacant,
            onTap: _noop,
          ),
        ),
      ],
    ),
    CatchSliderInput(
      value: 4,
      min: 3,
      max: 5,
      divisions: 2,
      label: 'Rounds',
      valueLabelBuilder: (value) => '${value.round()} rounds',
      onChanged: (_) {},
    ),
    const Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        CatchCountdownIndicator(seconds: 10, label: 'Tables in'),
        CatchCountdownIndicator(
          seconds: 10,
          label: 'Tables in',
          variant: CatchCountdownIndicatorVariant.ring,
        ),
      ],
    ),
    const CatchDock(
      placement: CatchDockPlacement.bar,
      header: CatchBadge(
        label: 'Offline · 3 check-ins to send',
        tone: CatchBadgeTone.warning,
        dot: true,
      ),
      primary: CatchDockAction(
        label: 'Reveal the tables',
        onPressed: _noop,
        emphasis: CatchDockActionEmphasis.accent,
      ),
    ),
  ]);
}

/// The static map, a group chat with authors and a footer, and the composer.
class _MapAndChat extends StatelessWidget {
  const _MapAndChat();

  @override
  Widget build(BuildContext context) => _frame(context, [
    const CatchMap(
      label: 'Map of the crawl, three stops',
      route: [
        CatchMapPoint(x: 14, y: 72),
        CatchMapPoint(x: 40, y: 38),
        CatchMapPoint(x: 72, y: 56),
      ],
      pins: [
        CatchMapPin(x: 14, y: 72, format: CatchFormat.nightsOut),
        CatchMapPin(
          x: 40,
          y: 38,
          label: 'Bar Paradiso',
          format: CatchFormat.nightsOut,
          status: CatchMapPinStatus.selected,
        ),
        CatchMapPin(x: 72, y: 56, format: CatchFormat.nightsOut),
      ],
    ),
    const Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchChatBubble(
          text: 'Moving to stop two in five minutes.',
          variant: CatchChatBubbleVariant.host,
          format: CatchFormat.nightsOut,
          author: CatchChatAuthor(name: 'Asha', note: 'host'),
          time: '9:40 PM',
        ),
        CatchChatBubble(
          text: 'Saving us a table?',
          author: CatchChatAuthor(
            name: 'Kabir',
            color: CatchAvatarColor.indigo,
          ),
          time: '9:41 PM',
        ),
      ],
    ),
    CatchChatBubble(
      text: 'Here is where we are',
      continued: true,
      author: const CatchChatAuthor(name: 'Kabir'),
      footer: CatchBadge(label: 'Location shared', icon: CatchIcons.location),
    ),
    const CatchComposerInput(placeholder: 'Message', sendLabel: 'Send'),
  ]);
}

void main() {
  testWidgets('wave 3 badges, tables, notices, cards, slider and dock', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'wave3_board_family',
      size: const Size(390, 900),
      builder: (_) => const _Board(),
    );
  });

  testWidgets('map, chat authors and the composer', (tester) async {
    await matchCatchGolden(
      tester,
      'map_chat_family',
      size: const Size(390, 580),
      builder: (_) => const _MapAndChat(),
    );
  });
}
