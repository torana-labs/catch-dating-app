import 'package:catch_dating_app/hosts/presentation/widgets/participant_table.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('roster table uses person rows on compact widths', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 900);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _wrap(
        const ParticipantTable(
          columns: ['Guest', 'Status', 'Action'],
          rows: [
            ParticipantRow(
              person: 'Taylor',
              meta: 'Booked',
              signal: 'Arrived',
              action: ParticipantTextAction('Paid'),
            ),
          ],
        ),
      ),
    );

    expect(find.byType(CatchField), findsOneWidget);
    expect(find.text('GUEST'), findsNothing);
    expect(find.text('Taylor'), findsOneWidget);
    expect(find.text('Arrived'), findsOneWidget);
  });

  testWidgets('roster table preserves its tabular layout on wide widths', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(900, 900);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _wrap(
        const ParticipantTable(
          columns: ['Guest', 'Status', 'Action'],
          rows: [
            ParticipantRow(
              person: 'Taylor',
              signal: 'Arrived',
              action: ParticipantTextAction('Paid'),
            ),
          ],
        ),
      ),
    );

    expect(find.byType(CatchField), findsNothing);
    expect(find.text('GUEST'), findsOneWidget);
    expect(find.text('STATUS'), findsOneWidget);
    expect(find.text('ACTION'), findsOneWidget);
  });
}

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(body: SafeArea(child: child)),
  );
}
