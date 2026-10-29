import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'adaptive section layout uses compact order below its local width',
    (tester) async {
      await tester.pumpWidget(
        _layoutSubject(
          width: 659,
          composition: CatchSectionListMode.adaptiveTwoColumn,
        ),
      );

      final primaryA = tester.getRect(find.byKey(const Key('primary-a')));
      final secondary = tester.getRect(find.byKey(const Key('secondary')));
      final primaryB = tester.getRect(find.byKey(const Key('primary-b')));

      expect(primaryA.width, CatchLayout.maxContentWidth);
      expect(
        primaryA.left,
        closeTo((659 - CatchLayout.maxContentWidth) / 2, 0.1),
      );
      expect(secondary.left, primaryA.left);
      expect(primaryB.left, primaryA.left);
      expect(primaryA.top, lessThan(secondary.top));
      expect(secondary.top, lessThan(primaryB.top));
    },
  );

  testWidgets(
    'adaptive section layout moves complete sections into two lanes',
    (tester) async {
      await tester.pumpWidget(
        _layoutSubject(
          width: 660,
          composition: CatchSectionListMode.adaptiveTwoColumn,
        ),
      );

      final primaryA = tester.getRect(find.byKey(const Key('primary-a')));
      final secondary = tester.getRect(find.byKey(const Key('secondary')));
      final primaryB = tester.getRect(find.byKey(const Key('primary-b')));

      expect(primaryA.width, closeTo((660 - CatchGaps.section) / 2, 0.1));
      expect(primaryB.left, primaryA.left);
      expect(primaryB.top, greaterThan(primaryA.bottom));
      expect(secondary.left, closeTo(primaryA.right + CatchGaps.section, 0.1));
      expect(secondary.top, primaryA.top);
    },
  );

  testWidgets('responsive layout preserves full bleed within each pane', (
    tester,
  ) async {
    Widget subject(double width) => MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: Align(
          alignment: Alignment.topLeft,
          child: SizedBox(
            width: width,
            child: CatchSectionList.responsive(
              emptyStateOmitted: true,
              mode: CatchSectionListMode.adaptiveTwoColumn,
              items: [
                CatchSectionListItem(
                  child: Builder(
                    builder: (context) => Text(
                      'primary:${CatchDividedFieldInteractionScope.interactionOf(context).name}',
                    ),
                  ),
                ),
                CatchSectionListItem(
                  lane: CatchSectionListPlacement.secondary,
                  child: Builder(
                    builder: (context) => Text(
                      'secondary:${CatchDividedFieldInteractionScope.interactionOf(context).name}',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    await tester.pumpWidget(subject(659));
    expect(find.text('primary:fullBleed'), findsOneWidget);
    expect(find.text('secondary:fullBleed'), findsOneWidget);

    await tester.pumpWidget(subject(660));
    expect(find.text('primary:fullBleed'), findsOneWidget);
    expect(find.text('secondary:fullBleed'), findsOneWidget);
  });

  testWidgets('centered composition remains one capped lane on wide pages', (
    tester,
  ) async {
    await tester.pumpWidget(
      _layoutSubject(width: 780, composition: CatchSectionListMode.centered),
    );

    final primary = tester.getRect(find.byKey(const Key('primary-a')));
    final secondary = tester.getRect(find.byKey(const Key('secondary')));

    expect(primary.width, CatchLayout.maxContentWidth);
    expect(primary.left, 90);
    expect(secondary.left, primary.left);
    expect(secondary.top, greaterThan(primary.bottom));
  });

  testWidgets(
    'centered full-bleed fields reach the viewport beyond the capped lane',
    (tester) async {
      final previousHighlightStrategy = FocusManager.instance.highlightStrategy;
      FocusManager.instance.highlightStrategy =
          FocusHighlightStrategy.alwaysTraditional;
      addTearDown(
        () =>
            FocusManager.instance.highlightStrategy = previousHighlightStrategy,
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SizedBox(
              width: 780,
              height: 640,
              child: CatchSectionList.page(
                emptyStateOmitted: true,
                items: [
                  CatchSectionListItem(
                    child: CatchSection.fieldRows(
                      first: true,
                      children: [
                        CatchField.nav(
                          copy: catchFieldCopy(AppLocalizationsEn()),
                          title: 'Reminder timing',
                          onTap: _noop,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      final scope = FocusScope.of(tester.element(find.byType(Scaffold)));
      expect(scope.nextFocus(), isTrue);
      await tester.pump();

      final overlay = tester.getRect(
        find.byKey(const ValueKey<String>('catch-field-active-overlay')),
      );
      expect(overlay.left, 0);
      expect(overlay.right, 780);
    },
  );

  testWidgets('split-pane full bleed is bounded by its owning lane', (
    tester,
  ) async {
    final previousHighlightStrategy = FocusManager.instance.highlightStrategy;
    FocusManager.instance.highlightStrategy =
        FocusHighlightStrategy.alwaysTraditional;
    addTearDown(
      () => FocusManager.instance.highlightStrategy = previousHighlightStrategy,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SizedBox(
            width: 780,
            height: 640,
            child: CatchSectionList.page(
              emptyStateOmitted: true,
              mode: CatchSectionListMode.adaptiveTwoColumn,
              items: [
                CatchSectionListItem(
                  child: CatchSection.fieldRows(
                    first: true,
                    children: [
                      CatchField.nav(
                        copy: catchFieldCopy(AppLocalizationsEn()),
                        title: 'Primary',
                        onTap: _noop,
                      ),
                    ],
                  ),
                ),
                CatchSectionListItem(
                  lane: CatchSectionListPlacement.secondary,
                  child: CatchSection.fieldRows(
                    first: true,
                    children: [
                      CatchField.nav(
                        copy: catchFieldCopy(AppLocalizationsEn()),
                        title: 'Secondary',
                        onTap: _noop,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    final scope = FocusScope.of(tester.element(find.byType(Scaffold)));
    expect(scope.nextFocus(), isTrue);
    await tester.pump();

    final overlay = tester.getRect(
      find.byKey(const ValueKey<String>('catch-field-active-overlay')).first,
    );
    expect(overlay.left, CatchSpacing.screenPx);
    expect(
      overlay.right,
      closeTo(
        CatchSpacing.screenPx +
            (780 - (2 * CatchSpacing.screenPx) - CatchGaps.section) / 2,
        0.1,
      ),
    );
  });

  testWidgets('responsive page publishes and clears floating shell geometry', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: MediaQuery(
          data: const MediaQueryData(size: Size(390, 640)),
          child: CatchTabViewportScope(
            index: 0,
            bottomOverlayInset: 88,
            bottomBarPlacement: CatchTabViewportScopePlacement.floating,
            child: Scaffold(
              body: SizedBox(
                width: 390,
                height: 640,
                child: CatchSectionList.page(
                  emptyStateOmitted: true,
                  items: [
                    CatchSectionListItem(
                      child: Builder(
                        builder: (context) {
                          final obstruction =
                              CatchFieldVisibilityScope.bottomObstructionOf(
                                context,
                              );
                          return Text('obstruction:$obstruction');
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('obstruction:88.0'), findsOneWidget);
    expect(
      tester.getSize(find.byType(CatchScrollTerminalGap)).height,
      88 + CatchSpacing.screenPb,
    );

    final bodyPadding = tester.widget<Padding>(
      find
          .descendant(
            of: find.byType(CatchPageBody),
            matching: find.byWidgetPredicate(
              (widget) =>
                  widget is Padding &&
                  widget.child is CatchFieldInteractionPlaneScope,
            ),
          )
          .first,
    );
    expect(
      bodyPadding.padding,
      const EdgeInsets.fromLTRB(
        CatchSpacing.screenPx,
        CatchSpacing.screenPt,
        CatchSpacing.screenPx,
        0,
      ),
    );
  });
}

void _noop() {}

Widget _layoutSubject({
  required double width,
  required CatchSectionListMode composition,
}) {
  return MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(
      body: Align(
        alignment: Alignment.topLeft,
        child: SizedBox(
          width: width,
          child: CatchSectionList.responsive(
            emptyStateOmitted: true,
            mode: composition,
            items: const [
              CatchSectionListItem(
                child: SizedBox(key: Key('primary-a'), height: 80),
              ),
              CatchSectionListItem(
                lane: CatchSectionListPlacement.secondary,
                child: SizedBox(key: Key('secondary'), height: 60),
              ),
              CatchSectionListItem(
                child: SizedBox(key: Key('primary-b'), height: 40),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
