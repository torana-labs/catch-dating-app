import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/core/presentation/app_shell.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('sidebar, root and route titles share actual text baselines', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1400, 260);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final captureKey = GlobalKey();
    var backCount = 0;
    Future<void> pumpAt(
      double width, {
      bool subtitle = false,
      bool identity = false,
    }) async {
      tester.view.physicalSize = Size(width, 260);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: RepaintBoundary(
            key: captureKey,
            child: CatchWorkspaceHeaderLayout(
              child: ColoredBox(
                color: CatchTokens.light.bg,
                child: Row(
                  children: [
                    if (width > 600)
                      AppShellSideNavigation(
                        active: 0,
                        expanded: true,
                        title: 'Catch Host',
                        items: const [],
                        onChanged: (_) {},
                      ),
                    Expanded(
                      child: CatchNavigationViewport(
                        compactPaneId: 'program',
                        onBack: () => backCount++,
                        panes: [
                          CatchWorkspacePane(
                            id: 'events',
                            child: CatchWorkspacePaneScaffold(
                              title: CatchTopBar.primaryRail(
                                title: subtitle ? 'Today' : 'Events',
                                subtitle: subtitle
                                    ? 'Wednesday, October 7, 2026'
                                    : null,
                                actions: [
                                  CatchTopBarPrimaryButton(
                                    label: 'Create event',
                                    icon: CatchIcons.add,
                                    onPressed: () {},
                                  ),
                                ],
                              ),
                              actions: CatchPageTabBar<int>(
                                groupKey: const ValueKey('directory-tabs'),
                                selected: 0,
                                options: const [
                                  CatchOption(value: 0, label: 'Upcoming'),
                                  CatchOption(value: 1, label: 'Past'),
                                ],
                                onChanged: (_) {},
                              ),
                              body: const SizedBox.shrink(),
                            ),
                          ),
                          CatchWorkspacePane(
                            id: 'program',
                            child: CatchWorkspaceBackScope(
                              onBack: () => backCount++,
                              child: CatchWorkspacePaneScaffold(
                                title: identity
                                    ? const CatchTopBar.identity(
                                        identityName: 'Program',
                                        identitySemanticLabel: 'Program',
                                      )
                                    : const CatchTopBar.route(
                                        title: 'Program',
                                        navigation: CatchTopBarNavigation(
                                          mode: CatchTopBarNavigationMode.back,
                                        ),
                                      ),
                                body: const SizedBox.shrink(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
    }

    double baseline(String label) {
      final paragraph = tester.renderObject<RenderParagraph>(
        find.text(label, findRichText: true),
      );
      return paragraph.localToGlobal(Offset.zero).dy +
          paragraph.getDryBaseline(
            BoxConstraints.tight(paragraph.size),
            TextBaseline.alphabetic,
          )!;
    }

    await pumpAt(1400);
    expect(baseline('Catch Host'), closeTo(baseline('Events'), 0.01));
    expect(baseline('Program'), closeTo(baseline('Events'), 0.01));
    expect(find.byTooltip('Back'), findsNothing);
    const capturePath = String.fromEnvironment('HOST_WORKSPACE_CAPTURE');
    if (capturePath.isNotEmpty) {
      await tester.runAsync(() async {
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(captureKey),
        );
        final image = await boundary.toImage(pixelRatio: 2);
        final data = await image.toByteData(format: ui.ImageByteFormat.png);
        await File(capturePath).writeAsBytes(data!.buffer.asUint8List());
        image.dispose();
      });
    }
    await pumpAt(1400, subtitle: true);
    expect(baseline('Today'), closeTo(baseline('Program'), 0.01));
    expect(baseline('Catch Host'), closeTo(baseline('Program'), 0.01));
    await pumpAt(1400, identity: true);
    expect(baseline('Program'), closeTo(baseline('Events'), 0.01));
    await pumpAt(390);
    expect(find.text('Events'), findsNothing);
    expect(find.byTooltip('Back'), findsOneWidget);
    await tester.tap(find.byTooltip('Back'));
    expect(backCount, 1);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'navigation path uses local width and retains state across resize',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1500, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final initialized = <String, int>{};
      Future<void> pumpAt(double width) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: width,
                height: 700,
                child: CatchNavigationViewport(
                  panes: [
                    for (final id in ['index', 'person', 'record'])
                      CatchWorkspacePane(
                        id: id,
                        child: _DraftPane(id, initialized),
                      ),
                  ],
                ),
              ),
            ),
          ),
        );
        await tester.pump();
      }

      await pumpAt(1400);
      expect(find.text('index'), findsOneWidget);
      expect(find.text('person'), findsOneWidget);
      expect(find.text('record'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('record-input')),
        'Unsent draft',
      );
      await pumpAt(850);
      // Ancestors remain mounted in the horizontally scrolling path. The
      // selected pane must be revealed when its available width changes.
      expect(find.text('index'), findsOneWidget);
      expect(
        tester.getRect(find.byKey(const ValueKey('record-pane'))).right,
        lessThanOrEqualTo(850),
      );
      expect(find.text('person'), findsOneWidget);
      expect(find.text('record'), findsOneWidget);
      expect(
        tester.getRect(find.byKey(const ValueKey('person-pane'))).width,
        CatchLayout.workspaceDirectoryWidth,
      );
      await pumpAt(390);
      expect(find.text('person'), findsNothing);
      expect(find.text('record'), findsOneWidget);
      expect(find.text('Unsent draft'), findsOneWidget);
      await pumpAt(1400);
      expect(find.text('Unsent draft'), findsOneWidget);
      expect(initialized, {'index': 1, 'person': 1, 'record': 1});
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('preview is auxiliary on narrow screens and pane chrome aligns', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1500, 900);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    Future<void> pumpAt(double width) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: SizedBox(
            width: width,
            child: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: width,
                child: CatchNavigationViewport(
                  compactPaneId: 'index',
                  panes: [
                    for (final id in ['index', 'preview'])
                      CatchWorkspacePane(
                        id: id,
                        child: CatchWorkspacePaneScaffold(
                          title: CatchTopBar.primaryRail(title: id),
                          actions: CatchPageTabBar<int>(
                            groupKey: ValueKey('$id-tabs'),
                            selected: 0,
                            options: const [
                              CatchOption(value: 0, label: 'One'),
                            ],
                            onChanged: (_) {},
                          ),
                          body: Text('$id body'),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    await pumpAt(1100);
    expect(
      tester.getTopLeft(find.byKey(const ValueKey('index-tabs'))).dy,
      tester.getTopLeft(find.byKey(const ValueKey('preview-tabs'))).dy,
    );
    await pumpAt(600);
    expect(find.text('index body'), findsOneWidget);
    expect(find.text('preview body'), findsNothing);
    expect(tester.takeException(), isNull);
  });
  testWidgets('divider remains painted above opaque pane backgrounds', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(900, 700);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final boundaryKey = GlobalKey();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: RepaintBoundary(
          key: boundaryKey,
          child: CatchNavigationViewport(
            panes: const [
              CatchWorkspacePane(
                id: 'index',
                child: ColoredBox(color: Colors.white),
              ),
              CatchWorkspacePane(
                id: 'detail',
                child: ColoredBox(color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();
    final boundary =
        boundaryKey.currentContext!.findRenderObject()!
            as RenderRepaintBoundary;
    final line = CatchTokens.of(boundaryKey.currentContext!).line;
    final pixels = await tester.runAsync(() async {
      final image = await boundary.toImage();
      final bytes = (await image.toByteData())!;
      image.dispose();
      return bytes;
    });
    final offset =
        (350 * 900 + CatchLayout.workspaceDirectoryWidth.toInt()) * 4;
    final expected = ui.Color.alphaBlend(line, Colors.white);
    expect(pixels!.getUint8(offset), closeTo(expected.r * 255, 1));
    expect(pixels.getUint8(offset + 1), closeTo(expected.g * 255, 1));
    expect(pixels.getUint8(offset + 2), closeTo(expected.b * 255, 1));
    expect(pixels.getUint8(offset + 4), 255);
  });
}

class _DraftPane extends StatefulWidget {
  const _DraftPane(this.id, this.initialized);
  final String id;
  final Map<String, int> initialized;
  @override
  State<_DraftPane> createState() => _DraftPaneState();
}

class _DraftPaneState extends State<_DraftPane> {
  final controller = TextEditingController();
  @override
  void initState() {
    super.initState();
    widget.initialized.update(
      widget.id,
      (value) => value + 1,
      ifAbsent: () => 1,
    );
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Material(
    child: Column(
      key: ValueKey('${widget.id}-pane'),
      children: [
        Text(widget.id),
        TextField(key: ValueKey('${widget.id}-input'), controller: controller),
      ],
    ),
  );
}
