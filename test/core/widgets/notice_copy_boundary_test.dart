import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  testWidgets('notice dismiss copy needs no inherited app localization', (
    tester,
  ) async {
    var dismissals = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: Scaffold(
          body: CatchNotice(
            notice: const CatchNoticeData(id: 'saved', title: 'Enregistré'),
            dismissLabel: 'Fermer',
            onDismiss: () => dismissals++,
          ),
        ),
      ),
    );
    expect(find.byTooltip('Fermer'), findsOneWidget);
    await tester.tap(find.byTooltip('Fermer'));
    expect(dismissals, 1);
  });

  testWidgets('queued notice follows locale without replacing queue state', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    const notice = CatchNoticeData(
      id: 'persistent',
      title: 'Saved',
      duration: null,
    );
    container.read(catchNoticeControllerProvider.notifier).show(notice);
    const host = CatchNoticeOverlay(child: SizedBox.expand());
    Widget frame(Locale locale) => UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: CatchTheme.light,
        locale: locale,
        supportedLocales: const [Locale('en'), Locale('fr')],
        localizationsDelegates: const [
          _NoticeCopyDelegate(),
          ...AppLocalizations.localizationsDelegates,
        ],
        home: const Scaffold(body: host),
      ),
    );
    await tester.pumpWidget(frame(const Locale('en')));
    await pumpUntilFound(tester, find.byTooltip('Dismiss').hitTestable());
    await tester.pumpWidget(frame(const Locale('fr')));
    await pumpUntilFound(tester, find.byTooltip('Fermer').hitTestable());
    expect(find.byTooltip('Dismiss'), findsNothing);
    expect(container.read(catchNoticeControllerProvider).current, same(notice));
    await tester.tap(find.byTooltip('Fermer'));
    await tester.pump();
    expect(container.read(catchNoticeControllerProvider).current, isNull);
  });
}

class _NoticeCopyDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _NoticeCopyDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<AppLocalizations> load(Locale locale) => SynchronousFuture(
    locale.languageCode == 'fr' ? _FrenchNoticeCopy() : AppLocalizationsEn(),
  );

  @override
  bool shouldReload(_NoticeCopyDelegate old) => false;
}

class _FrenchNoticeCopy extends AppLocalizationsEn {
  _FrenchNoticeCopy() : super('fr');

  @override
  String get coreCatchNoticeTooltipDismiss => 'Fermer';
}
