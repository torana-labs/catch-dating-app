import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../test_pump_helpers.dart';

void main() {
  testWidgets('constrained route reserves height from its actual title lane', (
    tester,
  ) async {
    const bodyKey = ValueKey('narrow-route-body');
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const MediaQuery(
          data: MediaQueryData(
            size: Size(800, 600),
            textScaler: TextScaler.linear(2),
          ),
          child: Center(
            child: SizedBox(
              width: 360,
              height: 600,
              child: CatchScaffold.workspace(
                title: CatchTopBar.route(
                  title: 'Edge-owned route',
                  navigation: CatchTopBarNavigation(
                    mode: CatchTopBarNavigationMode.none,
                  ),
                ),
                body: SizedBox.expand(key: bodyKey),
              ),
            ),
          ),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
    final bar = tester.getRect(find.byType(CatchTopBar));
    expect(bar.width, 360);
    expect(tester.getRect(find.byKey(bodyKey)).top, bar.bottom);
  });

  for (final scale in [1.0, 2.0]) {
    testWidgets('step overview shares canonical alignment at scale $scale', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      final semantics = tester.ensureSemantics();
      var opened = false;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(scale)),
            child: Scaffold(
              body: Align(
                alignment: Alignment.topLeft,
                child: SizedBox(
                  width: 360,
                  child: CatchStepHeader(
                    title: 'Create event',
                    step: 2,
                    total: 4,
                    stepLabelBuilder: (step, total) => 'Step $step of $total',
                    compactStepLabelBuilder: (step, total) => '$step / $total',
                    stepOverviewSemanticsLabel: 'Review event steps',
                    onStepOverview: () => opened = true,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      final overview = find.bySemanticsLabel('Review event steps');
      expect(overview, findsOneWidget);
      await tester.tap(overview);
      expect(opened, isTrue);
      expect(
        tester.getRect(find.byType(CatchStepHeader)).bottom,
        greaterThan(tester.getRect(find.byType(CatchTopBar)).bottom),
      );
      semantics.dispose();
      debugDefaultTargetPlatformOverride = null;
    });
  }

  for (final platform in [TargetPlatform.iOS, TargetPlatform.android]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'task and context share the platform family at $platform $scale',
        (tester) async {
          debugDefaultTargetPlatformOverride = platform;
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(390, 844);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          await tester.pumpWidget(
            MaterialApp(
              theme: AppTheme.light,
              home: MediaQuery(
                data: MediaQueryData(
                  size: const Size(390, 844),
                  textScaler: TextScaler.linear(scale),
                ),
                child: const CatchScaffold.workspace(
                  title: CatchTopBar.route(
                    title: 'Event recap',
                    subtitle: 'Wednesday Evening Run',
                    navigation: CatchTopBarNavigation(
                      mode: CatchTopBarNavigationMode.back,
                    ),
                  ),
                  body: SizedBox.shrink(),
                ),
              ),
            ),
          );
          final title = tester.widget<Text>(find.text('Event recap'));
          final contextText = tester.widget<Text>(
            find.text('Wednesday Evening Run'),
          );
          for (final text in [title, contextText]) {
            expect(
              CatchFonts.platformFunctionFamilies,
              contains(text.style!.fontFamily),
            );
          }
          expect(
            title.style!.fontSize,
            greaterThan(contextText.style!.fontSize!),
          );
          expect(
            tester.getBottomLeft(find.text('Event recap')).dy,
            lessThan(tester.getTopLeft(find.text('Wednesday Evening Run')).dy),
          );
          final barRect = tester.getRect(find.byType(CatchTopBar));
          final titleRect = tester.getRect(find.text('Event recap'));
          // Single-line titles don't reserve an empty second line at large text.
          expect(titleRect.top - barRect.top, lessThan(20));
          expect(
            tester.getBottomLeft(find.text('Wednesday Evening Run')).dy,
            lessThanOrEqualTo(barRect.bottom),
          );
          expect(tester.takeException(), isNull);
          debugDefaultTargetPlatformOverride = null;
        },
      );
    }
  }

  testWidgets(
    'expanded search removes covered action and title semantics at 2x',
    (tester) async {
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(390, 844),
              textScaler: TextScaler.linear(2),
            ),
            child: CatchScaffold.workspace(
              title: CatchTopBar.screen(
                title: 'Customer communications',
                search: CatchTopBarSearch(
                  expanded: true,
                  placeholder: 'Search customers',
                  tooltip: 'Search customers',
                  copy: CatchSearchFieldCopy(
                    searchLabel: 'Search',
                    closeSearchLabel: 'Close search',
                    clearTooltip: (value) => 'Clear $value',
                  ),
                ),
                actions: [
                  CatchButton.text(
                    label: 'Mark every conversation as read',
                    onPressed: () {},
                  ),
                ],
              ),
              body: const SizedBox.shrink(),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.bySemanticsLabel('Customer communications'), findsNothing);
      expect(
        find.bySemanticsLabel('Mark every conversation as read'),
        findsNothing,
      );
      expect(find.bySemanticsLabel('Close search'), findsWidgets);
      expect(tester.takeException(), isNull);
      semantics.dispose();
    },
  );
}
