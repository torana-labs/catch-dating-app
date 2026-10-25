import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Text states',
  type: CatchButton,
  path: '[Core catalog]/Actions',
)
Widget catchTextButtonCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchButton.text',
    catalogId: 'core.widgets.catch_button',
    children: [
      WidgetbookCatalogStateCard(
        label: 'tones',
        child: WidgetbookContractWrap(
          children: [
            CatchButton.text(label: 'Retry', onPressed: widgetbookNoop),
            CatchButton.text(
              label: 'Cancel',
              tone: CatchButtonTone.neutral,
              onPressed: widgetbookNoop,
            ),
            CatchButton.text(
              label: 'Remove',
              tone: CatchButtonTone.danger,
              onPressed: widgetbookNoop,
            ),
            const CatchButton.text(label: 'Disabled', onPressed: null),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchTopBar,
  path: '[Core catalog]/Navigation',
)
Widget catchTopBarScreenCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchTopBar',
    catalogId: 'core.widgets.catch_top_bar_screen',
    children: [
      WidgetbookCatalogStateCard(
        label: 'root title / subtitle / action',
        child: CatchTopBar.screen(
          title: 'Chats',
          subtitle: 'Messages from your matches',
          actions: [
            CatchIconAction.toolbar(
              icon: CatchIcons.search,
              tooltip: 'Search chats',
              onPressed: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'root search chrome',
        child: CatchTopBar.screen(
          leading: CatchIconAction.toolbar(
            icon: CatchIcons.locationOnOutlined,
            tooltip: 'Change city',
            onPressed: widgetbookNoop,
          ),
          title: 'Explore',
          subtitle: 'Tonight near you',
          search: CatchTopBarSearch(
            copy: catchSearchFieldCopy(context.l10n),
            placeholder: 'Search events',
            tooltip: 'Search events',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'App-bar placement',
  type: CatchPageTabBar,
  path: '[Core catalog]/Navigation',
)
Widget catchPageTabBarAppBarStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchPageTabBar',
    catalogId: 'catch.tab_rail',
    children: [
      WidgetbookCatalogStateCard(
        label: 'inside CatchTopBar',
        child: DefaultTabController(
          length: 3,
          child: Builder(
            builder: (context) => CatchTopBar.route(
              title: 'Explore',
              navigation: const CatchTopBarNavigation(
                mode: CatchTopBarNavigationMode.none,
              ),
              tone: CatchTopBarTone.surface,
              footer: CatchPageTabBar<int>.controlled(
                controller: DefaultTabController.of(context),
                options: const [
                  CatchOption(value: 0, label: 'Tonight'),
                  CatchOption(value: 1, label: 'Week'),
                  CatchOption(value: 2, label: 'Saved'),
                ],
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Toolbar actions',
  type: CatchActionMenu,
  path: '[Core catalog]/Navigation',
)
Widget catchTopBarActionsCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchTopBar actions',
    catalogId: 'core.widgets.catch_top_bar_actions',
    children: [
      WidgetbookCatalogStateCard(
        label: 'icon / text / menu',
        child: CatchTopBar.route(
          title: 'Event details',
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
            onPressed: widgetbookNoop,
          ),

          tone: CatchTopBarTone.surface,
          actions: [
            CatchIconAction.toolbar(
              icon: CatchIcons.savedOutlined,
              tooltip: 'Save',
              onPressed: widgetbookNoop,
            ),
            CatchButton.text(label: 'Done', onPressed: widgetbookNoop),
            CatchActionMenu<String>(
              tooltip: 'More',
              onSelected: widgetbookIgnoreString,
              items: const [
                CatchActionMenuItem(value: 'share', label: 'Share'),
                CatchActionMenuItem(value: 'report', label: 'Report'),
              ],
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchTopBarActionRow,
  path: '[Core catalog]/Navigation',
)
Widget catchTopBarActionGroupCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchTopBarActionRow',
    catalogId: 'core.widgets.catch_top_bar_action_row',
    children: [
      WidgetbookCatalogStateCard(
        label: 'two actions / conditional third / disabled',
        description:
            'The group owns one fixed gap regardless of which actions are present.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CatchTopBarActionRow(
              actions: [
                CatchIconAction.toolbar(
                  icon: CatchIcons.share,
                  tooltip: 'Share',
                  onPressed: widgetbookNoop,
                ),
                CatchIconAction.toolbar(
                  icon: CatchIcons.savedOutlined,
                  tooltip: 'Save',
                  onPressed: widgetbookNoop,
                ),
              ],
            ),
            gapH12,
            CatchTopBarActionRow(
              actions: [
                CatchIconAction.toolbar(
                  icon: CatchIcons.share,
                  tooltip: 'Share',
                  onPressed: widgetbookNoop,
                ),
                CatchIconAction.toolbar(
                  icon: CatchIcons.calendarAdd,
                  tooltip: 'Add to calendar',
                  onPressed: widgetbookNoop,
                ),
                CatchIconAction.toolbar(
                  icon: CatchIcons.savedOutlined,
                  tooltip: 'Save pending',
                  onPressed: null,
                ),
              ],
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchTopBarPrimaryButton,
  path: '[Core catalog]/Navigation',
)
Widget catchTopBarPrimaryActionCatalogStates(BuildContext context) {
  final mediaQuery = MediaQuery.of(context);
  return WidgetbookCatalogFrame(
    title: 'CatchTopBarPrimaryButton',
    catalogId: 'core.widgets.catch_top_bar_primary_button',
    children: [
      WidgetbookCatalogStateCard(
        label: 'compact phone / icon action',
        child: MediaQuery(
          data: mediaQuery.copyWith(size: const Size(390, 844)),
          child: CatchTopBarPrimaryButton(
            label: 'Create event',
            icon: CatchIcons.addRounded,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'medium viewport / labelled action',
        child: MediaQuery(
          data: mediaQuery.copyWith(size: const Size(800, 900)),
          child: CatchTopBarPrimaryButton(
            label: 'Create event',
            icon: CatchIcons.addRounded,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchIconAction,
  path: '[Core catalog]/Navigation',
)
Widget catchIconActionCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchIconAction.toolbar',
    catalogId: 'core.widgets.catch_icon_action',
    children: [
      WidgetbookCatalogStateCard(
        label: 'default / plain / disabled',
        child: WidgetbookContractWrap(
          children: [
            CatchIconAction.toolbar(
              icon: CatchIcons.savedOutlined,
              tooltip: 'Save',
              onPressed: widgetbookNoop,
            ),
            CatchIconAction(
              tooltip: 'Share',
              variant: CatchIconActionVariant.plain,
              onPressed: widgetbookNoop,
              child: Icon(CatchIcons.share, size: CatchIconSize.md),
            ),
            CatchIconAction.toolbar(
              icon: CatchIcons.moreHorizRounded,
              tooltip: 'Disabled',
              onPressed: null,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Toolbar text states',
  type: CatchButton,
  path: '[Core catalog]/Navigation',
)
Widget catchTopBarTextActionCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'CatchButton.text',
    catalogId: 'core.widgets.catch_button',
    children: [
      WidgetbookCatalogStateCard(
        label: 'primary / neutral / disabled',
        child: WidgetbookContractWrap(
          children: [
            CatchButton.text(label: 'Done', onPressed: widgetbookNoop),
            CatchButton.text(
              label: 'Skip',
              foregroundColor: t.ink2,
              onPressed: widgetbookNoop,
            ),
            const CatchButton.text(label: 'Disabled', onPressed: null),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchSliverHeader,
  path: '[Core catalog]/Navigation',
)
Widget catchSliverHeaderCatalogStates(BuildContext context) {
  final header = CatchSliverHeader(
    title: Padding(
      padding: const EdgeInsets.fromLTRB(
        CatchSpacing.screenPx,
        CatchSpacing.s4,
        CatchSpacing.screenPx,
        CatchSpacing.s3,
      ),
      child: Text(
        'Pinned search header',
        style: CatchTextStyles.headline(context),
      ),
    ),
    bottomHeight: CatchSliverHeader.compactSearchBottomHeight,
    bottom: Padding(
      padding: const EdgeInsets.fromLTRB(
        CatchSpacing.screenPx,
        CatchSliverHeader.searchControlTopPadding,
        CatchSpacing.screenPx,
        CatchSpacing.s2,
      ),
      child: CatchSearchField(
        copy: catchSearchFieldCopy(context.l10n),
        value: 'Dinner',
      ),
    ),
  );
  return WidgetbookCatalogFrame(
    title: 'CatchSliverHeader',
    catalogId: 'core.widgets.catch_sliver_header',
    children: [
      WidgetbookCatalogStateCard(
        label: 'scroll-away title / pinned bottom',
        child: SizedBox(
          height: WidgetbookPreviewLayout.sliverPreviewHeight,
          child: CustomScrollView(
            slivers: [
              ...header.buildSlivers(context),
              SliverList.builder(
                itemCount: 8,
                itemBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: CatchSpacing.screenPx,
                    vertical: CatchSpacing.s2,
                  ),
                  child: CatchSurface.card(child: Text('Result ${index + 1}')),
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

Widget catchStepHeaderCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchStepHeader',
    catalogId: 'core.widgets.catch_step_header',
    children: [
      WidgetbookCatalogStateCard(
        label: 'header with progress',
        child: Column(
          children: [
            CatchStepHeader(
              stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
              compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
                context.l10n,
              ),
              title: 'Event basics',
              subtitle: 'Set the foundation for guests.',
              kicker: 'Create event',
              step: 2,
              total: 5,
              onBack: widgetbookNoop,
            ),
          ],
        ),
      ),
    ],
  );
}

Widget catchTabDockCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchTabBar',
    catalogId: 'core.widgets.catch_tab_bar',
    children: const [
      WidgetbookCatalogStateCard(
        label: 'interactive bar',
        child: _TabBarDemo(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchPageIndicator,
  path: '[Core catalog]/Navigation',
)
Widget catchPageDotsCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchPageIndicator',
    catalogId: 'core.widgets.catch_page_dots',
    children: [
      WidgetbookCatalogStateCard(
        label: 'selected positions',
        child: Column(
          children: [
            CatchPageIndicator(selectedIndex: 0, itemCount: 4),
            SizedBox(height: CatchSpacing.s3),
            CatchPageIndicator(selectedIndex: 2, itemCount: 4),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchIconTile,
  path: '[Core catalog]/Icon atoms',
)
Widget catchIconTileCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'CatchIconTile',
    catalogId: 'core.widgets.catch_icon_tile',
    children: [
      WidgetbookCatalogStateCard(
        label: 'default / tinted / compact',
        child: WidgetbookContractWrap(
          children: [
            CatchIconTile(icon: CatchIcons.eventOutlined, iconColor: t.primary),
            CatchIconTile(
              icon: CatchIcons.lockOutlineRounded,
              iconColor: t.danger,
              backgroundColor: t.primarySoft,
            ),
            CatchIconTile(
              icon: CatchIcons.sparkle,
              iconColor: t.ink,
              size: 32,
              iconSize: 16,
              radius: CatchRadius.sm,
            ),
          ],
        ),
      ),
    ],
  );
}

class _TabBarDemo extends StatefulWidget {
  const _TabBarDemo();

  @override
  State<_TabBarDemo> createState() => _TabBarDemoState();
}

class _TabBarDemoState extends State<_TabBarDemo> {
  var _active = 'home';

  @override
  Widget build(BuildContext context) {
    return CatchTabBar<String>(
      active: _active,
      onChanged: (value) => setState(() => _active = value),
      items: [
        CatchTabBarItem(
          id: 'home',
          icon: CatchIcons.homeOutlined,
          activeIcon: CatchIcons.homeRounded,
          label: 'Home',
        ),
        CatchTabBarItem(
          id: 'explore',
          icon: CatchIcons.search,
          label: 'Explore',
          badgeCount: 3,
        ),
        CatchTabBarItem(
          id: 'chats',
          icon: CatchIcons.chatBubbleOutlineRounded,
          label: 'Chats',
          badgeCount: 12,
        ),
      ],
    );
  }
}
