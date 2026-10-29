import 'package:catch_dating_app/routing/shell/app_shell_active_tab.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('semantic layout tokens map to the intended primitive values', () {
    expect(CatchSpacing.screenPx, 20);
    expect(CatchSpacing.screenPt, 16);
    expect(CatchInsets.pageBody.left, CatchSpacing.screenPx);
    expect(CatchInsets.pageBody.top, CatchSpacing.screenPt);
    expect(CatchInsets.pageBody.right, CatchSpacing.screenPx);
    expect(
      CatchInsets.chatListGutter,
      const EdgeInsets.symmetric(horizontal: CatchSpacing.screenPx),
    );
    expect(CatchGaps.inline, CatchSpacing.s2);
    expect(CatchGaps.related, CatchSpacing.s3);
    expect(CatchGaps.formField, CatchSpacing.s4);
    expect(CatchGaps.section, CatchSpacing.s6);
    expect(CatchGaps.majorSection, CatchSpacing.s8);

    expect(
      CatchInsets.formStepBody,
      const EdgeInsets.fromLTRB(
        CatchSpacing.screenPx,
        CatchSpacing.screenPt,
        CatchSpacing.screenPx,
        CatchSpacing.screenPb,
      ),
    );
    expect(
      CatchInsets.formStepBodyRelaxed,
      const EdgeInsets.fromLTRB(
        CatchSpacing.screenPx,
        CatchSpacing.screenPt,
        CatchSpacing.screenPx,
        CatchSpacing.s8,
      ),
    );
    expect(
      CatchInsets.formStepBodyWithBottomActions.bottom,
      CatchSpacing.s16 + CatchSpacing.s8,
    );
    expect(
      CatchInsets.formStepBodyRelaxedWithBottomActions.bottom,
      CatchSpacing.s16 + CatchSpacing.s12,
    );
    expect(CatchInsets.cardContent, const EdgeInsets.all(CatchSpacing.s4));
    expect(CatchInsets.cardContentDense, const EdgeInsets.all(CatchSpacing.s3));
    expect(CatchInsets.content, const EdgeInsets.all(CatchSpacing.s4));
    expect(CatchInsets.contentDense, const EdgeInsets.all(CatchSpacing.s3));
    expect(
      CatchInsets.pageHorizontal,
      const EdgeInsets.symmetric(horizontal: CatchSpacing.s5),
    );
    expect(
      CatchInsets.pageBodyTight,
      const EdgeInsets.fromLTRB(
        CatchSpacing.s5,
        CatchSpacing.s3,
        CatchSpacing.s5,
        CatchSpacing.screenPb,
      ),
    );
    expect(
      CatchInsets.pageHeaderBody,
      const EdgeInsets.fromLTRB(
        CatchSpacing.s5,
        CatchSpacing.s4,
        CatchSpacing.s5,
        CatchSpacing.s3,
      ),
    );
    expect(
      CatchInsets.sectionHeader,
      const EdgeInsets.fromLTRB(
        CatchSpacing.s5,
        CatchSpacing.micro14,
        CatchSpacing.s5,
        CatchSpacing.s2,
      ),
    );
    expect(
      CatchInsets.compactControlContent,
      const EdgeInsets.symmetric(
        horizontal: CatchSpacing.s3,
        vertical: CatchSpacing.s2,
      ),
    );
    expect(
      CatchInsets.chatBubbleContent,
      const EdgeInsets.symmetric(
        horizontal: CatchSpacing.micro14,
        vertical: CatchSpacing.micro10,
      ),
    );
    expect(
      CatchInsets.chatBubbleGroupEnd,
      const EdgeInsets.only(bottom: CatchSpacing.s3),
    );
  });

  testWidgets('semantic body wrappers apply their default inset roles', (
    tester,
  ) async {
    const pageChildKey = Key('page-body-child');
    const formChildKey = Key('form-body-child');

    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.ltr,
        child: Column(
          children: [
            CatchPageBody(child: SizedBox(key: pageChildKey)),
            CatchPageBody.formStep(child: SizedBox(key: formChildKey)),
          ],
        ),
      ),
    );

    final pagePadding = tester.widget<Padding>(
      find.ancestor(
        of: find.byKey(pageChildKey),
        matching: find.byType(Padding),
      ),
    );
    final formPadding = tester.widget<Padding>(
      find.ancestor(
        of: find.byKey(formChildKey),
        matching: find.byType(Padding),
      ),
    );

    expect(pagePadding.padding, CatchInsets.pageBody);
    expect(formPadding.padding, CatchInsets.formStepBody);
  });

  testWidgets('CatchSectionList uses the semantic section gap by default', (
    tester,
  ) async {
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.ltr,
        child: CatchSectionList(
          emptyStateOmitted: true,
          children: [Text('First section'), Text('Second section')],
        ),
      ),
    );

    final gap = tester.widget<SizedBox>(
      find.byWidgetPredicate(
        (widget) => widget is SizedBox && widget.height == CatchGaps.section,
      ),
    );

    expect(gap.height, CatchGaps.section);
  });

  testWidgets('CatchSectionList renders its explicit empty-state owner', (
    tester,
  ) async {
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: CatchSectionList(
          emptyStateOmitted: false,
          emptyBuilder: (context) => const Text('No sections yet'),
          children: const <Widget>[],
        ),
      ),
    );

    expect(find.text('No sections yet'), findsOneWidget);
  });

  testWidgets(
    'CatchScrollTerminalGap uses the larger device safe area outside shell',
    (tester) async {
      const terminalPaddingKey = Key('terminal-padding');

      await tester.pumpWidget(
        const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              size: Size(390, 844),
              padding: EdgeInsets.only(bottom: 12),
              viewPadding: EdgeInsets.only(bottom: 34),
              viewInsets: EdgeInsets.only(bottom: 300),
            ),
            child: SafeArea(
              bottom: false,
              child: CustomScrollView(
                slivers: [
                  CatchScrollTerminalGap.sliver(
                    key: terminalPaddingKey,
                    extra: 10,
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      final terminalBox = tester.widget<SizedBox>(
        find.descendant(
          of: find.byKey(terminalPaddingKey),
          matching: find.byType(SizedBox),
        ),
      );

      expect(terminalBox.height, 44);
    },
  );

  testWidgets(
    'CatchScrollTerminalGap uses raw floating shell inset plus extra',
    (tester) async {
      const terminalPaddingKey = Key('box-terminal-padding');

      await tester.pumpWidget(
        const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              size: Size(390, 844),
              padding: EdgeInsets.only(bottom: 34),
              viewPadding: EdgeInsets.only(bottom: 34),
              viewInsets: EdgeInsets.only(bottom: 300),
            ),
            child: CatchTabViewportScope(
              index: appShellHomeTabIndex,
              bottomOverlayInset: 102,
              bottomBarPlacement: CatchTabViewportScopePlacement.floating,
              child: CatchScrollTerminalGap(key: terminalPaddingKey, extra: 10),
            ),
          ),
        ),
      );

      final terminalBox = tester.widget<SizedBox>(
        find.descendant(
          of: find.byKey(terminalPaddingKey),
          matching: find.byType(SizedBox),
        ),
      );

      expect(terminalBox.height, 112);
    },
  );

  testWidgets('CatchScrollTerminalGap uses extra only in anchored shell', (
    tester,
  ) async {
    const terminalPaddingKey = Key('anchored-terminal-padding');

    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(
            size: Size(390, 844),
            padding: EdgeInsets.only(bottom: 34),
            viewPadding: EdgeInsets.only(bottom: 34),
          ),
          child: CatchTabViewportScope(
            index: appShellHomeTabIndex,
            bottomBarPlacement: CatchTabViewportScopePlacement.anchored,
            child: CatchScrollTerminalGap(key: terminalPaddingKey, extra: 10),
          ),
        ),
      ),
    );

    final terminalBox = tester.widget<SizedBox>(
      find.descendant(
        of: find.byKey(terminalPaddingKey),
        matching: find.byType(SizedBox),
      ),
    );

    expect(terminalBox.height, 10);
  });

  testWidgets(
    'CatchScrollTerminalGap preserves safe area when shell has no bar',
    (tester) async {
      const terminalPaddingKey = Key('no-bar-terminal-padding');

      await tester.pumpWidget(
        const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              size: Size(390, 844),
              padding: EdgeInsets.only(bottom: 12),
              viewPadding: EdgeInsets.only(bottom: 34),
              viewInsets: EdgeInsets.only(bottom: 300),
            ),
            child: CatchTabViewportScope(
              index: appShellHomeTabIndex,
              child: CatchScrollTerminalGap(key: terminalPaddingKey, extra: 10),
            ),
          ),
        ),
      );

      final terminalBox = tester.widget<SizedBox>(
        find.descendant(
          of: find.byKey(terminalPaddingKey),
          matching: find.byType(SizedBox),
        ),
      );

      expect(terminalBox.height, 44);
    },
  );
}
