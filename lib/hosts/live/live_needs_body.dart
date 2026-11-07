import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Everything that needs the host tonight, grouped as the board groups it:
/// guests who asked, guests who arrived late, then messages that did not
/// arrive. Each row keeps its one action.
class HostLiveNeedsBody extends StatelessWidget {
  const HostLiveNeedsBody({
    super.key,
    required this.needs,
    required this.now,
    required this.onOpenNeed,
    this.checking = false,
  });

  final List<HostLiveNeed> needs;
  final DateTime now;
  final ValueChanged<HostLiveNeed> onOpenNeed;

  /// A source has not answered yet, so an empty list is not an all-clear.
  final bool checking;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final groups = <(String, List<HostLiveNeed>)>[
      (
        l10n.hostLiveNeedsGuestsAsked,
        needs.whereType<HostLiveHelpNeed>().toList(),
      ),
      (
        l10n.hostLiveNeedsArrivals,
        needs.whereType<HostLiveArrivalNeed>().toList(),
      ),
      (
        l10n.hostLiveNeedsMessages,
        needs.whereType<HostLiveDeliveryNeed>().toList(),
      ),
    ];
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          CatchText(
            l10n.hostLiveNeedsPageTitle,
            variant: CatchTextVariant.pageTitle,
          ),
          if (needs.isEmpty)
            CatchSection(
              note: checking ? l10n.hostLiveNeedsChecking : null,
              empty: checking ? null : l10n.hostLiveNeedsEmpty,
              children: const [],
            ),
          for (final (label, items) in groups)
            if (items.isNotEmpty)
              CatchSection(
                title: label,
                children: [
                  for (final need in items)
                    HostLiveNeedRow(
                      key: ValueKey<String>('host-live-needs-${need.id}'),
                      need: need,
                      now: now,
                      onAction: () => onOpenNeed(need),
                    ),
                ],
              ),
        ],
      ),
    );
  }
}
