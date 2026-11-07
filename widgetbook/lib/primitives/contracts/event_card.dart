import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

const _counts = [
  CatchMetricValue(value: '26', label: 'Booked'),
  CatchMetricValue(value: '4', label: 'Waitlist'),
  CatchMetricValue(value: '9', label: 'New faces'),
];

const _people = [
  CatchPersonAvatarItem(name: 'Aanya Mehta'),
  CatchPersonAvatarItem(name: 'Kabir Rao'),
  CatchPersonAvatarItem(name: 'Ishaan Sen'),
];

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchEventCard,
  path: '[Core primitives]/Product composites',
)
Widget catchEventCardContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchEventCard',
    contractId: 'catch.event_card',
    states: const [
      'poster',
      'poster-no-people',
      'poster-no-counts',
      'poster-night',
    ],
    children: [
      for (final (label, description, night, card) in [
        (
          'poster',
          'Tonight on Today: the when badge, the format, counts and faces.',
          false,
          CatchEventCard(
            format: CatchFormat.games,
            formatLabel: 'Trivia',
            when: 'Tonight · doors at 7:30',
            title: 'Tuesday Trivia Night',
            place: 'Harbour Room, Bandra West',
            counts: _counts,
            people: _people,
            peopleTotal: 26,
            onTap: widgetbookNoop,
          ),
        ),
        (
          'poster-no-people',
          'Nobody has booked yet: the counts alone.',
          false,
          const CatchEventCard(
            format: CatchFormat.run,
            formatLabel: 'Social run',
            when: 'Sun 1 Nov · 6:30 AM',
            title: 'Carter Road Social Run',
            place: 'Carter Road promenade',
            counts: [
              CatchMetricValue(value: '0', label: 'Booked'),
              CatchMetricValue(value: '40', label: 'Places'),
            ],
          ),
        ),
        (
          'poster-no-counts',
          'A poster with only its title, place and badge.',
          false,
          const CatchEventCard(
            format: CatchFormat.dinner,
            formatLabel: 'Supper club',
            when: 'Wed 4 Nov · 8:00 PM',
            title: 'Long Table Supper',
            place: 'The Pantry, Kala Ghoda',
          ),
        ),
        (
          'poster-night',
          'On a night screen the format colour stays and the page turns dark.',
          true,
          CatchEventCard(
            format: CatchFormat.courts,
            formatLabel: 'Pickleball',
            when: 'Sat 7 Nov · 7:00 AM',
            title: 'Pickleball Ladder',
            place: 'Khar Gymkhana courts',
            counts: const [
              CatchMetricValue(value: '9', label: 'Booked'),
              CatchMetricValue(value: '7', label: 'Left'),
            ],
            people: _people,
            peopleTotal: 9,
            onTap: widgetbookNoop,
          ),
        ),
      ])
        WidgetbookContractStateCard(
          label: label,
          description: description,
          child: SizedBox(
            width: WidgetbookPreviewLayout.standardContractWidth,
            child: CatchRoot(
              theme: night ? CatchThemeMode.night : widgetbookThemeOf(context),
              child: card,
            ),
          ),
        ),
    ],
  );
}
