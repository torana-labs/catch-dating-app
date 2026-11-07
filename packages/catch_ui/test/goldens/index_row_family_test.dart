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

void main() {
  testWidgets('the hairline row and the system rows by density', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'index_row_family',
      size: const Size(390, 640),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        size: CatchWindowSize.compact,
        child: Padding(
          padding: const EdgeInsets.all(CatchSpacing.s5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: CatchSpacing.s3,
            children: [
              CatchIndexRow(title: 'Dinner', onTap: () {}),
              CatchIndexRow(
                title: '2 people want in',
                subtitle: 'Ishaan and Zoya asked to join tonight',
                marker: CatchIndexRowTone.warning,
                action: CatchIndexRowAction(label: 'Review', onPressed: () {}),
                density: CatchIndexRowSize.roomy,
                onTap: null,
              ),
              CatchIndexRow(
                title: 'Send the arrival message',
                subtitle: 'Goes to 26 guests on WhatsApp at 7:00',
                marker: CatchIndexRowTone.success,
                density: CatchIndexRowSize.compact,
                onTap: null,
              ),
              CatchIndexRow(
                title: 'Carter Road Social Run',
                meta: '6:30 AM · 32 of 40 booked',
                status: '8 left',
                progress: const CatchIndexRowProgress(
                  value: 32,
                  max: 40,
                  label: 'Booked',
                ),
                date: const CatchIndexRowDate(
                  day: 'Sun',
                  date: '1',
                  format: CatchFormat.run,
                ),
                density: CatchIndexRowSize.regular,
                onTap: () {},
              ),
              CatchIndexRow(
                title: 'Long Table Supper',
                meta: '8:00 PM · 14 of 14 booked',
                status: 'Full',
                statusTone: CatchIndexRowTone.success,
                progress: const CatchIndexRowProgress(
                  value: 14,
                  max: 14,
                  label: 'Booked',
                ),
                date: const CatchIndexRowDate(day: 'Wed', date: '4'),
                density: CatchIndexRowSize.regular,
                onTap: () {},
              ),
            ],
          ),
        ),
      ),
    );
  });
}
