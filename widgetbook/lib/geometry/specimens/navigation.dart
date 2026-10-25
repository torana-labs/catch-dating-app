import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/geometry_preview.dart';

@widgetbook.UseCase(
  name: 'Geometry matrix',
  type: CatchTabBar,
  path: '[Geometry system]',
)
Widget bottomNavigationGeometryMatrix(BuildContext context) {
  final items = _navigationItems;

  return widgetbookGeometryPage(
    context,
    title: 'Bottom navigation',
    contractIds: const ['catch.tab_bar'],
    principles: const [
      'Destinations share one selection indicator and equal destination lanes.',
      'Platform adaptation changes the outer chrome, not destination identity.',
      'Safe-area space belongs to navigation rather than each screen body.',
    ],
    children: [
      widgetbookGeometrySpecimen(
        context,
        label: 'Anchored Material chrome',
        child: SizedBox(
          width: widgetbookGeometryPhoneWidth,
          child: Theme(
            data: Theme.of(context).copyWith(platform: TargetPlatform.android),
            child: CatchTabBar<String>(
              items: items,
              active: 'explore',
              onChanged: widgetbookIgnoreString,
            ),
          ),
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Floating Cupertino chrome',
        description:
            'The same destinations move into a floating plane with navigation-owned bottom clearance.',
        child: SizedBox(
          width: widgetbookGeometryPhoneWidth,
          child: Theme(
            data: Theme.of(context).copyWith(platform: TargetPlatform.iOS),
            child: MediaQuery(
              data: MediaQuery.of(context).copyWith(
                padding: const EdgeInsets.only(bottom: CatchSpacing.s6),
              ),
              child: CatchTabBar<String>(
                items: items,
                active: 'chats',
                onChanged: widgetbookIgnoreString,
              ),
            ),
          ),
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Large text',
        description:
            'Destination geometry reflows within the navigation owner at text scale 2.0.',
        child: SizedBox(
          width: widgetbookGeometryPhoneWidth,
          child: MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(2)),
            child: CatchTabBar<String>(
              items: items,
              active: 'home',
              onChanged: widgetbookIgnoreString,
            ),
          ),
        ),
      ),
    ],
  );
}

final _navigationItems = <CatchTabBarItem<String>>[
  CatchTabBarItem(
    id: 'home',
    icon: CatchIcons.home,
    activeIcon: CatchIcons.home,
    label: 'Home',
  ),
  CatchTabBarItem(
    id: 'explore',
    icon: CatchIcons.people,
    activeIcon: CatchIcons.people,
    label: 'Explore',
  ),
  CatchTabBarItem(
    id: 'chats',
    icon: CatchIcons.chat,
    activeIcon: CatchIcons.chat,
    label: 'Chats',
    badgeCount: 3,
  ),
  CatchTabBarItem(
    id: 'you',
    icon: CatchIcons.person,
    activeIcon: CatchIcons.person,
    label: 'You',
  ),
];
