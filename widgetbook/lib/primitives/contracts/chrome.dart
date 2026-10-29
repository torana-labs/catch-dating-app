import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchTopBar,
  path: '[Core primitives]/Navigation',
)
Widget catchTopBarContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchTopBar',
    contractId: 'catch.top_bar',
    states: const [
      'compact',
      'context',
      'with-leading',
      'with-action-icon',
      'with-action-text',
      'with-search',
      'conversation-title',
      'surface',
      'divider',
      'outlined-actions',
      'root-title',
      'root-subtitle-actions',
      'primary-rail',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'compact',
        child: const WidgetbookContractTopBarFrame(
          child: CatchTopBar.route(title: 'Events', subtitle: 'Tonight nearby'),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'context',
        child: const WidgetbookContractTopBarFrame(
          child: CatchTopBar.route(
            title: 'Upcoming events',
            subtitle: 'Review requests and keep the room balanced.',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-leading',
        child: WidgetbookContractTopBarFrame(
          child: CatchTopBar.route(
            title: 'Event details',
            navigation: const CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.back,
              onPressed: widgetbookNoop,
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'outlined-actions',
        child: WidgetbookContractTopBarFrame(
          child: CatchTopBar.route(
            title: 'Form builder',
            navigation: const CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.back,
              onPressed: widgetbookNoop,
            ),

            actions: [
              CatchButton.text(label: 'Preview', onPressed: widgetbookNoop),
              CatchActionMenu<String>(
                tooltip: 'Form actions',
                items: const [
                  CatchActionMenuItem(value: 'share', label: 'Share form'),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-action-icon',
        child: WidgetbookContractTopBarFrame(
          child: CatchTopBar.route(
            title: 'Chats',
            actions: [
              CatchIconAction.toolbar(
                icon: CatchIcons.more,
                tooltip: 'More',
                onPressed: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-action-text',
        child: WidgetbookContractTopBarFrame(
          child: CatchTopBar.route(
            title: 'Preview',
            actions: [
              CatchButton.text(label: 'Done', onPressed: widgetbookNoop),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-search',
        description: 'Use the search icon to review the expanded search state.',
        child: WidgetbookContractTopBarFrame(
          child: CatchTopBar.route(
            title: 'Clubs',
            search: CatchTopBarSearch(
              copy: catchSearchFieldCopy(context.l10n),
              value: 'run',
              placeholder: 'Search clubs',
              tooltip: 'Search clubs',
              onChanged: widgetbookIgnoreString,
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'conversation-title',
        child: WidgetbookContractTopBarFrame(
          child: CatchTopBar.identity(
            identitySemanticLabel: context.l10n
                .coreCatchTopBarLabelViewNameProfile(
                  name: 'Taylor from Sunday Social',
                ),
            identityName: 'Taylor from Sunday Social',
            identityPhotoUrl: null,
            onIdentityTap: widgetbookNoop,
            tone: CatchTopBarTone.surface,
            emphasis: CatchTopBarEmphasis.divided,
            actions: [
              CatchActionMenu<String>(
                tooltip: 'Chat actions',
                onSelected: widgetbookIgnoreString,
                items: [
                  CatchActionMenuItem(
                    value: 'share',
                    label: 'Share card',
                    icon: CatchIcons.platformShare(
                      platform: Theme.of(context).platform,
                    ),
                  ),
                  CatchActionMenuItem(
                    value: 'report',
                    label: 'Report',
                    icon: CatchIcons.flag,
                  ),
                  CatchActionMenuItem(
                    value: 'block',
                    label: 'Block',
                    icon: CatchIcons.block,
                    isDestructive: true,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'surface',
        child: const WidgetbookContractTopBarFrame(
          child: CatchTopBar.route(
            title: 'Surface',
            tone: CatchTopBarTone.surface,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'divider',
        child: const WidgetbookContractTopBarFrame(
          child: CatchTopBar.route(
            title: 'Divider',
            emphasis: CatchTopBarEmphasis.divided,
          ),
        ),
      ),

      WidgetbookContractStateCard(
        label: 'root-title',
        child: WidgetbookContractTopBarFrame(
          child: Builder(
            builder: (context) => CatchTopBar.screen(title: 'Your people'),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'root-subtitle-actions',
        child: WidgetbookContractTopBarFrame(
          child: Builder(
            builder: (context) => CatchTopBar.screen(
              title: 'Your people',
              subtitle: 'Keep your shared plans in view.',
              actions: [
                CatchIconAction.toolbar(
                  icon: CatchIcons.more,
                  tooltip: 'More actions',
                  onPressed: widgetbookNoop,
                ),
              ],
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'primary-rail',
        child: WidgetbookContractTopBarFrame(
          child: Builder(
            builder: (context) => CatchTopBar.primaryRail(title: 'People'),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchMenu,
  path: '[Core primitives]/Navigation',
)
Widget catchMenuContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchMenu',
    contractId: 'catch.menu',
    states: const [
      'default',
      'action-row',
      'choice-row',
      'choice-row-selected',
      'disabled-row',
      'danger-row',
      'with-icons',
      'with-sublabels',
      'sectioned',
      'scrolling',
      'compact-selection-sheet',
      'anchored-selection',
      'anchored-trigger',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'anchored-trigger',
        child: CatchMenu<String>.anchored(
          items: const [CatchMenuItem(value: 'share', label: 'Share')],
          builder: (context, controller, child) =>
              CatchButton.text(label: 'Open menu', onPressed: controller.open),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'panel rows',
        child: CatchMenu<String>(
          width: WidgetbookPreviewLayout.mediumComponentWidth,
          onSelected: (value, _) => widgetbookIgnoreString(value),
          items: [
            CatchMenuItem(
              value: 'share',
              label: 'Share card',
              sublabel: 'Send the event link',
              icon: CatchIcons.share,
            ),
            CatchMenuItem(
              value: 'going',
              label: 'Going',
              selected: true,
              variant: CatchMenuItemVariant.choice,
              icon: CatchIcons.success,
              startsSection: true,
            ),
            CatchMenuItem(
              value: 'host-only',
              label: 'Host controls',
              enabled: false,
              icon: CatchIcons.locked,
            ),
            CatchMenuItem(
              value: 'remove',
              label: 'Remove from event',
              danger: true,
              icon: CatchIcons.delete,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'command overflow',
        child: CatchActionMenu<String>(
          tooltip: 'More actions',
          onSelected: widgetbookIgnoreString,
          items: [
            CatchActionMenuItem(
              value: 'share',
              label: 'Share',
              icon: CatchIcons.share,
            ),
            CatchActionMenuItem(
              value: 'report',
              label: 'Report',
              sublabel: 'Send to safety',
              icon: CatchIcons.flag,
            ),
            CatchActionMenuItem(
              value: 'block',
              label: 'Block',
              icon: CatchIcons.block,
              isDestructive: true,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'adaptive selection',
        description:
            'Open on compact and wider viewports to compare sheet and anchor.',
        child: CatchSelectionMenu<String>.control(
          title: 'Sort customers',
          subtitle: 'Choose how customers are ordered.',
          tooltip: 'Sort customers',
          value: 'last-seen',
          items: const [
            CatchSelectionMenuItem(value: 'last-seen', label: 'Last seen'),
            CatchSelectionMenuItem(
              value: 'most-attended',
              label: 'Most attended',
            ),
            CatchSelectionMenuItem(value: 'name', label: 'Name'),
          ],
          labelBuilder: (item) => 'Sort: ${item.label}',
          onSelected: widgetbookIgnoreString,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchCollapsedHeaderTitle,
  path: '[Core primitives]/Navigation',
)
Widget catchCollapsedSliverTitleContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'CatchCollapsedHeaderTitle',
    contractId: 'catch.top_bar.collapsed_sliver_title',
    states: ['collapsed', 'mid-scroll', 'expanded', 'no-settings'],
    children: [
      WidgetbookContractStateCard(
        label: 'collapsed',
        child: _CollapsedTitleFrame(title: 'Sundowner 5K', currentExtent: 56),
      ),
      WidgetbookContractStateCard(
        label: 'mid-scroll',
        child: _CollapsedTitleFrame(title: 'Sundowner 5K', currentExtent: 72),
      ),
      WidgetbookContractStateCard(
        label: 'expanded',
        child: _CollapsedTitleFrame(title: 'Sundowner 5K', currentExtent: 160),
      ),
      WidgetbookContractStateCard(
        label: 'no-settings',
        child: _CollapsedTitleFrame(
          title: 'Standalone preview title',
          currentExtent: null,
        ),
      ),
    ],
  );
}

class _CollapsedTitleFrame extends StatelessWidget {
  const _CollapsedTitleFrame({
    required this.title,
    required this.currentExtent,
  });

  final String title;
  final double? currentExtent;

  @override
  Widget build(BuildContext context) {
    Widget titleWidget = CatchCollapsedHeaderTitle(title: title);

    final extent = currentExtent;
    if (extent != null) {
      titleWidget = FlexibleSpaceBarSettings(
        toolbarOpacity: 1,
        minExtent: 56,
        maxExtent: 160,
        currentExtent: extent,
        child: titleWidget,
      );
    }

    return CatchSurface(
      width: WidgetbookPreviewLayout.standardContractWidth,
      borderRole: CatchBorderRole.separator,
      padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s4),
      child: SizedBox(
        height: WidgetbookPreviewLayout.navigationBarHeight,
        child: Align(alignment: Alignment.centerLeft, child: titleWidget),
      ),
    );
  }
}
