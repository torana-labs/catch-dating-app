import 'package:catch_dating_app/user_profile/presentation/widgets/profile_sliver_header.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Profile title',
  type: CatchLegacyTopBar,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profileTitleStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'CatchLegacyTopBar',
    contractId: 'section.profile.self.title',
    children: [
      WidgetbookProfileStateCard(
        label: 'title row',
        child: const WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileCompactPreviewHeight,
          child: WidgetbookProfileProfileHeaderRouterFrame(
            child: CatchLegacyTopBar.primaryRail(
              title: 'Your profile',
              actions: [ProfileSettingsButton()],
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile tab bar',
  type: ProfileTabBar,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profileTabBarStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'ProfileTabBar',
    contractId: 'section.profile.self.tab_bar',
    children: [
      WidgetbookProfileStateCard(
        label: 'edit selected',
        child: const WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileDensePreviewHeight,
          child: _ProfileTabBarPreview(initialIndex: 0),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'preview selected',
        child: const WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileDensePreviewHeight,
          child: _ProfileTabBarPreview(initialIndex: 1),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'insights selected',
        child: const WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileDensePreviewHeight,
          child: _ProfileTabBarPreview(initialIndex: 2),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile settings button',
  type: ProfileSettingsButton,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profileSettingsButtonStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'ProfileSettingsButton',
    contractId: 'section.profile.self.settings_button',
    children: [
      WidgetbookProfileStateCard(
        label: 'settings action',
        child: const WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileDensePreviewHeight,
          child: WidgetbookProfileProfileHeaderRouterFrame(
            child: Center(child: ProfileSettingsButton()),
          ),
        ),
      ),
    ],
  );
}

class _ProfileTabBarPreview extends StatefulWidget {
  const _ProfileTabBarPreview({required this.initialIndex});

  final int initialIndex;

  @override
  State<_ProfileTabBarPreview> createState() => _ProfileTabBarPreviewState();
}

class _ProfileTabBarPreviewState extends State<_ProfileTabBarPreview>
    with SingleTickerProviderStateMixin {
  late final TabController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TabController(
      length: 3,
      initialIndex: widget.initialIndex,
      vsync: this,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ProfileTabBar(controller: _controller);
}
