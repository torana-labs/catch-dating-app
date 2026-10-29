import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Nested body paint extents',
  type: CatchFieldInteractionPlaneScope,
  path: '[Core patterns]/Section layout',
)
Widget fieldInteractionPlaneLayoutStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Page-owned field paint',
      catalogId: 'catch.field.interaction_plane_scope',
      children: [
        for (final nested in [false, true]) ...[
          Text(
            nested ? 'Nested page gutter' : 'Single page gutter',
            style: CatchTextStyles.bodyM(context),
          ),
          Builder(
            builder: (context) {
              final body = Builder(
                builder: (context) => Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: CatchSpacing.s6,
                  ),
                  child: CatchFieldInteractionPlaneScope.fromPadding(
                    context: context,
                    padding: const EdgeInsets.symmetric(
                      horizontal: CatchSpacing.s6,
                    ),
                    child: CatchSection.fieldRows(
                      children: [
                        CatchField<String>.choices(
                          copy: catchFieldCopy(context.l10n),
                          title: 'Reminder',
                          values: const ['Before', 'After'],
                          itemLabelBuilder: (value) => value,
                          selected: const {'Before'},
                          onSelectionChanged: (_) {},
                          disclosureMode: CatchFieldMode.localExpanded,
                        ),
                      ],
                    ),
                  ),
                ),
              );
              return nested
                  ? CatchPageBody(
                      padding: const EdgeInsets.symmetric(
                        horizontal: CatchSpacing.s4,
                      ),
                      child: body,
                    )
                  : body;
            },
          ),
        ],
      ],
    );

@widgetbook.UseCase(
  name: 'Local breakpoint and single-lane fallback',
  type: CatchSectionList,
  path: '[Core patterns]/Section layout',
)
Widget responsiveSectionLayoutStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Complete section lanes',
      catalogId: 'catch.section_stack',
      children: [
        for (final setup in [
          (width: 659.0, secondary: true, label: 'Below 660'),
          (width: 660.0, secondary: true, label: 'At 660'),
          (width: 760.0, secondary: false, label: 'One populated lane'),
        ]) ...[
          Text(setup.label, style: CatchTextStyles.bodyM(context)),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: WidgetbookViewportFrame.device(
              size: Size(setup.width, 320),
              child: CatchSectionList.responsive(
                emptyStateOmitted: true,
                mode: CatchSectionListMode.adaptiveTwoColumn,
                items: [
                  for (final index in [0, 1])
                    CatchSectionListItem(
                      lane: index == 1 && setup.secondary
                          ? CatchSectionListPlacement.secondary
                          : CatchSectionListPlacement.primary,
                      child: CatchSection.fieldRows(
                        children: [
                          CatchField.read(
                            copy: catchFieldCopy(context.l10n),
                            title: index == 0 ? 'Primary' : 'Secondary',
                            body: 'Complete section',
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ],
    );

@widgetbook.UseCase(
  name: 'Scrolled terminal clearance',
  type: CatchSectionList,
  path: '[Core patterns]/Section layout',
)
Widget responsiveSectionPageStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Section page clearance',
      catalogId: 'catch.section_stack',
      children: [
        for (final floating in [false, true]) ...[
          Text(
            floating ? 'Floating navigation' : 'No navigation overlay',
            style: CatchTextStyles.bodyM(context),
          ),
          WidgetbookScrolledSectionPage(floating: floating),
        ],
      ],
    );

class WidgetbookScrolledSectionPage extends StatefulWidget {
  const WidgetbookScrolledSectionPage({super.key, required this.floating});

  final bool floating;

  @override
  State<WidgetbookScrolledSectionPage> createState() =>
      _WidgetbookScrolledSectionPageState();
}

class _WidgetbookScrolledSectionPageState
    extends State<WidgetbookScrolledSectionPage> {
  final _controller = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _controller.hasClients) {
        _controller.jumpTo(_controller.position.maxScrollExtent);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => WidgetbookViewportFrame.device(
    size: const Size(360, 380),
    child: Stack(
      children: [
        CatchTabViewportScope(
          index: 0,
          bottomOverlayInset: widget.floating ? 88 : 0,
          bottomBarPlacement: widget.floating
              ? CatchTabViewportScopePlacement.floating
              : CatchTabViewportScopePlacement.none,
          child: CatchSectionList.page(
            emptyStateOmitted: true,
            controller: _controller,
            items: [
              for (var index = 0; index < 8; index++)
                CatchSectionListItem(
                  child: CatchSection.fieldRows(
                    title: 'Section ${index + 1}',
                    children: [
                      CatchField.read(
                        copy: catchFieldCopy(context.l10n),
                        title: 'Detail',
                        body: 'Complete body block',
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        if (widget.floating)
          Align(
            alignment: Alignment.bottomCenter,
            child: SizedBox(
              height: 88,
              width: double.infinity,
              child: ColoredBox(
                color: CatchTokens.of(context).surface,
                child: Center(
                  child: Text(
                    'Navigation area',
                    style: CatchTextStyles.bodyM(context),
                  ),
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Standard and full-bleed sliver roles',
  type: CatchPageBody,
  path: '[Core patterns]/Section layout',
)
Widget sliverScreenBodyStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Semantic sliver bodies',
  catalogId: 'catch.screen_body',
  children: [
    for (final layout in CatchPageBodyMode.values) ...[
      Text(layout.name, style: CatchTextStyles.bodyM(context)),
      WidgetbookViewportFrame.device(
        size: const Size(360, 180),
        child: CustomScrollView(
          slivers: [
            CatchPageBody.slivers(
              mode: layout,
              children: [
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 96,
                    child: ColoredBox(
                      color: CatchTokens.of(context).primarySoft,
                      child: Center(
                        child: Text(
                          'Content',
                          style: CatchTextStyles.bodyM(context),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ],
  ],
);

@widgetbook.UseCase(
  name: 'Extra and shell-aware terminal space',
  type: CatchScrollTerminalGap,
  path: '[Core patterns]/Section layout',
)
Widget sliverTerminalPaddingStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Sliver terminal space',
      catalogId: 'catch.screen_body.scroll_terminal_gap',
      children: [
        for (final includeShell in [false, true]) ...[
          Text(
            includeShell ? 'Extra plus shell clearance' : 'Extra only',
            style: CatchTextStyles.bodyM(context),
          ),
          WidgetbookViewportFrame.device(
            size: const Size(360, 240),
            child: CatchTabViewportScope(
              index: 0,
              bottomOverlayInset: 88,
              bottomBarPlacement: CatchTabViewportScopePlacement.floating,
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 60,
                      child: ColoredBox(
                        color: CatchTokens.of(context).primarySoft,
                        child: Center(
                          child: Text(
                            'Last content',
                            style: CatchTextStyles.bodyM(context),
                          ),
                        ),
                      ),
                    ),
                  ),
                  CatchScrollTerminalGap.sliver(
                    extra: 32,
                    includeSafeArea: includeShell,
                  ),
                  SliverToBoxAdapter(
                    child: Text(
                      'End of clearance',
                      textAlign: TextAlign.center,
                      style: CatchTextStyles.bodyM(context),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
