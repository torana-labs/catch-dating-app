import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final direction in TextDirection.values) {
    testWidgets('record reading order and full text at 2x $direction', (
      tester,
    ) async {
      var opened = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: MediaQuery(
              data: const MediaQueryData(textScaler: TextScaler.linear(2)),
              child: Directionality(
                textDirection: direction,
                child: SingleChildScrollView(
                  child: SizedBox(
                    width: 320,
                    child: Column(
                      children: [
                        CatchField.navigate(
                          onActivate: () => opened++,
                          content: CatchRecordLayout(
                            title:
                                'A long record title which must remain completely readable',
                            metadata: 'Form response · 20 May 2026',
                            facts: const [
                              '18:00 · A location name that must remain fully readable',
                              '24 of 30 registered',
                            ],
                            description:
                                'A complete message or source explanation belongs here, including its last sentence.',
                            icon: CatchIcons.document,
                          ),
                        ),
                        CatchFieldSupportRow(
                          text:
                              'Stops your team from starting personal WhatsApp messages to this customer. Their permission stays unchanged.',
                          color: CatchTokens.editorialLight.ink2,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      for (final element in find.byType(RichText).evaluate()) {
        expect(
          (element.renderObject! as RenderParagraph).didExceedMaxLines,
          isFalse,
        );
      }
      expect(
        tester.getTopLeft(find.text('Form response · 20 May 2026')).dy,
        greaterThan(
          tester
              .getBottomLeft(
                find.text(
                  'A long record title which must remain completely readable',
                ),
              )
              .dy,
        ),
      );
      await tester.tap(
        find.text('A long record title which must remain completely readable'),
      );
      expect(opened, 1);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      expect(opened, 2);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('read-only records do not claim an action', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: Scaffold(
          body: CatchField.read(
            content: CatchRecordLayout(
              title: 'WhatsApp permission',
              description: 'No participant permission is recorded.',
              icon: CatchIcons.verified,
            ),
          ),
        ),
      ),
    );
    expect(find.byIcon(CatchIcons.disclosure), findsNothing);
    expect(
      find.byWidgetPredicate(
        (w) => w is Semantics && w.properties.button == true,
      ),
      findsNothing,
    );
  });
}
