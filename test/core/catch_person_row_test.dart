import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Widget screen(CatchField field) => MaterialApp(
    theme: AppTheme.light,
    home: CatchScaffold.standalone(body: CatchSection.rows(children: [field])),
  );

  testWidgets(
    'conversation layout retains identity, preview, time and accessible activity',
    (tester) async {
      final semantics = tester.ensureSemantics();

      var taps = 0;
      await tester.pumpWidget(
        screen(
          CatchField.navigate(
            onActivate: () => taps++,
            content: const CatchConversationLayout(
              name: 'Taylor',
              preview: 'You matched!',
              timestamp: '2m',
              activityLabel: 'New match',
              activitySemantics: 'New match',
            ),
          ),
        ),
      );
      expect(find.text('Taylor'), findsOneWidget);
      expect(find.text('You matched!'), findsOneWidget);
      expect(find.text('2m'), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('New match')), findsOneWidget);
      await tester.tap(find.text('Taylor'));
      expect(taps, 1);
      semantics.dispose();
    },
  );

  testWidgets('exact and partial unread counts are caller facts', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();

    for (final count in ['1', '118', '2+']) {
      await tester.pumpWidget(
        screen(
          CatchField.read(
            content: CatchConversationLayout(
              name: 'Taylor',
              preview: 'See you at the event',
              activityLabel: count,
              activitySemantics: '$count unread messages',
            ),
          ),
        ),
      );
      expect(find.text(count), findsOneWidget);
      expect(find.bySemanticsLabel('$count unread messages'), findsOneWidget);
      expect(find.byType(CatchCountBadge), findsNothing);
    }
    semantics.dispose();
  });

  testWidgets('person facts do not imply conversation anatomy or an action', (
    tester,
  ) async {
    await tester.pumpWidget(
      screen(
        const CatchField.read(
          content: CatchPersonLayout(
            name: 'Taylor',
            supportingText: '5:20 /km',
            context: 'Sundowner 5K',
          ),
        ),
      ),
    );
    expect(find.text('Taylor'), findsOneWidget);
    expect(find.text('5:20 /km'), findsOneWidget);
    expect(find.text('Sundowner 5K'), findsOneWidget);
    expect(find.byIcon(CatchIcons.disclosure), findsNothing);
    expect(
      find.byWidgetPredicate(
        (w) => w is Semantics && w.properties.button == true,
      ),
      findsNothing,
    );
  });
}
