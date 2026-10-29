import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

String _clearTooltip(String placeholder) => 'Effacer $placeholder';

const _copy = CatchSearchFieldCopy(
  searchLabel: 'Rechercher',
  clearTooltip: _clearTooltip,
  closeSearchLabel: 'Fermer la recherche',
);

Widget _app(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: child),
);

void main() {
  test('app search copy retains the existing catalog strings', () {
    final l10n = AppLocalizationsEn();
    final copy = catchSearchFieldCopy(l10n);
    expect(copy.searchLabel, l10n.sharedSearchLabel);
    expect(
      copy.closeSearchLabel,
      l10n.coreCatchSearchFieldVisiblecopyCloseSearch,
    );
    expect(
      copy.clearTooltip('People'),
      l10n.coreCatchSearchFieldTooltipClearPlaceholder(placeholder: 'People'),
    );
  });

  testWidgets('fixed search uses default copy and keeps clear focus behavior', (
    tester,
  ) async {
    String? changed;
    await tester.pumpWidget(
      _app(
        CatchSearchField(
          copy: _copy,
          value: 'Taylor',
          onChanged: (value) => changed = value,
        ),
      ),
    );
    expect(
      tester.widget<TextField>(find.byType(TextField)).decoration?.hintText,
      'Rechercher',
    );
    await tester.tap(find.byTooltip('Effacer Rechercher'));
    await pumpFeatureUi(tester);
    expect(changed, '');
    expect(
      tester.widget<TextField>(find.byType(TextField)).focusNode?.hasFocus,
      isTrue,
    );
    expect(find.byTooltip('Fermer la recherche'), findsNothing);
  });

  testWidgets(
    'expanding search clears the resolved placeholder before closing',
    (tester) async {
      var value = 'Taylor';
      var closed = false;
      await tester.pumpWidget(
        _app(
          StatefulBuilder(
            builder: (context, setState) => CatchSearchField.expanding(
              copy: _copy,
              placeholder: 'People',
              value: value,
              onChanged: (next) => setState(() => value = next),
              onCloseSearch: () => closed = true,
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.byTooltip('Effacer People'), findsOneWidget);
      expect(find.byTooltip('Fermer la recherche'), findsNothing);
      await tester.tap(find.byTooltip('Effacer People'));
      await pumpFeatureUi(tester);
      expect(value, '');
      expect(closed, isFalse);
      await tester.tap(find.byTooltip('Fermer la recherche'));
      expect(closed, isTrue);
    },
  );

  testWidgets('top bar passes copy while preserving its search overrides', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(
        const CatchTopBar.route(
          title: 'People',
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.none,
          ),
          search: CatchTopBarSearch(
            copy: _copy,
            placeholder: 'Find people',
            tooltip: 'Open people search',
          ),
        ),
      ),
    );
    await tester.tap(find.byTooltip('Open people search'));
    await pumpFeatureUi(tester);
    expect(
      tester.widget<TextField>(find.byType(TextField)).decoration?.hintText,
      'Find people',
    );
    expect(find.byTooltip('Fermer la recherche'), findsOneWidget);
    await tester.tap(find.byTooltip('Fermer la recherche'));
    await pumpFeatureUi(tester);
    expect(find.byTooltip('Open people search'), findsOneWidget);
  });
}
