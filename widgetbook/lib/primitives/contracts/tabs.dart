import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchPageTabBar,
  path: '[Core primitives]/Selection',
)
Widget catchPageTabBarContractStates(BuildContext context) {
  const hostOptions = [
    CatchOption(value: 'organizer', label: 'Organizer'),
    CatchOption(value: 'edit', label: 'Edit'),
    CatchOption(value: 'insights', label: 'Insights'),
    CatchOption(value: 'preview', label: 'Preview'),
  ];
  const settingsOptions = [
    CatchOption(value: 'edit', label: 'Edit'),
    CatchOption(value: 'preview', label: 'Preview'),
  ];

  return WidgetbookContractFrame(
    title: 'CatchPageTabBar',
    contractId: 'catch.tab_rail',
    states: const [
      'two-option',
      'four-option',
      'selected-middle',
      'operational',
      'controlled-first',
      'controlled-second',
      'swipe-interpolated',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'two-option',
        child: WidgetbookContractFieldWidth(
          child: CatchPageTabBar<String>(
            selected: 'edit',
            onChanged: widgetbookIgnoreString,
            options: settingsOptions,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'four-option',
        child: WidgetbookContractFieldWidth(
          child: CatchPageTabBar<String>(
            selected: 'organizer',
            onChanged: widgetbookIgnoreString,
            options: hostOptions,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'selected-middle',
        child: WidgetbookContractFieldWidth(
          child: CatchPageTabBar<String>(
            selected: 'insights',
            onChanged: widgetbookIgnoreString,
            options: hostOptions,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'operational',
        child: WidgetbookContractFieldWidth(
          child: CatchPageTabBar<String>(
            selected: 'room',
            onChanged: widgetbookIgnoreString,
            variant: CatchChoiceInputVariant.operational,
            options: [
              CatchOption(value: 'now', label: 'Now', icon: CatchIcons.time),
              CatchOption(
                value: 'guests',
                label: 'Guests',
                icon: CatchIcons.people,
              ),
              CatchOption(value: 'room', label: 'Room', icon: CatchIcons.grid),
            ],
          ),
        ),
      ),
      for (final (label, index, offset) in [
        ('controlled-first', 0, 0.0),
        ('controlled-second', 1, 0.0),
        ('swipe-interpolated', 0, 0.5),
      ])
        WidgetbookContractStateCard(
          label: label,
          child: WidgetbookContractFieldWidth(
            child: _PageTabBarControllerDemo(index: index, offset: offset),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchTabBar,
  path: '[Core primitives]/Navigation',
)
Widget catchTabDockContractStates(BuildContext context) {
  var transitionActive = 'clubs';
  return WidgetbookContractFrame(
    title: 'CatchTabBar',
    contractId: 'catch.tab_bar',
    states: const [
      'selected',
      'unselected',
      'with-active-icon',
      'with-badge',
      'disabled-readonly',
      'safe-area',
      'text-scale',
      'reduced-motion',
      'with-four-tabs',
      'first-selected',
      'last-selected',
      'selection-transition',
      'contact-preview',
      'press-and-slide',
      'pointer-focus',
      'long-press-secondary-action',
      'rail',
      'sidebar',
      'pinned-more',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'selected',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: widgetbookContractTabItems,
            active: 'explore',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'unselected',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: widgetbookContractTabItems,
            active: 'clubs',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-active-icon',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: widgetbookContractTabItems,
            active: 'matches',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-badge',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: widgetbookContractTabItems,
            active: 'matches',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled-readonly',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: widgetbookContractTabItems,
            active: 'explore',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'safe-area',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: widgetbookContractTabItems,
            active: 'clubs',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'text-scale',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(2)),
            child: CatchTabBar<String>(
              items: widgetbookContractTabItems,
              active: 'explore',
              onChanged: widgetbookIgnoreString,
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'reduced-motion',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: CatchTabBar<String>(
              items: widgetbookContractTabItems,
              active: 'explore',
              onChanged: widgetbookIgnoreString,
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-four-tabs',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: _contractFourTabBarItems,
            active: 'explore',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'first-selected',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: _contractFourTabBarItems,
            active: _contractFourTabBarItems.first.id,
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'last-selected',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: _contractFourTabBarItems,
            active: _contractFourTabBarItems.last.id,
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label:
            'selection-transition · contact-preview · press-and-slide · pointer-focus',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: StatefulBuilder(
            builder: (context, setState) => CatchTabBar<String>(
              items: _contractFourTabBarItems,
              active: transitionActive,
              onChanged: (next) => setState(() => transitionActive = next),
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'long-press-secondary-action',
        child: SizedBox(
          width: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchTabBar<String>(
            items: [
              ...widgetbookContractTabItems,
              CatchTabBarItem<String>(
                id: 'organizer',
                icon: CatchIcons.person,
                activeIcon: CatchIcons.person,
                label: 'Organizer',
                onLongPress: widgetbookNoop,
                semanticHint: 'Hold to switch organizer',
              ),
            ],
            active: 'explore',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      for (final (label, description, width, sizeClass) in const [
        (
          'rail',
          'From 600 px: the identity compact in the header row, the action as a square, a rule between sections.',
          834.0,
          CatchWindowSize.medium,
        ),
        (
          'sidebar',
          'From 840 px: the identity, a full-width action, section headings, counts and the signed-in footer.',
          1180.0,
          CatchWindowSize.expanded,
        ),
      ])
        WidgetbookContractStateCard(
          label: label,
          description: description,
          child: WidgetbookShellWindow(
            width: width,
            height: 520,
            sizeClass: sizeClass,
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              child: widgetbookShellNavigation(active: 'people'),
            ),
          ),
        ),
      WidgetbookContractStateCard(
        label: 'pinned-more',
        description:
            'Pinned items on the phone bar, then More, current while a folded destination is.',
        child: WidgetbookShellWindow(
          width: 390,
          sizeClass: CatchWindowSize.compact,
          child: CatchTabBar<String>(
            items: widgetbookShellItems(pinned: true),
            active: 'organizer',
            onChanged: widgetbookIgnoreString,
            more: const CatchTabBarMore(label: 'More', badge: 4),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchTabBarIdentity,
  path: '[Core primitives]/Navigation',
)
Widget catchTabBarIdentityContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchTabBarIdentity',
    contractId: 'catch.tab_bar.identity',
    states: const ['full', 'compact', 'note', 'switcher'],
    children: [
      for (final (label, width, identity) in const [
        ('full', 212.0, CatchTabBarIdentity(name: 'Meher Rao')),
        ('compact', 80.0, CatchTabBarIdentity(name: 'Lantern Lane Social')),
        (
          'note',
          212.0,
          CatchTabBarIdentity(name: 'Meher Rao', note: 'Settings'),
        ),
        (
          'switcher',
          212.0,
          CatchTabBarIdentity(
            name: 'Lantern Lane Social',
            note: 'Switch organiser',
            switcher: true,
          ),
        ),
      ])
        WidgetbookContractStateCard(
          label: label,
          child: WidgetbookShellWindow(
            width: width,
            sizeClass: CatchWindowSize.expanded,
            child: Material(type: MaterialType.transparency, child: identity),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchPageIndicator,
  path: '[Core primitives]/Navigation',
)
Widget catchPageDotsContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'CatchPageIndicator',
    contractId: 'catch.page_dots',
    states: [
      'first-selected',
      'middle-selected',
      'semantic-label',
      'custom-size',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'first-selected',
        child: CatchPageIndicator(selectedIndex: 0, itemCount: 4),
      ),
      WidgetbookContractStateCard(
        label: 'middle-selected',
        child: CatchPageIndicator(selectedIndex: 2, itemCount: 4),
      ),
      WidgetbookContractStateCard(
        label: 'semantic-label',
        child: CatchPageIndicator(
          selectedIndex: 1,
          itemCount: 3,
          semanticLabel: 'Page 2 of 3',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-size',
        child: CatchPageIndicator(
          selectedIndex: 1,
          itemCount: 3,
          selectedWidth: 32,
          dotWidth: 8,
          dotHeight: 8,
        ),
      ),
    ],
  );
}

final _contractFourTabBarItems = [
  CatchTabBarItem<String>(
    id: 'home',
    icon: CatchIcons.home,
    activeIcon: CatchIcons.home,
    label: 'Home',
  ),
  ...widgetbookContractTabItems,
];

class _PageTabBarControllerDemo extends StatefulWidget {
  const _PageTabBarControllerDemo({required this.index, required this.offset});
  final int index;
  final double offset;
  @override
  State<_PageTabBarControllerDemo> createState() =>
      _PageTabBarControllerDemoState();
}

class _PageTabBarControllerDemoState extends State<_PageTabBarControllerDemo>
    with SingleTickerProviderStateMixin {
  late final TabController _controller = TabController(
    length: 2,
    initialIndex: widget.index,
    vsync: this,
  )..offset = widget.offset;
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchPageTabBar<String>.controlled(
    controller: _controller,
    options: const [
      CatchOption(value: 'edit', label: 'Edit'),
      CatchOption(value: 'preview', label: 'Preview'),
    ],
  );
}
