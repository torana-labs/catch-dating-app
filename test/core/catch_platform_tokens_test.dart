import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final platform in [TargetPlatform.iOS, TargetPlatform.android]) {
    testWidgets('native metrics and font family share the $platform target', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = platform;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      final expected = platform == TargetPlatform.iOS
          ? GeneratedCatchTypographyTokens.ios
          : GeneratedCatchTypographyTokens.android;
      expect(identical(CatchPlatformTokens.typography, expected), isTrue);
      late TextStyle name;
      late TextStyle field;
      await tester.pumpWidget(
        MaterialApp(
          // A theme override must not accidentally select different metrics from
          // the font family selected for the binary.
          theme: AppTheme.light.copyWith(
            platform: platform == TargetPlatform.iOS
                ? TargetPlatform.android
                : TargetPlatform.iOS,
          ),
          home: Builder(
            builder: (context) {
              name = CatchTextStyles.sectionTitle(context);
              field = CatchTextStyles.fieldRowTitle(context);
              return const SizedBox.shrink();
            },
          ),
        ),
      );
      expect(
        name.fontFamily,
        platform == TargetPlatform.iOS ? 'CupertinoSystemText' : 'Roboto',
      );
      expect(name.height, expected.name.height);
      expect(CatchFieldTokens.valueLineExtent, field.fontSize! * field.height!);
      expect(
        CatchFieldTokens.captionExtent,
        expected.fieldLabel.fontSize! * expected.fieldLabel.height!,
      );
      debugDefaultTargetPlatformOverride = null;
    });

    for (final identity in [false, true]) {
      testWidgets(
        '${identity ? 'identity' : 'route'} header reserves its scaled '
        'title lane with a divider at 2x $platform',
        (tester) async {
          debugDefaultTargetPlatformOverride = platform;
          addTearDown(() => debugDefaultTargetPlatformOverride = null);
          await tester.pumpWidget(
            MaterialApp(
              theme: AppTheme.light,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: const TextScaler.linear(2)),
                child: child!,
              ),
              home: Align(
                alignment: Alignment.topLeft,
                child: SizedBox(
                  width: 360,
                  child: CatchScaffold.workspace(
                    title: identity
                        ? const CatchTopBar.identity(
                            identityName: 'Ananya Rao',
                            identitySemanticLabel: 'Ananya Rao',
                            emphasis: CatchTopBarEmphasis.divided,
                            navigation: CatchTopBarNavigation(
                              mode: CatchTopBarNavigationMode.none,
                            ),
                          )
                        : const CatchTopBar.route(
                            title: 'Ananya Rao',
                            emphasis: CatchTopBarEmphasis.divided,
                            navigation: CatchTopBarNavigation(
                              mode: CatchTopBarNavigationMode.none,
                            ),
                          ),
                    body: const SizedBox.expand(
                      key: ValueKey('scaled-header-content'),
                    ),
                  ),
                ),
              ),
            ),
          );
          expect(tester.takeException(), isNull);
          final header = tester.getRect(find.byType(CatchTopBar));
          final title = tester.getRect(find.text('Ananya Rao'));
          expect(header.width, 360);
          expect(header.height, greaterThan(CatchLayout.topBarHeight));
          expect(title.top, greaterThanOrEqualTo(header.top));
          expect(title.bottom, lessThanOrEqualTo(header.bottom));
          expect(
            tester
                .getRect(find.byKey(const ValueKey('scaled-header-content')))
                .top,
            header.bottom,
          );
          debugDefaultTargetPlatformOverride = null;
        },
      );
    }

    testWidgets('scaled tab rail reserves its actual height on $platform', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = platform;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(2)),
            child: child!,
          ),
          home: const CatchScaffold.workspace(
            title: CatchTopBar.route(
              title: 'Customers',
              footer: CatchPageTabBar<int>(
                selected: 0,
                options: [
                  CatchOption(value: 0, label: 'Overview'),
                  CatchOption(value: 1, label: 'History'),
                ],
              ),
            ),
            body: SizedBox.expand(key: ValueKey('scaled-header-body')),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      final rail = find.byType(CatchPageTabBar<int>);
      expect(
        tester.getSize(rail).height,
        CatchPageTabBar.heightFor(tester.element(rail)),
      );
      expect(
        tester.getRect(rail).bottom,
        tester.getRect(find.byKey(const ValueKey('scaled-header-body'))).top,
      );
      debugDefaultTargetPlatformOverride = null;
    });

    for (final direction in TextDirection.values) {
      testWidgets(
        'directory and controls stay readable at 2x $platform $direction',
        (tester) async {
          debugDefaultTargetPlatformOverride = platform;
          addTearDown(() => debugDefaultTargetPlatformOverride = null);
          var selected = false;
          var commanded = false;
          var opened = false;
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
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            CatchField.navigate(
                              onActivate: () => opened = true,
                              content: const CatchPersonLayout(
                                name: 'Ananya Rao with a longer family name',
                                supportingText:
                                    '8 events · Last seen 18 June 2026',
                                context:
                                    'Returning customer from the weekend event',
                                badges: [
                                  CatchRowBadge(
                                    label: 'Needs identity review',
                                    tone: CatchBadgeTone.warning,
                                  ),
                                ],
                              ),
                            ),
                            Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: CatchChoiceInput<int>.segmented(
                                options: const [
                                  CatchOption(value: 1, label: 'Returning 148'),
                                ],
                                selected: 1,
                                variant: CatchChoiceInputVariant.summary,
                                onChanged: (_) => selected = true,
                              ),
                            ),
                            CatchButton.command(
                              label: 'Sort: Most recently attended',
                              onPressed: () => commanded = true,
                            ),
                            const CatchFieldSupportRow(
                              color: Colors.black,
                              text:
                                  'A complete explanation including its final sentence must remain visible.',
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
              reason: (element.widget as RichText).text.toPlainText(),
            );
          }
          expect(
            tester.getTopLeft(find.text('Needs identity review')).dy,
            greaterThan(
              tester
                  .getBottomLeft(
                    find.text('Returning customer from the weekend event'),
                  )
                  .dy,
            ),
          );
          expect(
            tester.getSize(find.byType(CatchButton)).height,
            greaterThanOrEqualTo(CatchPlatformTokens.minimumInteractiveExtent),
          );
          expect(
            tester.getSize(find.byType(CatchChoiceButton<int>)).height,
            greaterThanOrEqualTo(CatchPlatformTokens.minimumInteractiveExtent),
          );
          await tester.tap(find.text('Ananya Rao with a longer family name'));
          expect(opened, isTrue);
          await tester.ensureVisible(find.text('Returning 148'));
          await tester.tap(find.text('Returning 148'));
          expect(selected, isTrue);
          await tester.ensureVisible(find.text('Sort: Most recently attended'));
          await tester.tap(find.text('Sort: Most recently attended'));
          expect(commanded, isTrue);
          expect(tester.takeException(), isNull);
          debugDefaultTargetPlatformOverride = null;
        },
      );
    }
  }

  testWidgets('unselected summary scope supports keyboard selection', (
    tester,
  ) async {
    var chosen = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CatchChoiceInput<int>.segmented(
            options: const [
              CatchOption(value: 1, label: 'All 214'),
              CatchOption(value: 2, label: 'Returning 148'),
            ],
            selected: null,
            variant: CatchChoiceInputVariant.summary,
            onChanged: (_) => chosen = true,
          ),
        ),
      ),
    );
    expect(
      tester
          .widgetList<CatchChoiceButton<int>>(
            find.byType(CatchChoiceButton<int>),
          )
          .every((option) => !option.selected),
      isTrue,
    );
    expect(tester.takeException(), isNull);
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    expect(chosen, isTrue);
  });
}
