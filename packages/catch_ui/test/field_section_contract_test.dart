import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'scrollable summary choices stay on one rail and select nullable All',
    (tester) async {
      String? selected = 'withdrawn';
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, update) => Align(
                alignment: Alignment.topLeft,
                child: SizedBox(
                  width: 250,
                  child: CatchChoiceInput<String?>.segmented(
                    selected: selected,
                    options: const [
                      CatchOption(value: null, label: 'All'),
                      CatchOption(value: 'submitted', label: 'Submitted'),
                      CatchOption(value: 'review', label: 'In review'),
                      CatchOption(value: 'withdrawn', label: 'Withdrawn'),
                    ],
                    variant: CatchChoiceInputVariant.summary,
                    scrollable: true,
                    contractExemption:
                        'Test of nullable selection and horizontal summary geometry.',
                    onChanged: (value) => update(() => selected = value),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      expect(
        tester.getTopLeft(find.text('All')).dy,
        tester.getTopLeft(find.text('Withdrawn')).dy,
      );
      expect(find.byType(SingleChildScrollView), findsOneWidget);
      await tester.tap(find.text('All'));
      await tester.pump();
      expect(selected, isNull);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'legacy full-band declarations still require a proven paint extent',
    (tester) async {
      const key = ValueKey('unowned-full-band');
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.dark,
          home: const Scaffold(
            body: Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: CatchFieldGeometryScope(
                gutterOwnership: CatchFieldGeometryScopeMode.container,
                interactionShape: CatchFieldGeometryScopeVariant.fullBleedBand,
                child: CatchFieldSurface(
                  pressedOverlayKey: key,
                  states: {WidgetState.hovered},
                  child: SizedBox(height: 60, width: double.infinity),
                ),
              ),
            ),
          ),
        ),
      );
      final paint = tester.widget<AnimatedContainer>(find.byKey(key));
      final decoration = paint.decoration! as BoxDecoration;
      expect(decoration.borderRadius, isNotNull);
      expect(decoration.borderRadius, isNot(BorderRadius.zero));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('section names wrap above the content-width rule at large text', (
    tester,
  ) async {
    const title = 'Available ways to message this person';
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.dark,
        home: Scaffold(
          body: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: SizedBox(
              width: 390,
              child: CatchSection.rows(
                title: title,
                children: const [
                  CatchField.read(content: CatchPersonLayout(name: 'Riya')),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    final header = find.text(title.toUpperCase());
    final paragraph = tester.renderObject<RenderParagraph>(header);
    expect(paragraph.didExceedMaxLines, isFalse);
    expect(
      tester.getRect(header).bottom,
      lessThan(tester.getRect(find.byType(CatchField)).top),
    );
    expect(tester.takeException(), isNull);
  });

  Widget host(Widget child, {TextDirection direction = TextDirection.ltr}) =>
      MaterialApp(
        theme: CatchTheme.dark,
        home: Scaffold(
          body: Directionality(
            textDirection: direction,
            child: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: 390,
                child: CatchSectionList.panes(body: child),
              ),
            ),
          ),
        ),
      );

  CatchField record(String id, VoidCallback onActivate) => CatchField.navigate(
    key: ValueKey(id),
    onActivate: onActivate,
    content: CatchRecordLayout(
      title: id,
      icon: CatchIcons.event,
      facts: const ['Sunday · Saket Garden', '2 attended'],
    ),
  );

  testWidgets('full-bleed paint, semantics and both gutters share a target', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    var calls = 0;
    await tester.pumpWidget(
      host(
        CatchSection.rows(
          title: 'May 2026',
          children: [record('one', () => calls++), record('two', () {})],
        ),
      ),
    );
    await tester.pumpAndSettle();
    final row = find.byWidgetPredicate(
      (widget) => widget is CatchField && widget.key == const ValueKey('one'),
    );
    final bounds = tester.getRect(row);
    expect(bounds.left, 0);
    expect(bounds.right, 390);
    final semanticBounds = tester
        .getSemantics(
          find.descendant(
            of: row,
            matching: find.byWidgetPredicate(
              (widget) =>
                  widget is Semantics && widget.properties.button == true,
            ),
          ),
        )
        .rect;
    expect(semanticBounds.width, bounds.width);
    expect(semanticBounds.height, bounds.height);
    await tester.tapAt(Offset(1, bounds.center.dy));
    await tester.pumpAndSettle();
    await tester.tapAt(Offset(389, bounds.center.dy));
    await tester.pumpAndSettle();
    expect(calls, 2);

    final pointer = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await pointer.addPointer(location: Offset(1, bounds.center.dy));
    await tester.pumpAndSettle();
    final paint = find.descendant(
      of: row,
      matching: find.byKey(CatchField.pressOverlayKey),
    );
    expect(tester.getRect(paint), bounds);
    final decoration =
        tester.widget<AnimatedContainer>(paint).decoration! as BoxDecoration;
    expect(decoration.borderRadius, BorderRadius.zero);
    expect(decoration.color!.a, greaterThan(0));
    await pointer.removePointer();
    semantics.dispose();
  });

  testWidgets('an unowned inset cannot authorize a square highlight', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.dark,
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: CatchSection.rows(
              children: [
                CatchField.navigate(
                  content: const CatchPersonLayout(name: 'Riya'),
                  states: const {WidgetState.hovered},
                  onActivate: () {},
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final paint = find.byKey(CatchField.pressOverlayKey);
    final decoration =
        tester.widget<AnimatedContainer>(paint).decoration! as BoxDecoration;
    expect(decoration.borderRadius, isNot(BorderRadius.zero));
    expect(decoration.borderRadius, isNotNull);
    expect(tester.getRect(paint).left, greaterThan(0));
    expect(tester.takeException(), isNull);
  });

  for (final direction in TextDirection.values) {
    testWidgets('header and sibling rules use their own lanes in $direction', (
      tester,
    ) async {
      await tester.pumpWidget(
        host(
          CatchSection.rows(
            title: 'May 2026',
            children: [record('one', () {}), record('two', () {})],
          ),
          direction: direction,
        ),
      );
      await tester.pumpAndSettle();
      final rules = find.byType(CatchDivider);
      expect(rules, findsNWidgets(2));
      Rect paintedRule(int index) => tester.getRect(
        find.descendant(of: rules.at(index), matching: find.byType(ColoredBox)),
      );
      final header = paintedRule(0);
      final sibling = paintedRule(1);
      final title = tester.getRect(find.text('one'));
      expect(header.left, 20);
      expect(header.right, 370);
      if (direction == TextDirection.ltr) {
        expect(sibling.left, title.left);
        expect(sibling.right, header.right);
      } else {
        expect(sibling.right, title.right);
        expect(sibling.left, header.left);
      }
    });
  }

  testWidgets(
    'active neighbors suppress only the sibling rule without movement',
    (tester) async {
      await tester.pumpWidget(
        host(
          CatchSection.rows(
            title: 'May 2026',
            children: [record('one', () {}), record('two', () {})],
          ),
        ),
      );
      await tester.pumpAndSettle();
      final before = tester.getRect(find.text('two'));
      final pointer = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await pointer.addPointer(location: tester.getCenter(find.text('two')));
      await tester.pumpAndSettle();
      expect(
        tester.widget<AnimatedOpacity>(find.byType(AnimatedOpacity)).opacity,
        0,
      );
      expect(find.byType(CatchDivider), findsNWidgets(2));
      expect(tester.getRect(find.text('two')), before);
      await pointer.removePointer();
      await tester.pumpAndSettle();
      expect(
        tester.widget<AnimatedOpacity>(find.byType(AnimatedOpacity)).opacity,
        1,
      );
    },
  );

  testWidgets('contained rows have one rounded exterior', (tester) async {
    await tester.pumpWidget(
      host(
        CatchSection.containedRows(
          children: [record('one', () {}), record('two', () {})],
        ),
      ),
    );
    await tester.pumpAndSettle();
    final clip = find.byKey(CatchSectionSurface.rowGroupClipKey);
    expect(clip, findsOneWidget);
    expect(tester.getRect(clip).left, 20);
    expect(tester.getRect(clip).right, 370);
    expect(
      tester.widget<ClipRRect>(clip).borderRadius,
      isNot(BorderRadius.zero),
    );
  });

  testWidgets('contained loading rows preserve the rounded perimeter', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        CatchSection.containedLoadingRows(
          title: 'Members',
          layouts: const [
            CatchPersonLayout.placeholder(),
            CatchPersonLayout.placeholder(),
          ],
        ),
      ),
    );
    await tester.pump();
    final clip = find.byKey(CatchSectionSurface.rowGroupClipKey);
    expect(clip, findsOneWidget);
    expect(tester.getRect(clip).left, 20);
    expect(tester.getRect(clip).right, 370);
    expect(
      tester.widget<ClipRRect>(clip).borderRadius,
      isNot(BorderRadius.zero),
    );
    expect(find.byType(CatchSkeleton), findsNWidgets(2));
    expect(find.bySemanticsLabel('Loading person'), findsNothing);
  });

  testWidgets('Field keeps secondary targets separate and disables both', (
    tester,
  ) async {
    var opened = 0;
    var details = 0;
    Widget screen({bool disabled = false}) => host(
      CatchSection.rows(
        children: [
          CatchField.navigate(
            content: CatchRecordLayout(
              title: 'One event',
              icon: CatchIcons.event,
            ),
            onActivate: () => opened++,
            states: {if (disabled) WidgetState.disabled},
            secondaryAction: CatchFieldSecondaryAction.command(
              label: 'Event details',
              icon: CatchIcons.info,
              onActivate: () => details++,
            ),
          ),
        ],
      ),
    );
    await tester.pumpWidget(screen());
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Event details'));
    await tester.pumpAndSettle();
    expect(details, 1);
    expect(opened, 0);
    final bounds = tester.getRect(find.byType(CatchField));
    await tester.tapAt(Offset(1, bounds.center.dy));
    await tester.pumpAndSettle();
    expect(opened, 1);
    await tester.pumpWidget(screen(disabled: true));
    await tester.pumpAndSettle();
    await tester.tapAt(Offset(1, bounds.center.dy));
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await tester.pumpAndSettle();
    expect(opened, 1);
    expect(details, 1);
  });

  testWidgets('sliver rows build only the visible collection window', (
    tester,
  ) async {
    final built = <int>{};
    await tester.pumpWidget(
      host(
        CustomScrollView(
          slivers: [
            CatchSection.sliverRows(
              title: 'May 2026',
              itemCount: 1000,
              itemBuilder: (context, index) {
                built.add(index);
                return record('event-$index', () {});
              },
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(built.length, lessThan(30));
    expect(built, contains(0));
    expect(built, isNot(contains(999)));
  });

  testWidgets('collection controls keep both content-width boundaries', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        CatchSection.controls(
          sortLabel: 'Sort: Last seen',
          onSort: () {},
          filtersLabel: 'Filters',
          onFilters: () {},
        ),
      ),
    );
    final rules = find.byType(CatchDivider);
    expect(rules, findsNWidgets(2));
    final upper = tester.getRect(rules.first);
    final lower = tester.getRect(rules.last);
    expect(upper.left, 20);
    expect(upper.right, 370);
    expect(lower.left, upper.left);
    expect(lower.right, upper.right);
    expect(upper.bottom, lessThan(tester.getRect(find.text('Filters')).top));
    expect(lower.top, greaterThan(tester.getRect(find.text('Filters')).bottom));
  });

  for (final scale in [1.0, 2.0]) {
    for (final direction in TextDirection.values) {
      testWidgets(
        'collection controls own roles and wrap at $scale $direction',
        (tester) async {
          var sorts = 0;
          var filters = 0;
          var clears = 0;
          await tester.pumpWidget(
            host(
              MediaQuery(
                data: MediaQueryData(textScaler: TextScaler.linear(scale)),
                child: CatchSection.controls(
                  sortLabel: 'Sort: Recently checked',
                  onSort: () => sorts++,
                  filtersLabel: 'Filters',
                  onFilters: () => filters++,
                  activeFilters: 'Automatic groups',
                  clearLabel: 'Clear',
                  onClear: () => clears++,
                ),
              ),
              direction: direction,
            ),
          );
          final sort = tester.getRect(find.text('Sort: Recently checked'));
          final filter = tester.getRect(find.text('Filters'));
          if ((sort.center.dy - filter.center.dy).abs() < 10) {
            expect(
              direction == TextDirection.ltr
                  ? sort.right <= filter.left
                  : filter.right <= sort.left,
              isTrue,
            );
          } else {
            expect(sort.top, lessThan(filter.top));
          }
          await tester.tap(find.text('Sort: Recently checked'));
          await tester.tap(find.text('Filters'));
          await tester.tap(find.text('Clear'));
          expect([sorts, filters, clears], [1, 1, 1]);
          expect(find.byType(CatchDivider), findsNWidgets(2));
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets('loading rows reuse field and section geometry', (tester) async {
    Widget screen({required bool loading}) => host(
      CustomScrollView(
        slivers: [
          if (loading)
            CatchSection.sliverLoadingRows(
              title: 'People',
              itemCount: 2,
              layoutBuilder: (_, _) =>
                  const CatchPersonLayout.placeholder(hasSupportingText: true),
            )
          else
            CatchSection.sliverRows(
              title: 'People',
              itemCount: 2,
              itemBuilder: (_, index) => CatchField.navigate(
                content: CatchPersonLayout(
                  name: 'Person $index',
                  supportingText: 'One event',
                ),
                onActivate: () {},
              ),
            ),
        ],
      ),
    );
    await tester.pumpWidget(screen(loading: false));
    await tester.pumpAndSettle();
    final loaded = tester.getRect(find.byType(CatchField).first);
    final loadedHeaderRule = tester.getRect(find.byType(CatchDivider).first);
    final loadedRule = tester.getRect(find.byType(CatchDivider).last);
    await tester.pumpWidget(screen(loading: true));
    await tester.pump(const Duration(milliseconds: 50));
    final placeholder = tester.getRect(find.byType(CatchField).first);
    final placeholderHeaderRule = tester.getRect(
      find.byType(CatchDivider).first,
    );
    final placeholderRule = tester.getRect(find.byType(CatchDivider).last);
    expect(placeholder.left, loaded.left);
    expect(placeholder.right, loaded.right);
    expect(placeholderRule.left, loadedRule.left);
    expect(placeholderRule.right, loadedRule.right);
    expect(placeholderHeaderRule.left, loadedHeaderRule.left);
    expect(placeholderHeaderRule.right, loadedHeaderRule.right);
    expect(find.byType(CatchSurface), findsNothing);
    expect(find.byType(CatchSkeleton), findsNWidgets(2));
    expect(find.bySemanticsLabel('Loading person'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('box loading rows derive record slots through the Field', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        CatchSection.loadingRows(
          layouts: [
            CatchRecordLayout.placeholder(icon: CatchIcons.event, factCount: 2),
          ],
        ),
      ),
    );
    expect(find.byType(CatchField), findsOneWidget);
    expect(find.byType(CatchSkeleton), findsOneWidget);
    expect(find.bySemanticsLabel('Loading record'), findsNothing);
    expect(tester.getRect(find.byType(CatchField)).width, 390);
    expect(tester.takeException(), isNull);
  });

  testWidgets('record and person text stays readable at 2x', (tester) async {
    await tester.pumpWidget(
      host(
        MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2)),
          child: SingleChildScrollView(
            child: CatchSection.rows(
              children: [
                record(
                  'A complete event title that wraps across several lines',
                  () {},
                ),
                const CatchField.read(
                  content: CatchPersonLayout(
                    name: 'A person whose complete name must remain readable',
                    supportingText:
                        'A complete relationship summary and last seen date',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    for (final element in find.byType(RichText).evaluate()) {
      expect(
        (element.renderObject! as RenderParagraph).didExceedMaxLines,
        isFalse,
      );
    }
    expect(tester.takeException(), isNull);
  });
  testWidgets('outer padding cannot silently shrink a full-bleed section', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.dark,
        home: CatchScaffold.standalone(
          body: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: CatchSection.rows(children: [record('inset', () {})]),
          ),
        ),
      ),
    );
    expect(
      tester.takeException().toString(),
      contains('must fill its page or pane'),
    );
  });

  testWidgets(
    'master and detail rows fill their own pane, including hit gutters',
    (tester) async {
      tester.view.physicalSize = const Size(1200, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var leftTaps = 0;
      var rightTaps = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.dark,
          home: CatchScaffold.standalone(
            body: CatchNavigationViewport(
              panes: [
                CatchWorkspacePane(
                  id: 'left',
                  child: CatchSection.rows(
                    children: [record('left', () => leftTaps++)],
                  ),
                ),
                CatchWorkspacePane(
                  id: 'right',
                  child: CatchSection.rows(
                    children: [record('right', () => rightTaps++)],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      final left = tester.getRect(find.byKey(const ValueKey('left')));
      final right = tester.getRect(find.byKey(const ValueKey('right')));
      expect(left.left, 0);
      expect(left.right, CatchLayout.workspaceDirectoryWidth);
      expect(
        right.right,
        tester.view.physicalSize.width / tester.view.devicePixelRatio,
      );
      await tester.tapAt(Offset(left.left + 1, left.center.dy));
      await tester.tapAt(
        Offset(right.right - CatchSpacing.s3 - 1, right.center.dy),
      );
      expect(leftTaps, 1);
      expect(rightTaps, 1);
      expect(tester.takeException(), isNull);
    },
  );

  test('typed read layout rejects mixed legacy slots', () {
    expect(
      () => CatchField.read(
        content: const CatchPersonLayout(name: 'Person'),
        title: 'Duplicate',
      ),
      throwsAssertionError,
    );
  });
}
