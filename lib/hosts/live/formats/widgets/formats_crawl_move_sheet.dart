import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Moving the group to the next stop, in a contained sheet: the walk on a
/// map when both stops have a place, the next stop and when to leave, the
/// message everyone will get as the host sends it, and Send and move
/// everyone.
///
/// The sheet holds only the leave choice; the screen sends the message.
/// Change on the stop opens the stop editor; a stop changed tonight says so
/// above the stop.
class HostFormatsCrawlMoveSheet extends StatelessWidget {
  const HostFormatsCrawlMoveSheet({
    super.key,
    required this.from,
    required this.to,
    required this.host,
    required this.leave,
    required this.onLeave,
    required this.onSend,
    this.onChange,
    this.stopNumber,
    this.sending = false,
  });

  /// The stop the group is at; null before the first.
  final HostFormatsStop? from;
  final HostFormatsStop to;

  /// Who the message comes from.
  final String host;
  final HostFormatsLeave leave;
  final ValueChanged<HostFormatsLeave> onLeave;

  /// Sends [message] to everyone booked.
  final ValueChanged<String> onSend;

  /// Opens the editor for the next stop; null when stops cannot change.
  final VoidCallback? onChange;

  /// The next stop's place on the route, for the changed notice.
  final int? stopNumber;
  final bool sending;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final message = hostFormatsMoveMessage(context, to: to, leave: leave);
    final where = to.address;
    return CatchSheet.contained(
      key: const ValueKey<String>('formats-crawl-move-sheet'),
      title: l10n.hostFormatsMoveTitle,
      footer: CatchButton(
        key: const ValueKey<String>('formats-crawl-send'),
        label: l10n.hostFormatsMoveSend,
        fullWidth: true,
        status: sending ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        onPressed: sending ? null : () => onSend(message),
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          if (to.changed)
            CatchNotice.inline(
              key: const ValueKey<String>('formats-crawl-stop-changed'),
              body: l10n.hostFormatsStopChanged(
                number: stopNumber ?? 0,
                stop: to.stop.title,
              ),
            ),
          if (from?.stop.location != null && to.stop.location != null)
            _MoveMap(from: from!, to: to),
          CatchSurface(
            child: CatchSection(
              children: [
                CatchIndexRow(
                  title: to.stop.title,
                  subtitle: where ?? to.stop.location?.name,
                  titleMaxLines: 2,
                  onTap: null,
                  density: CatchIndexRowSize.roomy,
                  trailing: onChange == null
                      ? null
                      : CatchButton(
                          key: const ValueKey<String>('formats-crawl-change'),
                          label: l10n.hostFormatsStopChange,
                          variant: CatchButtonVariant.quiet,
                          size: CatchButtonSize.sm,
                          onPressed: sending ? null : onChange,
                        ),
                ),
                CatchIndexRow(
                  title: l10n.hostFormatsMoveLeave,
                  onTap: null,
                  density: CatchIndexRowSize.roomy,
                  footer: CatchPageTabBar<HostFormatsLeave>.segmented(
                    key: const ValueKey<String>('formats-crawl-leave'),
                    label: l10n.hostFormatsMoveLeave,
                    selected: leave,
                    options: [
                      CatchOption(
                        value: HostFormatsLeave.now,
                        label: l10n.hostFormatsLeaveNow,
                      ),
                      CatchOption(
                        value: HostFormatsLeave.inTen,
                        label: l10n.hostFormatsLeaveInTen,
                      ),
                      CatchOption(
                        value: HostFormatsLeave.onTime,
                        label: AppTimeFormatters.time(to.startsAt),
                      ),
                    ],
                    onChanged: onLeave,
                  ),
                ),
              ],
            ),
          ),
          CatchChatBubble(
            text: message,
            variant: CatchChatBubbleVariant.host,
            format: CatchFormat.nightsOut,
            author: CatchChatAuthor(name: host),
          ),
        ],
      ),
    );
  }
}

/// The two stops on a map, scaled to fit, with the walk between them.
class _MoveMap extends StatelessWidget {
  const _MoveMap({required this.from, required this.to});

  final HostFormatsStop from;
  final HostFormatsStop to;

  @override
  Widget build(BuildContext context) {
    final a = from.stop.location!;
    final b = to.stop.location!;
    final minLat = a.latitude < b.latitude ? a.latitude : b.latitude;
    final maxLat = a.latitude < b.latitude ? b.latitude : a.latitude;
    final minLng = a.longitude < b.longitude ? a.longitude : b.longitude;
    final maxLng = a.longitude < b.longitude ? b.longitude : a.longitude;
    double x(double lng) =>
        maxLng == minLng ? 50 : 20 + 60 * (lng - minLng) / (maxLng - minLng);
    double y(double lat) =>
        maxLat == minLat ? 50 : 20 + 60 * (maxLat - lat) / (maxLat - minLat);
    final start = CatchMapPoint(x: x(a.longitude), y: y(a.latitude));
    final end = CatchMapPoint(x: x(b.longitude), y: y(b.latitude));
    return CatchMap(
      label: context.l10n.hostFormatsMoveMap(
        from: from.stop.title,
        to: to.stop.title,
      ),
      pins: [
        CatchMapPin(
          x: start.x,
          y: start.y,
          label: from.stop.title,
          format: CatchFormat.nightsOut,
        ),
        CatchMapPin(
          x: end.x,
          y: end.y,
          label: to.stop.title,
          format: CatchFormat.nightsOut,
          status: CatchMapPinStatus.selected,
        ),
      ],
      route: [start, end],
    );
  }
}

/// The message the move sends: the next stop, where it is and when the
/// group leaves.
String hostFormatsMoveMessage(
  BuildContext context, {
  required HostFormatsStop to,
  required HostFormatsLeave leave,
}) {
  final l10n = context.l10n;
  final where = to.address;
  final place = where == null
      ? to.stop.title
      : l10n.hostFormatsMovePlace(stop: to.stop.title, address: where);
  final when = switch (leave) {
    HostFormatsLeave.now => l10n.hostFormatsMoveWhenNow,
    HostFormatsLeave.inTen => l10n.hostFormatsMoveWhenTen,
    HostFormatsLeave.onTime => l10n.hostFormatsMoveWhenAt(
      time: AppTimeFormatters.time(to.startsAt),
    ),
  };
  return l10n.hostFormatsMoveMessage(place: place, when: when);
}
