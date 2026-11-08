import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/events/shared/event_check_in_qr_scanner.dart';
import 'package:catch_dating_app/hosts/door/door_scan_body.dart';
import 'package:catch_dating_app/hosts/door/door_scan_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The door's scanner, always night: the `tool` top bar with Close and the
/// running count, the camera in its finder and, after a check-in, the
/// floating success sheet.
///
/// The camera is [EventCheckInQrScanner], which reads Catch event codes. No
/// guest ticket code exists yet, so a scan can only say what it read; the
/// success sheet shows once the door hands it a [result].
class DoorScanScreen extends StatefulWidget {
  const DoorScanScreen({
    super.key,
    required this.eventId,
    required this.checkedIn,
    required this.expected,
    required this.onClose,
    this.result,
    this.onNext,
    this.onUndo,
    this.camera,
  });

  final String eventId;
  final int checkedIn;
  final int expected;
  final VoidCallback onClose;

  /// The guest the last scan checked in.
  final HostDoorGuest? result;
  final VoidCallback? onNext;
  final VoidCallback? onUndo;

  /// Replaces the live camera in previews and tests.
  final Widget? camera;

  @override
  State<DoorScanScreen> createState() => _DoorScanScreenState();
}

class _DoorScanScreenState extends State<DoorScanScreen> {
  DoorScanNotice? _notice;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final result = widget.result;
    final state = DoorScanState(
      checkedIn: widget.checkedIn,
      expected: widget.expected,
      result: result,
      notice: _notice,
    );
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: CatchScreen(
        key: const ValueKey<String>('door-scan-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.doorScanTitle,
          back: CatchTopBarBack(
            label: l10n.doorScanClose,
            close: true,
            onPressed: widget.onClose,
          ),
          actions: [
            CatchBadge(
              label: l10n.doorHeadline(
                checkedIn: widget.checkedIn,
                expected: widget.expected,
              ),
              size: CatchBadgeSize.md,
            ),
          ],
        ),
        body: DoorScanBody(
          state: state,
          camera:
              widget.camera ??
              EventCheckInQrScanner(eventId: widget.eventId, onResult: _read),
        ),
        overlay: result == null
            ? null
            : DoorScanResultSheet(
                guest: result,
                onNext: widget.onNext ?? () {},
                onUndo: widget.onUndo ?? () {},
              ),
      ),
    );
  }

  void _read(EventCheckInQrScan scan) {
    final notice = doorScanNoticeFor(scan.result);
    if (notice != null && notice != _notice) setState(() => _notice = notice);
  }
}

/// What the scanner says about a code that checked nobody in; null for a
/// frame with no code.
DoorScanNotice? doorScanNoticeFor(EventCheckInQrScanResult result) =>
    switch (result) {
      EventCheckInQrScanResult.ignored => null,
      EventCheckInQrScanResult.invalid => DoorScanNotice.notATicket,
      EventCheckInQrScanResult.wrongEvent => DoorScanNotice.otherEvent,
      EventCheckInQrScanResult.printableJoinOnly ||
      EventCheckInQrScanResult.matchedVenueSession => DoorScanNotice.eventCode,
    };
