import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_scaffold.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _placements = ['state', 'scaffold', 'sliver', 'inline'];

void main() {
  for (final placement in [..._placements, 'body']) {
    testWidgets('$placement uses caller copy without app localization', (
      tester,
    ) async {
      var retries = 0;
      await tester.pumpWidget(
        _frame(
          placement,
          _sharedError(
            placement,
            retryLabel: 'Réessayer',
            onRetry: () => retries++,
          ),
        ),
      );
      expect(find.text('Réessayer'), findsOneWidget);
      expect(find.text('Try again'), findsNothing);
      await tester.tap(find.text('Réessayer'));
      expect(retries, 1);
    });
  }

  test('every shared retry surface rejects missing caller copy', () {
    for (final placement in [..._placements, 'body']) {
      expect(
        () => _sharedError(placement, onRetry: () {}),
        throwsAssertionError,
      );
    }
  });

  for (final placement in _placements) {
    testWidgets('$placement adapter follows inherited locale changes', (
      tester,
    ) async {
      final error = StateError('private implementation detail');
      var retries = 0;
      final adapter = _localizedError(
        placement,
        error,
        onRetry: () => retries++,
      );
      await tester.pumpWidget(
        _frame(placement, adapter, locale: const Locale('en')),
      );
      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      await tester.pumpWidget(
        _frame(placement, adapter, locale: const Locale('fr')),
      );
      expect(find.text('Une erreur est survenue'), findsOneWidget);
      expect(find.text('Réessayer'), findsOneWidget);
      expect(find.text('Try again'), findsNothing);
      expect(
        find.textContaining('private implementation detail'),
        findsNothing,
      );
      await tester.tap(find.text('Réessayer'));
      expect(retries, 1);
    });

    testWidgets(
      '$placement preserves explicit recovery and presentation overrides',
      (tester) async {
        var retries = 0;
        var exits = 0;
        final adapter = _localizedError(
          placement,
          const PermissionException('Access denied.'),
          onRetry: () => retries++,
          retryLabel: 'Recharger',
          icon: CatchIcons.refresh,
          secondaryAction: CatchErrorBackButton(
            label: 'Retour',
            onPressed: () => exits++,
          ),
        );
        await tester.pumpWidget(
          _frame(placement, adapter, locale: const Locale('en')),
        );
        final body = tester.widget<CatchErrorState>(
          find.byType(CatchErrorState),
        );
        expect(body.icon, CatchIcons.refresh);
        await tester.tap(find.text('Recharger'));
        await tester.tap(find.text('Retour'));
        expect(retries, 1);
        expect(exits, 1);
      },
    );
  }
}

Widget _frame(String placement, Widget child, {Locale? locale}) => MaterialApp(
  theme: CatchTheme.light,
  locale: locale,
  supportedLocales: const [Locale('en'), Locale('fr')],
  localizationsDelegates: locale == null
      ? null
      : const [
          _ErrorCopyDelegate(),
          ...AppLocalizations.localizationsDelegates,
        ],
  home: placement == 'scaffold'
      ? child
      : Scaffold(
          body: placement == 'sliver'
              ? CustomScrollView(slivers: [child])
              : child,
        ),
);

Widget _sharedError(
  String placement, {
  String? retryLabel,
  VoidCallback? onRetry,
}) => switch (placement) {
  'scaffold' => CatchErrorScaffold(
    title: 'Indisponible',
    message: 'Veuillez réessayer.',
    retryLabel: retryLabel,
    onRetry: onRetry,
  ),
  'sliver' => CatchSliverErrorState(
    title: 'Indisponible',
    message: 'Veuillez réessayer.',
    retryLabel: retryLabel,
    onRetry: onRetry,
  ),
  'inline' => CatchErrorState(
    title: 'Indisponible',
    message: 'Veuillez réessayer.',
    retryLabel: retryLabel,
    onRetry: onRetry,
    mode: CatchErrorStateMode.inline,
  ),
  'body' => CatchErrorState(
    title: 'Indisponible',
    message: 'Veuillez réessayer.',
    retryLabel: retryLabel,
    onRetry: onRetry,
  ),
  _ => CatchErrorState(
    title: 'Indisponible',
    message: 'Veuillez réessayer.',
    retryLabel: retryLabel,
    onRetry: onRetry,
  ),
};

Widget _localizedError(
  String placement,
  Object error, {
  VoidCallback? onRetry,
  String? retryLabel,
  IconData? icon,
  Widget? secondaryAction,
}) => switch (placement) {
  'scaffold' => CatchLocalizedErrorScaffold(
    error,
    onRetry: onRetry,
    retryLabel: retryLabel,
    icon: icon,
    actions: [?secondaryAction],
  ),
  'sliver' => CatchLocalizedSliverErrorState(
    error,
    onRetry: onRetry,
    retryLabel: retryLabel,
    icon: icon,
    actions: [?secondaryAction],
  ),
  'inline' => CatchLocalizedErrorState(
    error,
    onRetry: onRetry,
    retryLabel: retryLabel,
    icon: icon,
    actions: [?secondaryAction],
    mode: CatchErrorStateMode.inline,
  ),
  _ => CatchLocalizedErrorState(
    error,
    onRetry: onRetry,
    retryLabel: retryLabel,
    icon: icon,
    actions: [?secondaryAction],
  ),
};

class _ErrorCopyDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _ErrorCopyDelegate();
  @override
  bool isSupported(Locale locale) => true;
  @override
  Future<AppLocalizations> load(Locale locale) => SynchronousFuture(
    locale.languageCode == 'fr' ? _FrenchErrorCopy() : AppLocalizationsEn(),
  );
  @override
  bool shouldReload(_ErrorCopyDelegate old) => false;
}

class _FrenchErrorCopy extends AppLocalizationsEn {
  _FrenchErrorCopy() : super('fr');
  @override
  String get coreAppErrorMessageVisiblecopySomethingWentWrong =>
      'Une erreur est survenue';
  @override
  String get coreAppErrorMessageVisiblecopyTryAgain => 'Réessayer';
}
