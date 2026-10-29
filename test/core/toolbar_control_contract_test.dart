import 'package:catch_dating_app/explore/presentation/explore_chrome_state.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_city_picker.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void noop() {}
String clear(String s) => 'Clear $s';
const copy = CatchSearchFieldCopy(
  searchLabel: 'Search',
  clearTooltip: clear,
  closeSearchLabel: 'Close search',
);
Widget wrap(Widget child, {double scale = 1}) => MaterialApp(
  theme: AppTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: MediaQuery(
    data: MediaQueryData(
      size: const Size(390, 800),
      textScaler: TextScaler.linear(scale),
    ),
    child: Scaffold(body: SizedBox(width: 390, child: child)),
  ),
);

const city = CityData(
  name: 'mumbai',
  label: 'Mumbai',
  latitude: 19.07,
  longitude: 72.87,
);

void main() {
  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
  });
  for (final platform in [TargetPlatform.iOS, TargetPlatform.android]) {
    testWidgets(
      'toolbar controls share paint extent, center and gaps on $platform',
      (tester) async {
        debugDefaultTargetPlatformOverride = platform;
        await tester.pumpWidget(
          wrap(
            CatchTopBar.screen(
              title: 'Messaging',
              actions: [
                CatchIconAction.toolbar(
                  icon: CatchIcons.add,
                  tooltip: 'Compose',
                  onPressed: noop,
                ),
              ],
              search: const CatchTopBarSearch(
                copy: copy,
                placeholder: 'Search messages',
                tooltip: 'Search messages',
              ),
            ),
          ),
        );
        final action = tester.getRect(find.byType(CatchIconAction));
        final actionPaint = tester.getRect(
          find
              .descendant(
                of: find.byType(CatchIconAction),
                matching: find.byType(CatchSurface),
              )
              .first,
        );
        final searchPaint = tester.getRect(
          find
              .descendant(
                of: find.byType(CatchSearchField),
                matching: find.byType(CatchSurface),
              )
              .first,
        );
        expect(actionPaint.size, const Size(44, 44));
        expect(searchPaint.size, const Size(44, 44));
        expect(actionPaint.center.dy, searchPaint.center.dy);
        expect(action.width, platform == TargetPlatform.iOS ? 44 : 48);
        final searchTarget = tester.getRect(find.byType(CatchSearchField));
        expect(searchTarget.left - action.right, 8);
        expect(tester.takeException(), isNull);
        debugDefaultTargetPlatformOverride = null;
      },
    );
  }
  testWidgets(
    'selector published size equals painted layout at both text scales',
    (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      for (final scale in [1.0, 2.0]) {
        await tester.pumpWidget(
          wrap(
            Align(
              alignment: Alignment.topLeft,
              child: CatchToolbarButton.selector(
                label: 'Goa',
                semanticLabel: 'Choose city Goa',
                tooltip: 'Choose city',
                icon: CatchIcons.location,
                onPressed: noop,
              ),
            ),
            scale: scale,
          ),
        );
        final finder = find.byType(CatchToolbarButton);
        final size = CatchToolbarButton.sizeFor(
          tester.element(finder),
          label: 'Goa',
        );
        expect(tester.getSize(finder).width, closeTo(size.width, .01));
        expect(tester.getSize(finder).height, closeTo(size.height, .01));
        expect(size.height, scale == 1 ? 44 : greaterThan(44));
        expect(tester.takeException(), isNull);
      }
      debugDefaultTargetPlatformOverride = null;
    },
  );
  testWidgets(
    'search expansion stays valid during the transition and after typing',
    (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      await tester.pumpWidget(
        wrap(
          CatchTopBar.screen(
            title: 'Messaging',
            actions: [
              CatchIconAction.toolbar(
                icon: CatchIcons.add,
                tooltip: 'Compose',
                onPressed: noop,
              ),
            ],
            search: const CatchTopBarSearch(
              copy: copy,
              placeholder: 'Search messages',
              tooltip: 'Search messages',
            ),
          ),
          scale: 2,
        ),
      );
      await tester.tap(find.byTooltip('Search messages'));
      await tester.pump();
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 30));
      expect(tester.takeException(), isNull);
      await pumpFeatureUi(tester);
      await tester.enterText(find.byType(EditableText), 'Riya');
      await tester.pump();
      expect(tester.takeException(), isNull);
      debugDefaultTargetPlatformOverride = null;
    },
  );
  testWidgets(
    'large root selectors reflow below the full-width title with their peers',
    (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      await tester.pumpWidget(
        wrap(
          CatchTopBar.screen(
            title: 'Explore',
            leading: ExploreCityPicker(
              state: ExploreCityPickerState.from(
                selectedCity: city,
                cities: [city],
                cityListLoading: false,
                cityListError: null,
              ),
              onSelected: (_) {},
            ),
            actions: [
              CatchIconAction.toolbar(
                icon: CatchIcons.bookmark,
                tooltip: 'Saved',
                onPressed: noop,
              ),
            ],
            search: const CatchTopBarSearch(
              copy: copy,
              placeholder: 'Search',
              tooltip: 'Search',
            ),
          ),
          scale: 2,
        ),
      );
      final barFinder = find.byType(CatchTopBar);
      final title = tester.getRect(find.text('Explore'));
      final selector = tester.getRect(find.byType(ExploreCityPicker));
      final search = tester.getRect(find.byType(CatchSearchField));
      final action = tester.getRect(find.byType(CatchIconAction));
      expect(title.width, greaterThan(300));
      expect(selector.width, greaterThan(132));
      expect(action.left - selector.right, greaterThanOrEqualTo(8));
      expect(title.bottom, lessThanOrEqualTo(selector.top));
      expect(selector.center.dy, search.center.dy);
      expect(action.center.dy, search.center.dy);
      final context = tester.element(barFinder);
      expect(
        tester
            .widget<CatchTopBar>(barFinder)
            .preferredSizeFor(context, width: 390)
            .height,
        tester.getSize(barFinder).height,
      );
      expect(tester.takeException(), isNull);
      await tester.tap(find.byTooltip('Search'));
      await pumpFeatureUi(tester);
      expect(find.text('Explore'), findsOneWidget);
      expect(tester.getSize(find.byType(CatchSearchField)).width, 350);
      expect(tester.takeException(), isNull);
      debugDefaultTargetPlatformOverride = null;
    },
  );
  for (final selector in [true, false]) {
    testWidgets(
      'labelled toolbar ${selector ? 'selector' : 'action'} supports semantic activation and disables it',
      (tester) async {
        final semantics = tester.ensureSemantics();
        try {
          var taps = 0;
          for (final enabled in [true, false]) {
            final VoidCallback? activate = enabled ? () => taps++ : null;
            final control = selector
                ? CatchToolbarButton.selector(
                    label: 'Mumbai',
                    semanticLabel: 'Choose Mumbai',
                    tooltip: 'Choose city',
                    icon: CatchIcons.location,
                    onPressed: activate,
                  )
                : CatchToolbarButton.action(
                    label: 'Create event',
                    semanticLabel: 'Create event',
                    tooltip: 'Create event',
                    icon: CatchIcons.add,
                    onPressed: activate,
                  );
            await tester.pumpWidget(
              wrap(Align(alignment: Alignment.topLeft, child: control)),
            );
            final node = tester.getSemantics(find.byType(CatchToolbarButton));
            expect(
              node.getSemanticsData().hasAction(SemanticsAction.tap),
              enabled,
            );
            expect(
              node.getSemanticsData().label,
              selector ? 'Choose Mumbai' : 'Create event',
            );
            if (enabled) {
              node.owner!.performAction(node.id, SemanticsAction.tap);
              await tester.pump();
            }
            expect(taps, 1);
          }
        } finally {
          semantics.dispose();
        }
      },
    );
  }
  testWidgets(
    'collapsed search supports semantic activation and disabled search exposes no tap',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        await tester.pumpWidget(
          wrap(
            const CatchTopBar.screen(
              title: 'Messaging',
              search: CatchTopBarSearch(
                copy: copy,
                placeholder: 'Search messages',
                tooltip: 'Search messages',
              ),
            ),
          ),
        );
        final node = tester.getSemantics(
          find.bySemanticsLabel('Search messages'),
        );
        expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
        node.owner!.performAction(node.id, SemanticsAction.tap);
        await pumpFeatureUi(tester);
        expect(
          tester.widget<CatchSearchField>(find.byType(CatchSearchField)).status,
          CatchSearchFieldStatus.expanded,
        );
        expect(find.byType(EditableText), findsOneWidget);

        await tester.pumpWidget(
          wrap(
            const Align(
              alignment: Alignment.topRight,
              child: CatchSearchField.expanding(
                copy: copy,
                placeholder: 'Search',
                tooltip: 'Search',
                enabled: false,
                status: CatchSearchFieldStatus.collapsed,
                maxWidth: 350,
                onOpenSearch: noop,
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        final disabled = tester.getSemantics(find.bySemanticsLabel('Search'));
        expect(
          disabled.getSemanticsData().hasAction(SemanticsAction.tap),
          isFalse,
        );
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    },
  );
  final invalid = <String, Widget>{
    'plain icon': CatchIconAction.icon(
      icon: CatchIcons.add,
      variant: CatchIconActionVariant.plain,
    ),
    'small icon': CatchIconAction.icon(icon: CatchIcons.add, size: 32),
    'paint override': CatchIconAction.icon(
      icon: CatchIcons.add,
      backgroundColor: Colors.red,
    ),
    'raw colored glyph': CatchIconAction(
      child: Icon(CatchIcons.add, color: Colors.red),
    ),
    'raw oversized glyph': CatchIconAction(
      child: Icon(CatchIcons.add, size: 32),
    ),
    'accent override': CatchIconAction.icon(
      icon: CatchIcons.add,
      accent: Colors.red,
    ),
    'plain overflow': const CatchActionMenu<int>(
      tooltip: 'More',
      items: [CatchActionMenuItem(value: 1, label: 'Export')],
      variant: CatchIconActionVariant.plain,
    ),
  };
  for (final entry in invalid.entries) {
    testWidgets('app bar rejects ${entry.key}', (tester) async {
      final originalBuilder = ErrorWidget.builder;
      ErrorWidget.builder = (_) => const SizedBox.shrink();
      try {
        await tester.pumpWidget(
          wrap(CatchTopBar.screen(title: 'Audience', actions: [entry.value])),
        );
        expect(
          tester.takeException().toString(),
          contains('App-bar controls own'),
        );
      } finally {
        ErrorWidget.builder = originalBuilder;
      }
    });
  }
}
