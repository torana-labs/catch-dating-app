import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

part 'host_audience_header.dart';

enum HostAudienceView { people, audiences, forms, responses, requests }

HostAudienceView hostAudienceViewFromName(String? name) =>
    HostAudienceView.values.firstWhere(
      (view) => view.name == name,
      orElse: () => HostAudienceView.people,
    );

/// Canonical Audience destination owner for route-level loading, auth, error,
/// and no-organizer states.
///
/// Those states replace only the page body. The Audience title, peer tabs,
/// semantic body rhythm, responsive content lane, scroll ownership, and shell
/// terminal clearance remain identical to the loaded destination.
class HostAudienceStateScaffold extends StatelessWidget {
  const HostAudienceStateScaffold({
    super.key,
    required this.selected,
    required this.scrollKey,
    required this.slivers,
    this.onChanged,
  }) : assert(slivers.length > 0);

  final HostAudienceView selected;
  final PageStorageKey<String> scrollKey;
  final List<Widget> slivers;
  final ValueChanged<HostAudienceView>? onChanged;

  @override
  Widget build(BuildContext context) {
    return CatchRootScreenScaffold.withPrimaryRail(
      header: const CatchRootScreenHeader.custom(HostAudienceHeader()),
      actions: HostAudienceTabRail(
        selected: selected,
        selectionPosition: selected.index.toDouble(),
        onChanged: onChanged ?? (view) => _openView(context, view),
      ),
      body: CatchRootScreenBody.single(
        page: CatchRootScreenPageSpec.scroll(
          page: CatchRootScreenPageScrollView.standard(
            scrollKey: scrollKey,
            children: slivers,
          ),
        ),
      ),
    );
  }

  static void _openView(BuildContext context, HostAudienceView view) {
    context.goNamed(
      Routes.hostAudienceScreen.name,
      queryParameters: {'view': view.name},
    );
  }
}

class HostAudienceTabRail extends StatelessWidget
    implements CatchPrimaryRail, CatchScaledPreferredSize {
  const HostAudienceTabRail({
    super.key,
    required this.selected,
    required this.onChanged,
    this.selectionPosition,
    this.selectionAnimation,
    this.animationOffset = 0,
  }) : assert(
         (selectionPosition == null) != (selectionAnimation == null),
         'Provide exactly one static selection position or animation.',
       );

  final HostAudienceView selected;
  final double? selectionPosition;
  final Animation<double>? selectionAnimation;
  final double animationOffset;
  final ValueChanged<HostAudienceView> onChanged;

  @override
  Size get preferredSize => Size.fromHeight(CatchPageTabBar.minimumHeight);

  @override
  Size preferredSizeFor(BuildContext context, {double? width}) =>
      Size.fromHeight(CatchPageTabBar.heightFor(context));

  @override
  Widget build(BuildContext context) {
    final animation =
        selectionAnimation ??
        AlwaysStoppedAnimation<double>(selectionPosition!);
    return AnimatedBuilder(
      animation: animation,
      builder: (context, _) => CatchPageTabBar<HostAudienceView>(
        groupKey: const ValueKey<String>('host-audience-view-tabs'),
        selected: selected,
        selectionPosition: animation.value + animationOffset,
        onChanged: onChanged,
        scrollable: true,
        options: [
          CatchOption(
            value: HostAudienceView.people,
            label: context.l10n.hostCustomersViewPeople,
          ),
          CatchOption(
            value: HostAudienceView.audiences,
            label: context.l10n.hostCustomersViewAudiences,
          ),
          CatchOption(
            value: HostAudienceView.forms,
            label: context.l10n.hostFormsViewForms,
          ),
          CatchOption(
            value: HostAudienceView.responses,
            label: context.l10n.hostFormsViewResponses,
          ),
          CatchOption(
            value: HostAudienceView.requests,
            label: context.l10n.hostRequestsTab,
          ),
        ],
      ),
    );
  }
}
