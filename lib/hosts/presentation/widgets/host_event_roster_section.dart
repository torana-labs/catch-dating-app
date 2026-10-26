import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Event roster content. The Host router owns its parent and pane placement.
class HostEventRosterSection extends StatelessWidget {
  const HostEventRosterSection({
    super.key,
    required this.bookedCount,
    required this.onClose,
    required this.child,
    this.onMessageGuests,
  });
  final int bookedCount;
  final VoidCallback onClose;
  final Widget child;
  final VoidCallback? onMessageGuests;
  @override
  Widget build(BuildContext context) => CatchRouteScaffold(
    topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
      title: context.l10n.hostsHostEventRosterDrawerTitle,
      subtitle: context.l10n.hostsHostEventRosterDrawerCount(
        count: bookedCount,
      ),
      leading: CatchIconAction.toolbar(
        icon: CatchIcons.back,
        tooltip: context.l10n.hostsHostEventRosterDrawerClose,
        onPressed: onClose,
      ),
      actions: [
        if (onMessageGuests != null)
          CatchIconAction.toolbar(
            icon: CatchIcons.conversations,
            tooltip: context.l10n.hostsHostEventRosterDrawerMessageGuests,
            onPressed: onMessageGuests,
          ),
      ],
      emphasis: scrolledUnder
          ? CatchTopBarEmphasis.divided
          : CatchTopBarEmphasis.plain,
    ),
    body: CatchRouteBody.fullBleed(child: child),
  );
}
