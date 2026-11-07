import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/hosts/door/door_scan_state.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The scanner in board order: the camera in its finder, the line under it
/// and, after a code that checked nobody in, why.
class DoorScanBody extends StatelessWidget {
  const DoorScanBody({super.key, required this.state, required this.camera});

  final DoorScanState state;

  /// The live camera, or a stand-in in previews and tests.
  final Widget camera;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          CatchSurface(
            padding: CatchSurfacePadding.none,
            semanticLabel: l10n.doorScanFinderLabel,
            child: AspectRatio(aspectRatio: 1, child: camera),
          ),
          CatchText(
            l10n.doorScanHint,
            tone: CatchTextTone.secondary,
            align: TextAlign.center,
          ),
          if (state.notice case final notice?)
            CatchNotice.inline(
              tone: CatchNoticeTone.warning,
              body: switch (notice) {
                DoorScanNotice.notATicket => l10n.doorScanNotATicket,
                DoorScanNotice.otherEvent => l10n.doorScanOtherEvent,
                DoorScanNotice.eventCode => l10n.doorScanEventCode,
              },
            ),
        ],
      ),
    );
  }
}

/// The floating success sheet after a scan checks a guest in: who, what
/// they paid and whether it is their first night, with Next ticket and
/// Undo. It leaves the scanner behind it usable.
class DoorScanResultSheet extends StatelessWidget {
  const DoorScanResultSheet({
    super.key,
    required this.guest,
    required this.onNext,
    required this.onUndo,
  });

  final HostDoorGuest guest;
  final VoidCallback onNext;
  final VoidCallback onUndo;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final paid = guest.paidMinor;
    return CatchSheet.contained(
      kicker: l10n.doorScanCheckedIn,
      title: guest.name,
      tone: CatchSheetTone.success,
      scrim: false,
      footer: CatchStack(
        direction: CatchStackDirection.row,
        gap: CatchStackGap.g16,
        children: [
          Expanded(
            child: CatchButton(
              label: l10n.doorScanNext,
              onPressed: onNext,
              fullWidth: true,
            ),
          ),
          CatchButton(
            label: l10n.doorGuestUndo,
            onPressed: onUndo,
            variant: CatchButtonVariant.quiet,
          ),
        ],
      ),
      child: CatchStack(
        direction: CatchStackDirection.row,
        equal: true,
        children: [
          CatchMetricTile.stat(
            label: l10n.doorScanPaidOnCatch,
            value: paid == null || paid <= 0
                ? l10n.doorScanNothingPaid
                : formatMinorCurrency(
                    paid,
                    currencyCode: guest.paidCurrency ?? defaultCurrencyCode,
                  ),
            mode: CatchMetricTileMode.plain,
          ),
          CatchMetricTile.stat(
            label: l10n.doorScanFirstNight,
            value: guest.firstTime
                ? l10n.doorGuestNew
                : l10n.doorScanNights(count: (guest.priorNights ?? 0) + 1),
            mode: CatchMetricTileMode.plain,
          ),
        ],
      ),
    );
  }
}
