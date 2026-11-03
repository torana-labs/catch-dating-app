import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum HostCustomerDetailView { overview, details, memory, history }

/// Person-owned peer controls. The workspace owns their height and placement.
class HostCustomerDetailTabBar extends StatelessWidget
    implements CatchPrimaryRail, CatchScaledPreferredSize {
  const HostCustomerDetailTabBar({
    super.key,
    required this.selected,
    required this.onChanged,
  });
  final HostCustomerDetailView selected;
  final ValueChanged<HostCustomerDetailView> onChanged;

  @override
  Size get preferredSize => Size.fromHeight(CatchPageTabBar.minimumHeight);
  @override
  Size preferredSizeFor(BuildContext context, {double? width}) =>
      Size.fromHeight(CatchPageTabBar.heightFor(context));

  @override
  Widget build(BuildContext context) => CatchPageTabBar<HostCustomerDetailView>(
    groupKey: const ValueKey('host-customer-detail-tabs'),
    scrollable: true,
    selected: selected,
    onChanged: onChanged,
    options: [
      CatchOption(
        value: HostCustomerDetailView.overview,
        label: context.l10n.hostCustomersOverview,
      ),
      CatchOption(
        value: HostCustomerDetailView.details,
        label: context.l10n.hostCustomersDetails,
      ),
      CatchOption(
        value: HostCustomerDetailView.memory,
        label: context.l10n.hostCustomersNotes,
      ),
      CatchOption(
        value: HostCustomerDetailView.history,
        label: context.l10n.hostCustomersTimeline,
      ),
    ],
  );
}
