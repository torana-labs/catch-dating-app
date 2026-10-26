part of 'host_audience_view.dart';

enum HostAudienceMenuAction { reviewDuplicates, export, automations }

/// Shared Audience header; the canonical root scaffold owns each tab's body.
class HostAudienceHeader extends StatelessWidget {
  const HostAudienceHeader({
    super.key,
    this.organizerId,
    this.primaryAction,
    this.menuItems = const [],
    this.onMenuAction,
    this.search,
  });

  final String? organizerId;
  final CatchTopBarPrimaryButton? primaryAction;
  final List<CatchActionMenuItem<HostAudienceMenuAction>> menuItems;
  final ValueChanged<HostAudienceMenuAction>? onMenuAction;
  final CatchTopBarSearch? search;

  @override
  Widget build(BuildContext context) => CatchTopBar.primaryRail(
    title: context.l10n.hostNavigationAudience,
    actions: [
      ?primaryAction,
      if (organizerId != null)
        CatchActionMenu<HostAudienceMenuAction>(
          tooltip: context.l10n.hostCustomersMoreActions,
          items: [
            ...menuItems,
            CatchActionMenuItem(
              value: HostAudienceMenuAction.automations,
              label: context.l10n.hostFormAutomationsTitle,
              icon: CatchIcons.magic,
            ),
          ],
          onSelected: (action) {
            if (action == HostAudienceMenuAction.automations) {
              context.pushNamed(
                Routes.hostAudienceAutomationsScreen.name,
                queryParameters: {'organizerId': organizerId!},
              );
            } else {
              onMenuAction?.call(action);
            }
          },
        ),
    ],
    search: search,
  );
}
