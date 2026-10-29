import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final count in [1, 12, 118]) {
    testWidgets('shared row uses caller copy and capped count $count', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: Scaffold(
            body: CatchField.read(
              content: CatchConversationLayout(
                name: 'Camille',
                preview: 'Écrit…',
                activityLabel: catchCountLabel(count),
                activitySemantics: '${catchCountLabel(count)} non lus',
              ),
            ),
          ),
        ),
      );
      expect(find.text('Écrit…'), findsOneWidget);
      expect(find.text('Draft'), findsNothing);
      expect(find.text(catchCountLabel(count)), findsOneWidget);
      expect(
        find.bySemanticsLabel('${catchCountLabel(count)} non lus'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('new indicator accepts caller-owned accessible meaning', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: const Scaffold(
          body: CatchStatusIndicator(
            size: CatchSpacing.s2,
            semanticsLabel: 'Nouvelle rencontre',
          ),
        ),
      ),
    );
    expect(find.bySemanticsLabel('Nouvelle rencontre'), findsOneWidget);
    expect(find.byType(CatchStatusIndicator), findsOneWidget);
  });

  testWidgets('app copy follows inherited locale and retains count semantics', (
    tester,
  ) async {
    Future<void> pump(Locale locale) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          locale: locale,
          supportedLocales: const [Locale('en'), Locale('fr')],
          localizationsDelegates: [
            const _PersonRowCopyDelegate(),
            ...AppLocalizations.localizationsDelegates.skip(1),
          ],
          home: Scaffold(
            body: Builder(
              builder: (context) => Column(
                children: [
                  CatchField.read(
                    content: CatchConversationLayout(
                      name: 'Camille',
                      preview: catchPersonRowCopy(context.l10n).typingLabel,
                      activityLabel: catchCountLabel(118),
                      activitySemantics: catchPersonRowCopy(
                        context.l10n,
                      ).unreadCountLabel(118),
                    ),
                  ),
                  CatchField.read(
                    content: CatchConversationLayout(
                      name: 'Alex',
                      preview: 'Hello',
                      activityLabel: catchPersonRowCopy(
                        context.l10n,
                      ).newMatchLabel,
                      activitySemantics: catchPersonRowCopy(
                        context.l10n,
                      ).newMatchLabel,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pump();
    }

    await pump(const Locale('en'));
    expect(find.text('Typing...'), findsOneWidget);
    expect(find.bySemanticsLabel('99+ unread chats'), findsOneWidget);
    expect(find.bySemanticsLabel('New match'), findsOneWidget);
    expect(
      catchPersonRowCopy(AppLocalizationsEn()).unreadCountLabel(1),
      'Unread chat',
    );

    await pump(const Locale('fr'));
    expect(find.text('Écrit…'), findsOneWidget);
    expect(find.text('Typing...'), findsNothing);
    expect(find.bySemanticsLabel('99+ non lus'), findsOneWidget);
    expect(find.bySemanticsLabel('Nouvelle rencontre'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

class _PersonRowCopyDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _PersonRowCopyDelegate();
  @override
  bool isSupported(Locale locale) => true;
  @override
  Future<AppLocalizations> load(Locale locale) => SynchronousFuture(
    locale.languageCode == 'fr' ? _FrenchPersonRowCopy() : AppLocalizationsEn(),
  );
  @override
  bool shouldReload(_PersonRowCopyDelegate old) => false;
}

class _FrenchPersonRowCopy extends AppLocalizationsEn {
  _FrenchPersonRowCopy() : super('fr');
  @override
  String get coreCatchPersonRowTextTyping => 'Écrit…';
  @override
  String get coreCatchPersonRowLabelNewMatch => 'Nouvelle rencontre';
  @override
  String coreCatchPersonRowLabelLabelUnreadChats({required Object label}) =>
      '$label non lus';
}
