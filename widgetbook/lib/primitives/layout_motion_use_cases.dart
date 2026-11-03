import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Fraction and absolute cap',
  type: CatchFractionalViewport,
  path: '[Core primitives]/Layout',
)
Widget fractionalWidthStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Fractional content width',
  catalogId: 'catch.screen_body.fractional_max_width',
  children: [
    for (final fraction in [0.5, 1.0])
      CatchFractionalViewport(
        fraction: fraction,
        maxWidth: 280,
        child: CatchLegacySurface.card(
          child: Text(
            'Fraction $fraction; maximum 280',
            style: CatchTextStyles.bodyM(context),
          ),
        ),
      ),
  ],
);

@widgetbook.UseCase(
  name: 'Editable pager content',
  type: CatchPagerFocusViewport,
  path: '[Core primitives]/Layout',
)
Widget pagerFocusStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Pager focus boundary',
  catalogId: 'catch.screen_body.pager_focus_boundary',
  children: const [
    CatchPagerFocusViewport(
      child: CatchLegacySurface.card(
        child: TextField(
          decoration: InputDecoration(labelText: 'Pager message'),
        ),
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Resting and transition poses',
  type: CatchRevealViewport,
  path: '[Core primitives]/Motion',
)
Widget revealViewportStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Fade and scale viewport',
  catalogId: 'catch.motion_viewport.fade_scale',
  children: [
    for (final value in [0.0, 0.5, 1.0])
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchMetadataText(
            'Progress $value',
            color: CatchTokens.of(context).ink2,
          ),
          gapH8,
          MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: false),
            child: CatchRevealViewport(
              animation: AlwaysStoppedAnimation<double>(value),
              child: CatchLegacySurface.card(
                child: Text(
                  'Route content',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
            ),
          ),
        ],
      ),
  ],
);

@widgetbook.UseCase(
  name: 'Transparent hero material',
  type: CatchHeroViewport,
  path: '[Core primitives]/Motion',
)
Widget heroViewportStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Hero viewport',
  catalogId: 'catch.motion_viewport.hero',
  children: [
    CatchHeroViewport(
      tag: 'hero-viewport-catalog',
      child: CatchLegacySurface.card(
        child: Text(
          'Card flight surface',
          style: CatchTextStyles.bodyM(context),
        ),
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchTabViewportScope,
  path: '[Core patterns]/Viewport',
)
Widget tabViewportContractStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Tab viewport',
      catalogId: 'catch.screen_body.tab_viewport_scope',
      children: [
        for (final placement in CatchTabViewportScopePlacement.values)
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CatchMetadataText(
                placement.name,
                color: CatchTokens.of(context).ink2,
              ),
              gapH8,
              SizedBox(
                height: 160,
                child: CatchLegacySurface(
                  padding: EdgeInsets.zero,
                  child: CatchTabViewportScope(
                    index: 0,
                    bottomBarPlacement: placement,
                    bottomOverlayInset:
                        placement == CatchTabViewportScopePlacement.floating
                        ? 56
                        : 0,
                    child: CatchStateViewport(
                      child: ColoredBox(
                        color: CatchTokens.of(context).primarySoft,
                        child: Center(
                          child: Text(
                            'Visible state region',
                            style: CatchTextStyles.bodyM(context),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
      ],
    );
