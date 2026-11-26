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
