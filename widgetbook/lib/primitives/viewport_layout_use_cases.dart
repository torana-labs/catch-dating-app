import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Short and overflowing content',
  type: CatchScrollView,
  path: '[Core patterns]/Viewport',
)
Widget fillViewportStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Viewport scrolling',
  catalogId: 'catch.screen_body.scroll_view',
  children: [
    for (final tall in [false, true]) ...[
      CatchMetadataText(
        tall ? 'Overflowing content' : 'Short content',
        color: CatchTokens.of(context).ink2,
      ),
      SizedBox(
        height: 180,
        child: CatchScrollView(
          maxContentWidth: 280,
          child: SizedBox(
            height: tall ? 340 : null,
            child: ColoredBox(
              color: CatchTokens.of(context).primarySoft,
              child: Padding(
                padding: const EdgeInsets.all(CatchSpacing.s4),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Start', style: CatchTextStyles.bodyM(context)),
                    Text('End', style: CatchTextStyles.bodyM(context)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ],
  ],
);

@widgetbook.UseCase(
  name: 'Bounded scene geometry',
  type: CatchViewport,
  path: '[Core patterns]/Viewport',
)
Widget sceneViewportStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Scene viewport',
  catalogId: 'catch.viewport',
  children: [
    for (final maximum in [240.0, 520.0]) ...[
      CatchMetadataText(
        'Maximum width ${maximum.toInt()}',
        color: CatchTokens.of(context).ink2,
      ),
      MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(padding: const EdgeInsets.only(top: 24, bottom: 16)),
        child: SizedBox(
          height: 180,
          child: CatchViewport.scene(
            maxWidth: maximum,
            builder: (BuildContext context, CatchViewportSceneData viewport) =>
                WidgetbookLayoutPane(
                  label:
                      '${viewport.width.toInt()} × ${viewport.height.toInt()}\n'
                      'Insets ${viewport.mediaPadding.top.toInt()} / '
                      '${viewport.mediaPadding.bottom.toInt()}',
                ),
          ),
        ),
      ),
    ],
  ],
);

@widgetbook.UseCase(
  name: 'Compact and split panes',
  type: CatchNavigationViewport,
  path: '[Core patterns]/Viewport',
)
Widget masterDetailStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Master and detail',
  catalogId: 'catch.screen_body.navigation_workspace',
  children: [
    for (final expanded in [false, true]) ...[
      CatchMetadataText(
        expanded ? 'Split panes' : 'Compact pane',
        color: CatchTokens.of(context).ink2,
      ),
      WidgetbookLayoutViewport(
        size: Size(expanded ? 1100 : 360, 180),
        child: CatchNavigationViewport(
          panes: [
            CatchWorkspacePane(
              id: 'index',
              child: WidgetbookLayoutPane(label: 'Index'),
            ),
            CatchWorkspacePane(
              id: 'detail',
              child: WidgetbookLayoutPane(label: 'Detail', accent: false),
            ),
          ],
        ),
      ),
    ],
  ],
);

@widgetbook.UseCase(
  name: 'Route body breakpoint',
  type: CatchNavigationViewport,
  path: '[Core patterns]/Viewport',
)
Widget adaptiveMasterDetailStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Adaptive master and detail',
      catalogId: 'catch.screen_body.navigation_workspace',
      children: [
        for (final width in [
          CatchLayout.workspaceDirectoryWidth +
              CatchLayout.workspaceDetailMinWidth -
              1,
          CatchLayout.workspaceDirectoryWidth +
              CatchLayout.workspaceDetailMinWidth +
              1,
          1400.0,
        ]) ...[
          CatchMetadataText(
            'Route body ${width.toInt()}',
            color: CatchTokens.of(context).ink2,
          ),
          WidgetbookLayoutViewport(
            size: Size(width, 180),
            child: CatchNavigationViewport(
              panes: [
                CatchWorkspacePane(
                  id: 'index',
                  child: WidgetbookLayoutPane(label: 'Index'),
                ),
                CatchWorkspacePane(
                  id: 'person',
                  child: WidgetbookLayoutPane(label: 'Person'),
                ),
                CatchWorkspacePane(
                  id: 'detail',
                  child: WidgetbookLayoutPane(
                    label: 'Further detail',
                    accent: false,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );

/// Keeps desktop layout constraints intact on a narrow review canvas.
class WidgetbookLayoutViewport extends StatelessWidget {
  const WidgetbookLayoutViewport({
    super.key,
    required this.size,
    required this.child,
  });

  final Size size;
  final Widget child;

  @override
  Widget build(BuildContext context) => FittedBox(
    fit: BoxFit.scaleDown,
    child: WidgetbookViewportFrame.device(size: size, child: child),
  );
}

/// Caller slot that makes the production layout's occupied area visible.
class WidgetbookLayoutPane extends StatelessWidget {
  const WidgetbookLayoutPane({
    super.key,
    required this.label,
    this.accent = true,
  });

  final String label;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final tokens = CatchTokens.of(context);
    return ColoredBox(
      color: accent ? tokens.primarySoft : tokens.surface,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(CatchSpacing.s4),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: CatchTextStyles.bodyM(context),
          ),
        ),
      ),
    );
  }
}
