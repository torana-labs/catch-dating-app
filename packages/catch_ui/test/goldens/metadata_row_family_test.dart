import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('metadata row recipes at scale $scale', (tester) async {
      await matchCatchGolden(
        tester,
        'metadata_row_family@$scale',
        textScale: scale,
        size: const Size(400, 1100),
        builder: (context) {
          final t = CatchTokens.of(context);
          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 24,
              children: [
                const CatchMetaRow(icon: Icons.place, label: 'Bandra West'),
                CatchMetaRow(
                  icon: Icons.event,
                  label: 'Friday evening',
                  color: t.ink2,
                  labelColor: t.primary,
                ),
                const Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: CatchMetaRow.entry(
                    entry: CatchMetaEntry(label: 'Tonight'),
                  ),
                ),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: CatchMetaRow.entry(
                    entry: CatchMetaEntry(
                      label: 'Bandra West',
                      icon: Icons.place,
                      iconColor: t.primary,
                      color: t.ink,
                    ),
                    isStrong: true,
                  ),
                ),
                const CatchMetaRow.flow(
                  entries: [
                    CatchMetaEntry(label: 'Friday evening', icon: Icons.event),
                    CatchMetaEntry(label: 'Bandra West'),
                    CatchMetaEntry(label: 'Easy pace'),
                  ],
                ),
                const CatchMetaRow.flow(
                  maxLines: 2,
                  entries: [
                    CatchMetaEntry(label: 'Friday evening', icon: Icons.event),
                    CatchMetaEntry(label: 'A longer location label'),
                  ],
                ),
                const CatchMetaRow.group(
                  entries: [
                    CatchMetaEntry(label: 'Tonight', icon: Icons.event),
                    CatchMetaEntry(label: 'Bandra West'),
                  ],
                  trailing: CatchMetaEntry(label: '2.4 km'),
                ),
                const Directionality(
                  textDirection: TextDirection.rtl,
                  child: CatchMetaRow.group(
                    entries: [
                      CatchMetaEntry(label: 'Tonight', icon: Icons.event),
                      CatchMetaEntry(label: 'Bandra West'),
                    ],
                    trailing: CatchMetaEntry(label: '2.4 km'),
                  ),
                ),
              ],
            ),
          );
        },
      );
    }, tags: const ['golden']);
  }
}
