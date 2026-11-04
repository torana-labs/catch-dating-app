import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Standard and full-bleed route bodies',
  type: CatchRouteScaffold,
  path: '[Core patterns]/Page protocols',
)
Widget routeBodyRoleStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Route body roles',
  catalogId: 'catch.screen_body.route_scaffold',
  children: [
    for (final fullBleed in [false, true])
      WidgetbookViewportFrame.device(
        size: const Size(360, 300),
        child: Builder(
          builder: (context) => CatchRouteScaffold(
            topBarBuilder: (context, scrolledUnder) => CatchLegacyTopBar.route(
              title: fullBleed ? 'Edge-owned route' : 'Standard route',
              navigation: const CatchTopBarNavigation(
                mode: CatchTopBarNavigationMode.none,
              ),
              emphasis: scrolledUnder
                  ? CatchTopBarEmphasis.divided
                  : CatchTopBarEmphasis.plain,
            ),
            body: fullBleed
                ? CatchRouteBody.fullBleed(
                    child: ColoredBox(
                      color: CatchTokens.of(context).primarySoft,
                      child: Center(
                        child: Text(
                          'Edge-owned viewport',
                          style: CatchTextStyles.bodyM(context),
                        ),
                      ),
                    ),
                  )
                : CatchRouteBody.standard(
                    child: Text(
                      'The route owns the page gutter and scroll clearance.',
                      style: CatchTextStyles.bodyM(context),
                    ),
                  ),
          ),
        ),
      ),
  ],
);

@widgetbook.UseCase(
  name: 'Standard full-bleed and pinned-rail panes',
  type: CatchRootScreenScrollView,
  path: '[Core patterns]/Page protocols',
)
Widget rootScrollOwnerStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Root scroll panes',
  catalogId: 'catch.screen_body.root_screen_scroll_view',
  children: [
    for (final fullBleed in [false, true])
      WidgetbookViewportFrame.device(
        size: const Size(360, 320),
        child: CatchScaffold.workspace(
          body: fullBleed
              ? CatchRootScreenScrollView.fullBleed(
                  title: const CatchLegacyTopBar.primaryRail(
                    title: 'Full-bleed pane',
                  ),
                  children: [
                    SliverToBoxAdapter(
                      child: ColoredBox(
                        color: CatchTokens.of(context).primarySoft,
                        child: Text(
                          'Edge-owned content reaches the pane edges.',
                          style: CatchTextStyles.bodyM(context),
                        ),
                      ),
                    ),
                  ],
                )
              : CatchRootScreenScrollView.standard(
                  title: const CatchLegacyTopBar.primaryRail(
                    title: 'Standard pane',
                  ),
                  children: [
                    SliverToBoxAdapter(
                      child: Text(
                        'The scroll owner supplies the readable gutter and terminal clearance.',
                        style: CatchTextStyles.bodyM(context),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    const WidgetbookViewportFrame.device(
      size: Size(360, 480),
      child: _RootPageProtocolPreview(embedded: true),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Typed pages and scroll-position controller',
  type: CatchRootScreenBody,
  path: '[Core patterns]/Page protocols',
)
Widget rootPageProtocolStates(BuildContext context) =>
    const WidgetbookCatalogFrame(
      title: 'Root page protocols',
      catalogId: 'catch.screen_body.root_screen_body',
      children: [
        WidgetbookViewportFrame.device(
          size: Size(360, 480),
          child: _RootPageProtocolPreview(),
        ),
      ],
    );

class _RootPageProtocolPreview extends StatefulWidget {
  const _RootPageProtocolPreview({this.embedded = false});

  final bool embedded;

  @override
  State<_RootPageProtocolPreview> createState() =>
      _RootPageProtocolPreviewState();
}

class _RootPageProtocolPreviewState extends State<_RootPageProtocolPreview>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  final _scroll = CatchRootScreenPageScrollController();
  double? _savedOffset;

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final CatchRootScreenPageOwner records =
        CatchRootScreenPageScrollView.standard(
          scrollKey: const PageStorageKey<String>('protocol-records'),
          scrollStateController: _scroll,
          children: [
            SliverList.builder(
              itemCount: 12,
              itemBuilder: (context, index) => Padding(
                padding: const EdgeInsets.symmetric(vertical: CatchSpacing.s3),
                child: Text(
                  'Record ${index + 1}',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
            ),
          ],
        );
    final CatchPrimaryRail rail = CatchPageTabBar<String>.controlled(
      controller: _tabs,
      options: const [
        CatchOption(value: 'records', label: 'Records'),
        CatchOption(value: 'detail', label: 'Detail'),
      ],
    );
    final header = CatchRootScreenHeader.title(
      title: 'Root page',
      actions: [
        CatchButton.text(
          label: 'Save',
          onPressed: () =>
              setState(() => _savedOffset = _scroll.captureOffset()),
        ),
        CatchButton.text(
          label: 'Restore',
          onPressed: _savedOffset == null
              ? null
              : () => _scroll.restoreOffset(_savedOffset),
        ),
      ],
    );
    final body = CatchRootScreenBody.paged(
      controller: _tabs,
      pages: [
        CatchRootScreenPageSpec.surface(
          page: records,
          backgroundColor: CatchTokens.of(context).bg,
        ),
        CatchRootScreenPageSpec.scroll(
          page: CatchRootScreenPageScrollView.fullBleed(
            scrollKey: const PageStorageKey<String>('protocol-detail'),
            children: [
              SliverToBoxAdapter(
                child: Text(
                  'Full-bleed page',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
            ],
          ),
        ),
      ],
    );
    return widget.embedded
        ? CatchScaffold.workspace(
            body: CatchRootScreenScrollView.withPrimaryRail(
              header: header,
              actions: rail,
              body: body,
            ),
          )
        : CatchRootScreenScaffold.withPrimaryRail(
            header: header,
            actions: rail,
            body: body,
          );
  }
}
