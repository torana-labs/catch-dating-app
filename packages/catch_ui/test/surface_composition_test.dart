import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> mount(
    WidgetTester tester,
    Widget child, {
    bool dark = false,
    double scale = 1,
  }) async {
    tester.view.physicalSize = const Size(320, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: dark ? CatchTheme.dark : CatchTheme.light,
        home: Scaffold(
          body: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(scale)),
            child: SingleChildScrollView(
              child: Padding(padding: const EdgeInsets.all(20), child: child),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
  }

  void readable(WidgetTester tester) {
    expect(tester.takeException(), isNull);
    for (final paragraph in tester.renderObjectList<RenderParagraph>(
      find.byType(RichText),
    )) {
      expect(
        paragraph.didExceedMaxLines,
        isFalse,
        reason: paragraph.text.toPlainText(),
      );
    }
  }

  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'inline empty body uses the full lane, dark=$dark scale=$scale',
        (tester) async {
          await mount(
            tester,
            CatchEmptyState(
              icon: CatchIcons.insights,
              title: 'Waiting for attendee feedback',
              message:
                  'The report appears once attendees share feedback. There is no signal to summarize yet.',
              variant: CatchEmptyStateVariant.inline,
              padding: EdgeInsets.zero,
            ),
            dark: dark,
            scale: scale,
          );
          final bounds = tester.getRect(find.byType(CatchEmptyState));
          final body = tester.getRect(
            find.textContaining('The report appears'),
          );
          final title = tester.getRect(
            find.text('Waiting for attendee feedback'),
          );
          expect(body.left, bounds.left);
          expect(body.width, bounds.width);
          expect(body.top, greaterThan(title.bottom));
          expect(find.byType(CatchSurface), findsNothing);
          readable(tester);
        },
      );

      testWidgets(
        'all feedback tones preserve anatomy and wrap actions, dark=$dark scale=$scale',
        (tester) async {
          Size? firstSize;
          for (final tone in CatchBannerTone.values) {
            await mount(
              tester,
              CatchBanner(
                tone: tone,
                title: 'A useful status heading',
                message:
                    'Long feedback stays readable without reserving an icon column down the entire paragraph.',
                actions: [
                  CatchButton.text(
                    label: 'Review the latest details',
                    onPressed: () {},
                  ),
                ],
              ),
              dark: dark,
              scale: scale,
            );
            final size = tester.getSize(find.byType(CatchBanner));
            firstSize ??= size;
            expect(size, firstSize);
            final body = tester.getRect(find.textContaining('Long feedback'));
            final surface = tester.getRect(find.byType(CatchSurface));
            expect(body.left - surface.left, CatchSpacing.s4);
            expect(surface.right - body.right, CatchSpacing.s4);
            expect(
              tester.getRect(find.byType(CatchButton)).top,
              greaterThan(body.bottom),
            );
            final primitive = tester.widget<CatchSurface>(
              find.byType(CatchSurface),
            );
            expect(primitive.emphasis, CatchSurfaceEmphasis.flat);
            expect(primitive.borderRole, isNull);
            expect(primitive.borderSpec, isNull);
            readable(tester);
          }
        },
      );

      testWidgets(
        'action roles share geometry, facts order and full-width action, dark=$dark scale=$scale',
        (tester) async {
          Size? firstSize;
          for (final emphasis in CatchSectionEmphasis.values) {
            var calls = 0;
            await mount(
              tester,
              CatchSection.action(
                title: 'Public visibility',
                message:
                    'Only your Host team can access this organizer. You can still run events and check people in.',
                meta: const Text('Catch app: hidden'),
                icon: CatchIcons.people,
                actionLabel: 'Review visibility',
                actionEmphasis: emphasis,
                onAction: () => calls++,
              ),
              dark: dark,
              scale: scale,
            );
            final size = tester.getSize(find.byType(CatchSurface));
            firstSize ??= size;
            expect(size, firstSize);
            final facts = tester.getRect(find.text('Catch app: hidden'));
            final body = tester.getRect(
              find.textContaining('Only your Host team'),
            );
            final title = tester.getRect(find.text('Public visibility'));
            final button = tester.getRect(find.byType(CatchButton));
            expect(facts.top, greaterThan(title.bottom));
            expect(body.top, greaterThan(facts.bottom));
            expect(button.top, greaterThan(body.bottom));
            expect(body.left, facts.left);
            expect(button.width, body.width);
            final surface = tester.widget<CatchSurface>(
              find.byType(CatchSurface),
            );
            expect(surface.tone, CatchSurfaceTone.primarySoft);
            expect(surface.emphasis, CatchSurfaceEmphasis.flat);
            await tester.tap(find.text('Review visibility'));
            expect(calls, 1);
            readable(tester);
          }
        },
      );
    }
  }

  testWidgets('message-only empty copy omits the decorative icon', (
    tester,
  ) async {
    await mount(
      tester,
      CatchEmptyState(
        icon: CatchIcons.insights,
        message: 'No reviews yet.',
        variant: CatchEmptyStateVariant.inline,
        padding: EdgeInsets.zero,
      ),
    );
    expect(find.byType(Icon), findsNothing);
    readable(tester);
  });

  testWidgets('action loading and disabled states cannot invoke action', (
    tester,
  ) async {
    var calls = 0;
    for (final loading in [false, true]) {
      await mount(
        tester,
        CatchSection.action(
          title: 'Save changes',
          message: 'Keep your organizer details current.',
          actionLabel: 'Save',
          onAction: loading ? () => calls++ : null,
          actionStatus: loading
              ? CatchButtonStatus.loading
              : CatchButtonStatus.idle,
        ),
      );
      final button = tester.widget<CatchButton>(find.byType(CatchButton));
      expect(button.fullWidth, isTrue);
      await tester.tap(find.byType(CatchButton), warnIfMissed: false);
      expect(calls, 0);
      readable(tester);
    }
  });

  testWidgets('framed collection keeps semantic focus and error precedence', (
    tester,
  ) async {
    for (final states in <Set<WidgetState>>[
      {},
      {WidgetState.focused},
      {WidgetState.focused, WidgetState.error},
    ]) {
      await mount(
        tester,
        CatchSection.contained(
          states: states,
          child: const Text('Related controls'),
        ),
      );
      final surface = tester.widget<CatchSurface>(find.byType(CatchSurface));
      final context = tester.element(find.byType(CatchSurface));
      final role = states.contains(WidgetState.error)
          ? CatchBorderRole.danger
          : states.contains(WidgetState.focused)
          ? CatchBorderRole.focus
          : CatchBorderRole.boundary;
      expect(
        surface.borderSpec?.side,
        CatchBorder.resolve(CatchTokens.of(context), role).side,
      );
      expect(surface.emphasis, CatchSurfaceEmphasis.flat);
      readable(tester);
    }
  });

  testWidgets('retry keeps intrinsic measurement and live semantics', (
    tester,
  ) async {
    var calls = 0;
    await mount(
      tester,
      IntrinsicHeight(
        child: CatchBanner.errorWithRetry(
          message: 'Unable to load the latest details.',
          retryLabel: 'Try again',
          onRetry: () => calls++,
        ),
      ),
      scale: 2,
    );
    expect(
      find.byWidgetPredicate(
        (widget) => widget is Semantics && widget.properties.liveRegion == true,
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Try again'));
    expect(calls, 1);
    readable(tester);
  });
}
