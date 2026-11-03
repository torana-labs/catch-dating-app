import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

/// Records the scope and inherited paint wherever it sits.
class _Probe extends StatelessWidget {
  const _Probe(this.seen);

  final List<({CatchScope scope, Color? ink, Color? icon, TextStyle text})>
  seen;

  @override
  Widget build(BuildContext context) {
    seen.add((
      scope: CatchScope.of(context),
      ink: DefaultTextStyle.of(context).style.color,
      icon: IconTheme.of(context).color,
      text: DefaultTextStyle.of(context).style,
    ));
    return const SizedBox(width: 10, height: 10);
  }
}

Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  double width = 400,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(1200, 1000);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      home: Center(
        child: SizedBox(width: width, height: 800, child: child),
      ),
    ),
  );
}

void main() {
  group('CatchRoot', () {
    testWidgets('follows the phone when no theme is given', (tester) async {
      final seen =
          <({CatchScope scope, Color? ink, Color? icon, TextStyle text})>[];
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      await _pump(tester, CatchRoot(child: _Probe(seen)));
      expect(seen.last.scope.theme, CatchThemeMode.night);
      expect(seen.last.scope.ground, CatchGround.night);
      expect(seen.last.ink, CatchTokens.dark.ink);

      tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
      await _pump(tester, CatchRoot(child: _Probe(seen)));
      expect(seen.last.scope.theme, CatchThemeMode.day);
      expect(seen.last.scope.ground, CatchGround.ground);
      expect(seen.last.ink, CatchTokens.light.ink);
      expect(seen.last.icon, CatchTokens.light.ink);
      expect(
        seen.last.text.fontSize,
        GeneratedCatchTypeRoleTokens.body.fontSize,
      );

      await _pump(
        tester,
        CatchRoot(theme: CatchThemeMode.night, child: _Probe(seen)),
      );
      expect(seen.last.scope.theme, CatchThemeMode.night);
    });

    testWidgets('measures its own width unless a size is given', (
      tester,
    ) async {
      final seen =
          <({CatchScope scope, Color? ink, Color? icon, TextStyle text})>[];
      for (final (width, expected) in [
        (599.0, CatchWindowSize.compact),
        (600.0, CatchWindowSize.medium),
        (839.0, CatchWindowSize.medium),
        (840.0, CatchWindowSize.expanded),
      ]) {
        await _pump(tester, CatchRoot(child: _Probe(seen)), width: width);
        expect(seen.last.scope.sizeClass, expected, reason: '$width');
      }
      await _pump(
        tester,
        CatchRoot(size: CatchWindowSize.expanded, child: _Probe(seen)),
      );
      expect(seen.last.scope.sizeClass, CatchWindowSize.expanded);
    });

    testWidgets('publishes format, register and reduced motion', (
      tester,
    ) async {
      final seen =
          <({CatchScope scope, Color? ink, Color? icon, TextStyle text})>[];
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(disableAnimations: true),
            child: CatchRoot(
              format: CatchFormat.games,
              register: CatchRegister.quiet,
              child: _Probe(seen),
            ),
          ),
        ),
      );
      expect(seen.last.scope.format, CatchFormat.games);
      expect(seen.last.scope.register, CatchRegister.quiet);
      expect(seen.last.scope.reducedMotion, isTrue);
      expect(
        CatchTokens.of(tester.element(find.byType(_Probe))),
        CatchTokens.light,
      );
    });

    testWidgets('CatchScope.maybeOf is null outside a root', (tester) async {
      CatchScope? found;
      var built = false;
      await tester.pumpWidget(
        Builder(
          builder: (context) {
            found = CatchScope.maybeOf(context);
            built = true;
            return const SizedBox();
          },
        ),
      );
      expect(built, isTrue);
      expect(found, isNull);
    });
  });

  group('CatchSurface', () {
    Future<List<CatchScope>> grounds(
      WidgetTester tester,
      Widget Function(Widget probe) build, {
      CatchThemeMode theme = CatchThemeMode.day,
    }) async {
      final seen =
          <({CatchScope scope, Color? ink, Color? icon, TextStyle text})>[];
      await _pump(tester, CatchRoot(theme: theme, child: build(_Probe(seen))));
      return [for (final entry in seen) entry.scope];
    }

    testWidgets('hands its children the ground the system gives them', (
      tester,
    ) async {
      Future<CatchScope> under(
        Widget Function(Widget) build, {
        CatchThemeMode theme = CatchThemeMode.day,
      }) async => (await grounds(tester, build, theme: theme)).last;

      expect(
        (await under(
          (p) => CatchSurface(block: CatchSurfaceBlock.plain, child: p),
        )).ground,
        CatchGround.ground,
      );
      expect(
        (await under((p) => CatchSurface(child: p))).ground,
        CatchGround.tile,
      );
      expect(
        (await under(
          (p) => CatchSurface(child: CatchSurface(child: p)),
        )).ground,
        CatchGround.nested,
      );
      expect(
        (await under(
          (p) => CatchSurface(child: p),
          theme: CatchThemeMode.night,
        )).ground,
        CatchGround.nightTile,
      );
      expect(
        (await under(
          (p) => CatchSurface(child: CatchSurface(child: p)),
          theme: CatchThemeMode.night,
        )).ground,
        CatchGround.night,
      );
      final spotlight = await under(
        (p) => CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.dinner,
          child: p,
        ),
      );
      expect(
        (spotlight.ground, spotlight.format, spotlight.theme),
        (CatchGround.colour, CatchFormat.dinner, CatchThemeMode.day),
      );
      final ink = await under(
        (p) => CatchSurface(block: CatchSurfaceBlock.spotlight, child: p),
      );
      expect(
        (ink.ground, ink.theme),
        (CatchGround.night, CatchThemeMode.night),
      );
      expect(
        (await under(
          (p) => CatchSurface(block: CatchSurfaceBlock.floating, child: p),
        )).ground,
        CatchGround.ground,
      );
      expect(
        (await under(
          (p) => CatchSurface(block: CatchSurfaceBlock.floating, child: p),
          theme: CatchThemeMode.night,
        )).ground,
        CatchGround.nightTile,
      );
      expect(
        (await under(
          (p) => CatchSurface(
            block: CatchSurfaceBlock.band,
            color: CatchSurfaceColor.tile,
            child: p,
          ),
        )).ground,
        CatchGround.tile,
      );
      final band = await under(
        (p) => CatchSurface(
          block: CatchSurfaceBlock.band,
          color: CatchSurfaceColor.ink,
          child: p,
        ),
      );
      expect(
        (band.ground, band.theme),
        (CatchGround.night, CatchThemeMode.night),
      );
    });

    testWidgets('paints each block with its token and radius', (tester) async {
      BoxDecoration paintOf(Finder surface) =>
          tester
                  .widget<DecoratedBox>(
                    find
                        .descendant(
                          of: surface,
                          matching: find.byType(DecoratedBox),
                        )
                        .first,
                  )
                  .decoration
              as BoxDecoration;

      await _pump(
        tester,
        const CatchRoot(
          theme: CatchThemeMode.day,
          child: Column(
            children: [
              CatchSurface(key: ValueKey('tile'), child: SizedBox(height: 10)),
              CatchSurface(
                key: ValueKey('outer'),
                child: CatchSurface(
                  key: ValueKey('nested'),
                  child: SizedBox(height: 10),
                ),
              ),
              CatchSurface(
                key: ValueKey('run'),
                block: CatchSurfaceBlock.spotlight,
                color: CatchSurfaceColor.run,
                child: CatchSurface(
                  key: ValueKey('on-colour'),
                  child: SizedBox(height: 10),
                ),
              ),
              CatchSurface(
                key: ValueKey('ink'),
                block: CatchSurfaceBlock.spotlight,
                child: SizedBox(height: 10),
              ),
              CatchSurface(
                key: ValueKey('floating'),
                block: CatchSurfaceBlock.floating,
                child: SizedBox(height: 10),
              ),
            ],
          ),
        ),
      );
      final tile = paintOf(find.byKey(const ValueKey('tile')));
      expect(
        (tile.color, tile.borderRadius),
        (CatchTokens.light.tile, BorderRadius.circular(CatchRadius.lg)),
      );
      final nested = paintOf(find.byKey(const ValueKey('nested')));
      expect(
        (nested.color, nested.borderRadius),
        (CatchTokens.light.nested, BorderRadius.circular(CatchRadius.md)),
      );
      expect(
        paintOf(find.byKey(const ValueKey('run'))).color,
        CatchFormat.run.accent,
      );
      expect(
        paintOf(find.byKey(const ValueKey('on-colour'))).color,
        CatchTokens.editorialWhite.withValues(
          alpha: GeneratedCatchOpacityTokens.onColour,
        ),
      );
      final ink = paintOf(find.byKey(const ValueKey('ink')));
      expect(
        (ink.color, ink.borderRadius),
        (CatchTokens.light.ink, BorderRadius.circular(CatchRadius.xl)),
      );
      final floating = paintOf(find.byKey(const ValueKey('floating')));
      expect(
        (floating.color, floating.boxShadow),
        (CatchTokens.light.ground, CatchElevation.float(Brightness.light)),
      );
    });

    testWidgets(
      'pads by block, holds an aspect and presses as a labelled button',
      (tester) async {
        var pressed = 0;
        await _pump(
          tester,
          CatchRoot(
            theme: CatchThemeMode.day,
            child: Column(
              children: [
                const CatchSurface(
                  key: ValueKey('md'),
                  child: SizedBox(key: ValueKey('md-child'), height: 10),
                ),
                const CatchSurface(
                  key: ValueKey('lg'),
                  block: CatchSurfaceBlock.spotlight,
                  child: SizedBox(key: ValueKey('lg-child'), height: 10),
                ),
                const SizedBox(
                  width: 200,
                  child: CatchSurface(
                    key: ValueKey('aspect'),
                    aspect: 2,
                    child: SizedBox(key: ValueKey('aspect-child'), height: 10),
                  ),
                ),
                CatchSurface(
                  key: const ValueKey('press'),
                  onPress: () => pressed += 1,
                  semanticLabel: 'Open event',
                  child: const SizedBox(height: 10),
                ),
              ],
            ),
          ),
        );
        double inset(String key) =>
            tester.getTopLeft(find.byKey(ValueKey('$key-child'))).dy -
            tester.getTopLeft(find.byKey(ValueKey(key))).dy;
        expect(inset('md'), CatchSurfacePadding.md.extent);
        expect(inset('lg'), CatchSurfacePadding.lg.extent);
        expect(
          tester.getSize(find.byKey(const ValueKey('aspect'))),
          const Size(200, 100),
        );
        expect(
          tester.getBottomLeft(find.byKey(const ValueKey('aspect-child'))).dy,
          tester.getBottomLeft(find.byKey(const ValueKey('aspect'))).dy -
              CatchSurfacePadding.md.extent,
        );
        await tester.tap(find.byKey(const ValueKey('press')));
        expect(pressed, 1);
        expect(find.bySemanticsLabel('Open event'), findsOneWidget);
      },
    );
  });

  group('CatchText', () {
    testWidgets('draws its role, follows the size class and takes tones', (
      tester,
    ) async {
      await _pump(
        tester,
        const CatchRoot(
          theme: CatchThemeMode.day,
          size: CatchWindowSize.expanded,
          child: Column(
            children: [
              CatchText(
                'Page',
                key: ValueKey('page'),
                variant: CatchTextVariant.pageTitle,
              ),
              CatchText(
                'Hero',
                key: ValueKey('hero'),
                variant: CatchTextVariant.hero,
              ),
              CatchText('Body', key: ValueKey('body')),
              CatchText(
                'Info',
                key: ValueKey('info'),
                variant: CatchTextVariant.labelKicker,
                tone: CatchTextTone.info,
              ),
              CatchText(
                '1,111',
                key: ValueKey('numeric'),
                numeric: true,
                maxLines: 1,
              ),
            ],
          ),
        ),
      );
      TextStyle styleOf(String key) => tester
          .widget<RichText>(
            find.descendant(
              of: find.byKey(ValueKey(key)),
              matching: find.byType(RichText),
            ),
          )
          .text
          .style!;
      expect(
        styleOf('page').fontSize,
        GeneratedCatchTypeVariantTokens.pageTitleExpanded.fontSize,
      );
      expect(styleOf('page').fontFamily, contains('Archivo'));
      expect(
        styleOf('hero').fontSize,
        GeneratedCatchTypeVariantTokens.heroExpanded.fontSize,
      );
      expect(
        styleOf('body').fontSize,
        GeneratedCatchTypeRoleTokens.body.fontSize,
      );
      expect(styleOf('body').color, CatchTokens.light.ink);
      expect(styleOf('info').color, CatchTokens.light.deepIndigo);
      expect(
        styleOf('numeric').fontFeatures,
        contains(const FontFeature.tabularFigures()),
      );
      expect(
        tester
            .widget<RichText>(
              find.descendant(
                of: find.byKey(const ValueKey('numeric')),
                matching: find.byType(RichText),
              ),
            )
            .maxLines,
        1,
      );
    });

    test('offers the 22 roles in order and the eight tones', () {
      expect(CatchTextVariant.values.map((variant) => variant.name), [
        'displayHero',
        'displayXl',
        'displayLg',
        'displayTitle',
        'displaySection',
        'displaySm',
        'displayXs',
        'bodyLead',
        'bodyInput',
        'body',
        'bodySmall',
        'bodyMeta',
        'titleBar',
        'titleRow',
        'labelButton',
        'labelAction',
        'labelKicker',
        'labelBadge',
        'labelCode',
        'pageTitle',
        'sectionTitle',
        'hero',
      ]);
      expect(CatchTextTone.values.map((tone) => tone.name), [
        'inherit',
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'danger',
        'info',
      ]);
      expect(CatchTextVariant.values.where((variant) => variant.isResponsive), [
        CatchTextVariant.pageTitle,
        CatchTextVariant.sectionTitle,
        CatchTextVariant.hero,
      ]);
    });
  });

  group('CatchIcon', () {
    testWidgets('inherits its colour and is decorative unless labelled', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await _pump(
        tester,
        CatchRoot(
          theme: CatchThemeMode.day,
          child: CatchSurface(
            block: CatchSurfaceBlock.spotlight,
            child: Column(
              children: [
                CatchIcon(CatchIcons.search, key: const ValueKey('plain')),
                CatchIcon(
                  CatchIcons.back,
                  key: const ValueKey('labelled'),
                  size: CatchIconSize.lg,
                  label: 'Back',
                ),
              ],
            ),
          ),
        ),
      );
      final plain = tester.widget<Icon>(
        find.descendant(
          of: find.byKey(const ValueKey('plain')),
          matching: find.byType(Icon),
        ),
      );
      expect(plain.size, CatchIconSize.control);
      expect(
        IconTheme.of(tester.element(find.byType(Icon).first)).color,
        CatchTokens.dark.ink,
      );
      expect(find.bySemanticsLabel('Back'), findsOneWidget);
      expect(
        tester.getSemantics(find.byKey(const ValueKey('labelled'))),
        containsSemantics(label: 'Back', isImage: true),
      );
      handle.dispose();
    });

    test('asserts the four sizes', () {
      expect(
        () => CatchIcon(CatchIcons.search, size: 22),
        throwsAssertionError,
      );
    });
  });

  group('CatchStack', () {
    test('resolves its gaps from the spacing tokens', () {
      expect(
        [
          for (final gap in CatchStackGap.values)
            gap.resolve(CatchWindowSize.compact),
        ],
        [0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 28],
      );
      expect(CatchStackGap.section.resolve(CatchWindowSize.medium), 40);
      expect(CatchStackGap.section.resolve(CatchWindowSize.expanded), 40);
    });

    testWidgets('a row collapses below its size class and an unset column '
        'fills its width', (tester) async {
      Future<void> pumpAt(double width) => _pump(
        tester,
        const CatchRoot(
          theme: CatchThemeMode.day,
          child: CatchStack(
            children: [
              CatchStack(
                key: ValueKey('row'),
                direction: CatchStackDirection.row,
                equal: true,
                collapseBelow: CatchWindowSize.medium,
                gap: CatchStackGap.g16,
                children: [
                  SizedBox(key: ValueKey('a'), height: 10),
                  SizedBox(key: ValueKey('b'), height: 10),
                ],
              ),
              SizedBox(key: ValueKey('filled'), height: 10),
            ],
          ),
        ),
        width: width,
      );
      await pumpAt(599);
      expect(
        tester.getTopLeft(find.byKey(const ValueKey('b'))).dy,
        tester.getBottomLeft(find.byKey(const ValueKey('a'))).dy + 16,
      );
      expect(tester.getSize(find.byKey(const ValueKey('filled'))).width, 599);
      await pumpAt(600);
      expect(
        tester.getTopLeft(find.byKey(const ValueKey('b'))).dy,
        tester.getTopLeft(find.byKey(const ValueKey('a'))).dy,
      );
      expect(
        tester.getSize(find.byKey(const ValueKey('a'))).width,
        (600 - 16) / 2,
      );
    });

    testWidgets('an unset column inside a row keeps its own width', (
      tester,
    ) async {
      await _pump(
        tester,
        const Row(
          children: [
            CatchStack(
              children: [
                SizedBox(key: ValueKey('cell'), width: 40, height: 10),
              ],
            ),
          ],
        ),
      );
      expect(tester.getSize(find.byKey(const ValueKey('cell'))).width, 40);
      expect(tester.takeException(), isNull);
    });
  });
}
