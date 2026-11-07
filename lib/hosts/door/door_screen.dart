import 'dart:async';

import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/hosts/door/door_body.dart';
import 'package:catch_dating_app/hosts/door/door_controller.dart';
import 'package:catch_dating_app/hosts/door/door_scan_screen.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_operational_roster_section.dart'
    show HostManualAttendeeSheet;
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The door for tonight's event, always night: how many are in, the guests
/// by where they are, and the one action each takes; Scan a ticket and Add
/// walk-in in the dock.
///
/// It watches [doorControllerProvider], sends the door's commands through
/// [doorSessionProvider], flushes the attendance outbox when the phone comes
/// back online and opens the scanner in place. Every read behind it is a
/// listener, so nothing here refreshes after a command.
class DoorScreen extends ConsumerStatefulWidget {
  const DoorScreen({
    super.key,
    required this.organizerId,
    required this.eventId,
    this.initialEvent,
    this.scanCamera,
  });

  final String organizerId;
  final String eventId;

  /// The event the opener already had, shown until the listener delivers.
  final Event? initialEvent;

  /// Replaces the scanner's live camera in previews and tests.
  final Widget? scanCamera;

  @override
  ConsumerState<DoorScreen> createState() => _DoorScreenState();
}

class _DoorScreenState extends ConsumerState<DoorScreen> {
  var _scanning = false;

  DoorSession get _session =>
      ref.read(doorSessionProvider(widget.eventId).notifier);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(_guard(_session.loadOutbox));
    });
    ref.listenManual(appConnectivityProvider, (_, next) {
      final results = next.asData?.value;
      if (results != null && !connectivityResultsAreOffline(results)) {
        unawaited(_guard(_session.flushOutbox));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(doorControllerProvider(widget.eventId));
    if (_scanning) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) setState(() => _scanning = false);
        },
        child: DoorScanScreen(
          eventId: widget.eventId,
          checkedIn: state.checkedIn,
          expected: state.expected,
          camera: widget.scanCamera,
          onClose: () => setState(() => _scanning = false),
        ),
      );
    }
    final event = state.event ?? widget.initialEvent;
    final format = event == null
        ? null
        : catchFormatForActivity(event.eventFormat.activityKind);
    final Widget body = state.status == DoorStatus.error
        ? CatchLocalizedErrorState(
            state.error!,
            context: AppErrorContext.event,
            onRetry: () => retryDoorReads(ref, widget.eventId),
          )
        : DoorBody(
            state: state,
            format: format,
            onFilter: _session.setFilter,
            onSearch: _session.setQuery,
            onGuestAction: (guest) => unawaited(_act(guest)),
            onScan: _openScanner,
            onRetrySync: () => unawaited(_guard(_session.flushOutbox)),
            onDiscardRefused: () => unawaited(_guard(_session.discardRefused)),
          );
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: format,
      child: CatchScreen(
        key: const ValueKey<String>('door-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: event?.title ?? l10n.doorTitle,
          kicker: event == null
              ? null
              : l10n.doorKicker(time: EventFormatters.time(event.startTime)),
          back: CatchTopBarBack(
            label: l10n.doorBack,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostTodayScreen.path,
            ),
          ),
          live: l10n.doorLiveTag,
        ),
        body: body,
        dock: CatchDock(
          placement: CatchDockPlacement.bar,
          primary: CatchDockAction(
            label: l10n.doorScanTicket,
            icon: CatchIcons.scanQr,
            onPressed: _openScanner,
          ),
          secondary: CatchDockAction(
            label: l10n.doorAddWalkIn,
            onPressed: () => unawaited(_addWalkIn()),
          ),
        ),
      ),
    );
  }

  void _openScanner() => setState(() => _scanning = true);

  Future<void> _act(HostDoorGuest guest) async {
    final uid = guest.userId;
    await _guard(
      () => switch (guest.status) {
        HostDoorGuestStatus.arriving || HostDoorGuestStatus.checkedIn =>
          _session.toggleAttendance(guest.attendeeId),
        HostDoorGuestStatus.asked when uid != null => _session.letIn(uid),
        HostDoorGuestStatus.waitlist when uid != null => _session.offer(uid),
        HostDoorGuestStatus.asked ||
        HostDoorGuestStatus.waitlist => Future<void>.value(),
      },
    );
  }

  Future<void> _addWalkIn() async {
    final row = await showCatchBottomSheet<EventAttendeeImportRow>(
      context: context,
      builder: (context) => const HostManualAttendeeSheet(),
    );
    if (row == null || !mounted) return;
    await _guard(() async {
      final result = await _session.addWalkIn(row);
      if (!mounted) return;
      showCatchNotice(
        context,
        result.errors.isEmpty
            ? context.l10n.doorWalkInAdded(name: row.displayName)
            : context.l10n.doorWalkInFailed(name: row.displayName),
        tone: result.errors.isEmpty
            ? CatchNoticeTone.success
            : CatchNoticeTone.warning,
      );
    });
  }

  /// Runs a door command and shows its failure as a notice.
  Future<void> _guard(Future<void> Function() command) async {
    try {
      await command();
    } catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    }
  }
}
