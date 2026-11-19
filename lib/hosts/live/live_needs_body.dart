import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_night_alerts_state.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Everything that needs the host tonight, grouped as the board groups it:
/// guests left out of every group and open intro requests (the old
/// console's alerts, read only), then guests who asked, guests who arrived
/// late and messages that did not arrive. Each need keeps its one action.
class HostLiveNeedsBody extends StatelessWidget {
  const HostLiveNeedsBody({
    super.key,
    required this.needs,
    required this.now,
    required this.onOpenNeed,
    this.checking = false,
    this.alerts = const HostLiveNightAlerts(),
  });

  final List<HostLiveNeed> needs;
  final DateTime now;
  final ValueChanged<HostLiveNeed> onOpenNeed;

  /// A source has not answered yet, so an empty list is not an all-clear.
  final bool checking;

  /// Guests left out of every group, then open intro requests, above the
  /// needs.
  final HostLiveNightAlerts alerts;

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
          if (alerts.leftOut.isNotEmpty)
            CatchSection(
              key: const ValueKey<String>('host-live-needs-left-out'),
              kicker: l10n.eventSuccessControlRoomExclusionAlertBody(
                count: alerts.leftOut.length,
                minutes: alerts.leftOutMinutes,
              ),
              title: l10n.eventSuccessControlRoomExclusionAlertTitle,
              children: [
                for (final person in alerts.leftOut)
                  CatchIndexRow(
                    key: ValueKey<String>('host-live-left-out-${person.uid}'),
                    title:
                        person.name ??
                        l10n.eventSuccessEventSuccessHostSharedVisiblecopyAttendee,
                    leading: CatchAvatar(
                      size: GeneratedCatchSizeTokens.avatarSm,
                      name: person.name ?? '',
                      imageUrl: person.photoUrl,
                    ),
                    marker: CatchIndexRowTone.warning,
                    onTap: null,
                  ),
              ],
            ),
          if (alerts.intros.isNotEmpty)
            CatchSection(
              key: const ValueKey<String>('host-live-needs-intros'),
              title: l10n.eventSuccessEventSuccessHostSharedTextHelpMeSayHi,
              children: [
                for (final intro in alerts.intros)
                  CatchIndexRow(
                    key: ValueKey<String>('host-live-intro-${intro.id}'),
                    title:
                        intro.requesterName ??
                        l10n.eventSuccessEventSuccessHostSharedVisiblecopyAttendee,
                    subtitle: l10n
                        .eventSuccessEventSuccessHostSharedVisiblecopyAskedForHelpMeeting(
                          targetName:
                              intro.targetName ??
                              l10n.eventSuccessEventSuccessHostSharedVisiblecopyThisAttendee,
                        ),
                    body: intro.note,
                    leading: CatchAvatar(
                      size: GeneratedCatchSizeTokens.avatarSm,
                      name: intro.requesterName ?? '',
                      imageUrl: intro.requesterPhotoUrl,
                    ),
                    onTap: null,
                  ),
              ],
            ),
          if (needs.isEmpty && alerts.isEmpty)
            CatchSection(
              note: checking ? l10n.hostLiveNeedsChecking : null,
              empty: checking ? null : l10n.hostLiveNeedsEmpty,
              children: const [],
            ),
          for (final (label, items) in groups)
            if (items.isNotEmpty)
              CatchSection(
                kicker: label,
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
