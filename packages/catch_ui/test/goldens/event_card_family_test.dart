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

const _people = [
  CatchPersonAvatarItem(name: 'Aanya Mehta'),
  CatchPersonAvatarItem(name: 'Kabir Rao'),
  CatchPersonAvatarItem(name: 'Ishaan Sen'),
];

void main() {
  testWidgets('the poster with counts and faces, without faces, bare', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'event_card_family',
      size: const Size(390, 900),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        size: CatchWindowSize.compact,
        child: const Padding(
          padding: EdgeInsets.all(CatchSpacing.s5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: CatchSpacing.s5,
            children: [
              CatchEventCard(
                format: CatchFormat.games,
                formatLabel: 'Trivia',
                when: 'Tonight · doors at 7:30',
                title: 'Tuesday Trivia Night',
                place: 'Harbour Room, Bandra West',
                counts: [
                  CatchMetricValue(value: '26', label: 'Booked'),
                  CatchMetricValue(value: '4', label: 'Waitlist'),
                  CatchMetricValue(value: '9', label: 'New faces'),
                ],
                people: _people,
                peopleTotal: 26,
              ),
              CatchEventCard(
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
              CatchEventCard(
                format: CatchFormat.dinner,
                formatLabel: 'Supper club',
                when: 'Wed 4 Nov · 8:00 PM',
                title: 'Long Table Supper',
                place: 'The Pantry, Kala Ghoda',
              ),
            ],
          ),
        ),
      ),
    );
  });
}
