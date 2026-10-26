import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchButton,
  path: '[Core primitives]/Actions',
)
Widget catchButtonContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchButton',
    contractId: 'catch.button',
    states: const [
      'default',
      'pressed',
      'hovered',
      'focused',
      'disabled',
      'loading',
      'full-width',
      'with-icon',
      'rounded',
      'large-text',
      'reduced-motion',
      'command',
      'selection',
      'floating-label',
      'floating-label-with-icon',
      'floating-label-with-value',
      'floating-with-count',
      'floating-focused',
      'floating-semantic-label',
      'floating-text-scale-reflow',
      'text-primary',
      'text-neutral',
      'text-danger',
      'text-disabled',
      'text-custom-color',
      'text-custom-padding',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'text-primary / text-neutral / text-danger / text-disabled',
        child: WidgetbookContractWrap(
          children: [
            for (final tone in CatchButtonTone.values)
              CatchButton.text(
                label: 'Retry',
                tone: tone,
                onPressed: widgetbookNoop,
              ),
            const CatchButton.text(label: 'Disabled', onPressed: null),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'text-custom-color / text-custom-padding',
        child: CatchButton.text(
          label: 'Inline action',
          onPressed: widgetbookNoop,
          foregroundColor: t.primary,
          padding: const EdgeInsets.all(CatchSpacing.s3),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'selection',
        child: SizedBox(
          width: 132,
          child: CatchButton.selection(
            label: 'Thiruvananthapuram',
            leading: Icon(CatchIcons.locationOnOutlined),
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'command',
        child: CatchButton.command(
          label: 'Sort: Last seen',
          trailing: Icon(CatchIcons.expandMoreRounded),
          onPressed: () {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'default',
        child: WidgetbookContractWrap(
          children: [
            CatchButton(label: 'Continue', onPressed: widgetbookNoop),
            CatchButton(
              label: 'Secondary',
              variant: CatchButtonVariant.secondary,
              onPressed: widgetbookNoop,
            ),
            CatchButton(
              label: 'Quiet',
              variant: CatchButtonVariant.quiet,
              onPressed: widgetbookNoop,
            ),
            CatchButton(
              label: 'Danger',
              variant: CatchButtonVariant.danger,
              onPressed: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'pressed / hovered',
        description: 'Hover or press this target to review transient overlays.',
        child: CatchButton(
          label: 'Interactive target',
          accentColor: t.like,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focused',
        description:
            'Use keyboard traversal to inspect the semantic focus ring.',
        child: CatchButton(
          label: 'Keyboard focus target',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: const CatchButton(label: 'Unavailable', onPressed: null),
      ),
      WidgetbookContractStateCard(
        label: 'loading',
        child: CatchButton(
          label: 'Joining',
          status: CatchButtonStatus.loading,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'full-width',
        child: CatchButton(
          label: 'Create event',
          fullWidth: true,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-icon',
        child: CatchButton(
          label: 'Add to calendar',
          leading: Icon(CatchIcons.calendarAdd),
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'rounded editorial bar',
        child: CatchButton(
          label: 'Review & publish',
          mode: CatchButtonMode.rounded,
          fullWidth: true,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'large-text',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: CatchButton(
            label: 'Review every submitted response',
            fullWidth: true,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'reduced-motion',
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: CatchButton(label: 'Continue', onPressed: widgetbookNoop),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'floating-label',
        child: CatchButton.floating(
          label: '24 places',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'floating-label-with-icon',
        child: CatchButton.floating(
          icon: CatchIcons.tuneRounded,
          label: 'Filters',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'floating-label-with-value',
        child: CatchButton.floating(
          icon: CatchIcons.map,
          label: 'Map',
          value: '12 events',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'floating-with-count',
        child: CatchButton.floating(
          icon: CatchIcons.tuneRounded,
          label: 'Filters',
          count: 3,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'floating-focused',
        description:
            'Use keyboard traversal to inspect the semantic focus ring.',
        child: CatchButton.floating(
          icon: CatchIcons.tuneRounded,
          label: 'Keyboard focus target',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'floating-semantic-label',
        child: CatchButton.floating(
          icon: CatchIcons.listRounded,
          label: 'List',
          semanticsLabel: 'Show list view',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'floating-text-scale-reflow',
        child: SizedBox(
          width: WidgetbookPreviewLayout.compactControlWidth,
          child: CatchButton.floating(
            icon: CatchIcons.tuneRounded,
            label: 'Very specific active filters',
            count: 12,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchButtonContentRow,
  path: '[Core primitives]/Actions',
)
Widget catchButtonLabelContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  final textStyle = CatchTextStyles.buttonMd(context);

  return WidgetbookContractFrame(
    title: 'CatchButtonContentRow',
    contractId: 'catch.button.label',
    states: const ['label', 'with-icon', 'full-width'],
    children: [
      WidgetbookContractStateCard(
        label: 'label / icon',
        child: WidgetbookContractWrap(
          children: [
            CatchButtonContentRow(
              label: 'Continue',
              color: t.primary,
              textStyle: textStyle,
            ),
            CatchButtonContentRow(
              label: 'Add to calendar',
              color: t.ink,
              leading: Icon(CatchIcons.calendarAdd),
              textStyle: textStyle,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'full-width bounded label',
        child: SizedBox(
          width: WidgetbookPreviewLayout.fullWidthButtonWidth,
          child: CatchButtonContentRow(
            label: 'Very long call to action label',
            color: t.primary,
            leading: Icon(CatchIcons.sparkle),
            fullWidth: true,
            textStyle: textStyle,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchLoadingIndicator,
  path: '[Core primitives]/Actions',
)
Widget catchButtonLoadingDotsContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookCatalogFrame(
    title: 'CatchLoadingIndicator.dots',
    catalogId: 'core.widgets.catch_loading_indicator',
    children: [
      WidgetbookContractStateCard(
        label: 'dot tones',
        child: WidgetbookContractWrap(
          children: [
            CatchLoadingIndicator.dots(color: t.primary),
            const CatchLoadingIndicator.dots(color: CatchTokens.editorialWhite),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchIconAction,
  path: '[Core primitives]/Actions',
)
Widget catchIconButtonContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchIconAction',
    contractId: 'catch.icon_button',
    states: const [
      'default',
      'active',
      'focused',
      'disabled',
      'bordered',
      'float',
      'plain',
      'counted',
      'toolbar',
      'glyph-emphasis',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'toolbar',
        child: CatchIconAction.toolbar(
          icon: CatchIcons.close,
          tooltip: 'Close',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'glyph-emphasis',
        child: WidgetbookContractWrap(
          children: [
            for (final emphasis in CatchIconActionEmphasis.values)
              CatchIconAction.icon(
                icon: CatchIcons.savedOutlined,
                tooltip: 'Save',
                active: true,
                emphasis: emphasis,
                onPressed: widgetbookNoop,
              ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'default / bordered',
        child: WidgetbookContractWrap(
          children: [
            CatchIconAction.icon(
              icon: CatchIcons.search,
              onPressed: widgetbookNoop,
            ),
            CatchIconAction.icon(
              icon: CatchIcons.notificationsOutlined,
              onPressed: widgetbookNoop,
            ),
            CatchIconAction.icon(
              icon: CatchIcons.moreHorizRounded,
              onPressed: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'active',
        child: CatchIconAction.icon(
          icon: CatchIcons.checkCircle,
          active: true,
          accent: t.like,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focused',
        description:
            'Use keyboard traversal to inspect the semantic focus ring.',
        child: CatchIconAction.icon(
          icon: CatchIcons.search,
          tooltip: 'Keyboard focus target',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: CatchIconAction.icon(
          icon: CatchIcons.close,
          status: CatchIconActionStatus.disabled,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'float',
        child: WidgetbookContractPhotoPanel(
          child: CatchIconAction.icon(
            icon: CatchIcons.close,
            variant: CatchIconActionVariant.float,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'plain',
        child: CatchIconAction.icon(
          icon: CatchIcons.tuneRounded,
          variant: CatchIconActionVariant.plain,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'counted / zero / overflow',
        child: WidgetbookContractWrap(
          children: [
            CatchIconAction.counted(
              icon: CatchIcons.notificationsNoneRounded,
              count: 0,
              tooltip: 'Notifications',
              onPressed: widgetbookNoop,
            ),
            CatchIconAction.counted(
              icon: CatchIcons.notificationsRounded,
              count: 3,
              tooltip: 'Notifications, 3 unread',
              onPressed: widgetbookNoop,
            ),
            CatchIconAction.counted(
              icon: CatchIcons.notificationsRounded,
              count: 124,
              tooltip: 'Notifications, 124 unread',
              onPressed: widgetbookNoop,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchChoiceButton,
  path: '[Core primitives]/Selection',
)
Widget catchChoiceButtonContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchChoiceButton',
    contractId: 'catch.chip.field.segmented_button',
    states: const ['selected', 'unselected', 'mono', 'operational', 'summary'],
    children: [
      WidgetbookContractStateCard(
        label: 'summary',
        child: CatchChoiceButton<int>(
          option: const CatchOption(value: 1, label: 'Returning 148'),
          selected: true,
          variant: CatchChoiceInputVariant.summary,
          onTap: () {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'selected',
        child: CatchChoiceButton<String>(
          option: const CatchOption(value: 'all', label: 'All'),
          selected: true,
          selectedRule: t.ink,
          variant: CatchChoiceInputVariant.label,
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'unselected',
        child: CatchChoiceButton<String>(
          option: const CatchOption(value: 'saved', label: 'Saved'),
          selected: false,
          selectedRule: t.ink,
          variant: CatchChoiceInputVariant.label,
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'mono',
        child: CatchChoiceButton<String>(
          option: const CatchOption(value: 'nearby', label: 'Nearby'),
          selected: true,
          selectedRule: t.primary,
          variant: CatchChoiceInputVariant.mono,
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'operational',
        child: CatchChoiceButton<String>(
          option: CatchOption(
            value: 'room',
            label: 'Room',
            icon: CatchIcons.gridViewRounded,
          ),
          selected: true,
          selectedRule: t.ink,
          variant: CatchChoiceInputVariant.operational,
          onTap: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchNavigationButton,
  path: '[Core primitives]/Navigation',
)
Widget catchNavigationButtonContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchNavigationButton',
    contractId: 'catch.tab_bar.button',
    states: const [
      'selected',
      'unselected',
      'badge',
      'pressed',
      'hovered',
      'focused',
      'preview',
      'retained-selection',
      'rail-compact',
      'rail-expanded',
    ],
    children: [
      for (final status in [
        CatchNavigationButtonStatus.preview,
        CatchNavigationButtonStatus.retainedSelection,
      ])
        WidgetbookContractStateCard(
          label: status.name,
          child: SizedBox(
            width: WidgetbookPreviewLayout.compactItemWidth,
            height: CatchLayout.tabBarExtent,
            child: CatchNavigationButton<String>.sharedIndicator(
              item: widgetbookContractTabItems[0],
              status: status,
              showSelectedLabel: false,
              onTap: widgetbookNoop,
            ),
          ),
        ),
      for (final expanded in [false, true])
        WidgetbookContractStateCard(
          label: expanded ? 'rail-expanded' : 'rail-compact',
          child: SizedBox(
            width: expanded
                ? WidgetbookPreviewLayout.fullWidthButtonWidth
                : WidgetbookPreviewLayout.compactItemWidth,
            child: CatchNavigationButton<String>.rail(
              item: widgetbookContractTabItems[2],
              selected: true,
              expanded: expanded,
              onTap: widgetbookNoop,
            ),
          ),
        ),
      WidgetbookContractStateCard(
        label: 'button states',
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: WidgetbookPreviewLayout.compactItemWidth,
              child: CatchNavigationButton<String>(
                item: widgetbookContractTabItems[0],
                selected: true,
                onTap: widgetbookNoop,
              ),
            ),
            const SizedBox(width: CatchSpacing.s4),
            SizedBox(
              width: WidgetbookPreviewLayout.compactItemWidth,
              child: CatchNavigationButton<String>(
                item: widgetbookContractTabItems[1],
                selected: false,
                onTap: widgetbookNoop,
              ),
            ),
            const SizedBox(width: CatchSpacing.s4),
            SizedBox(
              width: WidgetbookPreviewLayout.compactItemWidth,
              child: CatchNavigationButton<String>(
                item: widgetbookContractTabItems[2],
                selected: true,
                onTap: widgetbookNoop,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}
