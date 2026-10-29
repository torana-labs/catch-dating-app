import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('visible headers follow growing and shrinking content', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1100, 900);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    Future<void> pump({
      String? subtitle,
      double width = 1100,
      double scale = 1,
    }) async {
      tester.view.physicalSize = Size(width, 900);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: MediaQueryData(
              size: Size(width, 900),
              textScaler: TextScaler.linear(scale),
            ),
            child: CatchNavigationViewport(
              compactPaneId: 'detail',
              panes: [
                CatchWorkspacePane(
                  id: 'index',
                  child: CatchWorkspacePaneScaffold(
                    title: CatchTopBar.primaryRail(
                      title: 'Audience',
                      subtitle: subtitle,
                    ),
                    actions: CatchPageTabBar<int>(
                      groupKey: const ValueKey('index-tabs'),
                      selected: 0,
                      options: const [CatchOption(value: 0, label: 'People')],
                      onChanged: (_) {},
                    ),
                    body: const Text('Directory'),
                  ),
                ),
                CatchWorkspacePane(
                  id: 'detail',
                  child: CatchWorkspacePaneScaffold(
                    title: const CatchTopBar.route(title: 'Person'),
                    actions: CatchPageTabBar<int>(
                      groupKey: const ValueKey('detail-tabs'),
                      selected: 0,
                      options: const [CatchOption(value: 0, label: 'Overview')],
                      onChanged: (_) {},
                    ),
                    body: const Text('Details'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(tester.takeException(), isNull);
    }

    double tabY(String id) =>
        tester.getTopLeft(find.byKey(ValueKey('$id-tabs'))).dy;
    await pump();
    final plain = tabY('detail');
    expect(plain, lessThan(96));
    expect(tabY('index'), plain);
    await pump(
      subtitle:
          'A contextual subtitle that needs more than one line at large text sizes',
    );
    final expanded = tabY('detail');
    expect(expanded, greaterThan(plain));
    expect(tabY('index'), expanded);
    await pump();
    expect(tabY('detail'), plain);
    await pump(
      subtitle: 'A long contextual subtitle which remains mounted while hidden',
      width: 390,
    );
    expect(find.text('Directory'), findsNothing);
    expect(tabY('detail'), plain);
    await pump(subtitle: 'Context', width: 850, scale: 2);
    expect(tabY('detail'), greaterThan(expanded));
    expect(tabY('index'), tabY('detail'));
    await pump();
    expect(tabY('detail'), plain);
  });

  testWidgets('header measures real controls and ignores offstage headers', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1100, 900);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    Future<void> pump({required double controlHeight}) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: CatchWorkspaceHeaderLayout(
            child: Row(
              children: [
                const Offstage(
                  child: SizedBox(
                    width: 100,
                    height: 900,
                    child: CatchWorkspacePaneScaffold(
                      title: SizedBox(height: 400),
                      body: SizedBox.shrink(),
                    ),
                  ),
                ),
                for (final id in ['first', 'second'])
                  Expanded(
                    child: CatchWorkspacePaneScaffold(
                      title: id == 'first'
                          ? CatchTopBar.screen(
                              title: id,
                              actions: [
                                SizedBox(width: 48, height: controlHeight),
                              ],
                            )
                          : CatchTopBar.screen(title: id),
                      body: Text('$id body', key: ValueKey(id)),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(tester.takeException(), isNull);
    }

    await pump(controlHeight: 48);
    final short = tester.getTopLeft(find.byKey(const ValueKey('first'))).dy;
    expect(short, lessThan(96));
    expect(tester.getTopLeft(find.byKey(const ValueKey('second'))).dy, short);
    await pump(controlHeight: 120);
    final tall = tester.getTopLeft(find.byKey(const ValueKey('first'))).dy;
    expect(tall - short, closeTo(72, 0.01));
    expect(tester.getTopLeft(find.byKey(const ValueKey('second'))).dy, tall);
    await pump(controlHeight: 48);
    expect(tester.getTopLeft(find.byKey(const ValueKey('second'))).dy, short);
  });

  testWidgets('header boundaries account for different safe-area origins', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const CatchWorkspaceHeaderLayout(
          child: Row(
            children: [
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: 24),
                  child: CatchWorkspacePaneScaffold(
                    title: SizedBox(height: 20),
                    body: Text('Inset body'),
                  ),
                ),
              ),
              Expanded(
                child: CatchWorkspacePaneScaffold(
                  title: SizedBox(height: 44),
                  body: Text('Edge body'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(tester.getTopLeft(find.text('Inset body')).dy, 44);
    expect(tester.getTopLeft(find.text('Edge body')).dy, 44);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'brand retains compact two-tone typography on navigation surface',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: const CatchWorkspacePaneScaffold(
            title: CatchTopBar.brand(title: 'Catch Host'),
            body: SizedBox.shrink(),
          ),
        ),
      );
      final text = tester.widget<Text>(
        find.byWidgetPredicate(
          (widget) =>
              widget is Text && widget.textSpan?.toPlainText() == 'Catch Host',
        ),
      );
      expect(text.style!.fontFamily, endsWith('/${CatchFonts.headFamily}'));
      expect(
        text.style!.fontVariations,
        contains(const FontVariation('wdth', CatchFonts.archivoWidth)),
      );
      final spans = (text.textSpan! as TextSpan).children!.cast<TextSpan>();
      expect(spans.first.text, 'Catch');
      expect(spans.last.text, ' Host');
      expect(spans.last.style!.color, CatchTokens.light.ink2);
      final materials = tester.widgetList<Material>(
        find.descendant(
          of: find.byType(CatchTopBar),
          matching: find.byType(Material),
        ),
      );
      expect(materials.first.color, CatchTokens.light.surface);
      expect(tester.takeException(), isNull);
    },
  );
}
