import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

enum SelfProfileTab { edit, preview, insights, forms }

class ProfileTabBar extends StatelessWidget
    implements CatchPrimaryRail, CatchScaledPreferredSize {
  const ProfileTabBar({super.key, required this.controller});

  final TabController controller;

  @override
  Size get preferredSize => Size.fromHeight(CatchPageTabBar.minimumHeight);

  @override
  Size preferredSizeFor(BuildContext context, {double? width}) =>
      Size.fromHeight(CatchPageTabBar.heightFor(context));

  @override
  Widget build(BuildContext context) {
    return CatchPageTabBar<SelfProfileTab>.controlled(
      controller: controller,
      options: [
        CatchOption(
          value: SelfProfileTab.edit,
          label: context.l10n.userProfileProfileSliverHeaderLabelEdit,
        ),
        CatchOption(
          value: SelfProfileTab.preview,
          label: context.l10n.userProfileProfileSliverHeaderLabelPreview,
        ),
        CatchOption(
          value: SelfProfileTab.insights,
          label: context.l10n.userProfileProfileSliverHeaderLabelInsights,
        ),
        CatchOption(
          value: SelfProfileTab.forms,
          label: context.l10n.formProfilesTabLabel,
        ),
      ],
    );
  }
}

class ProfileSettingsButton extends StatelessWidget {
  const ProfileSettingsButton({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchIconAction.toolbar(
      icon: CatchIcons.settings,
      tooltip: context.l10n.userProfileProfileSliverHeaderTooltipSettings,
      onPressed: () => context.pushNamed(Routes.settingsScreen.name),
    );
  }
}
