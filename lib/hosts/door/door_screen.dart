import 'dart:async';

import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_staff_presence_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_runtime_claim_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_runtime_claim_request.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/hosts/door/door_body.dart';
import 'package:catch_dating_app/hosts/door/door_controller.dart';
import 'package:catch_dating_app/hosts/door/door_scan_screen.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';
import 'package:catch_dating_app/hosts/events/roster/host_operational_roster_section.dart'
    show HostManualAttendeeSheet, HostRuntimeClaimList;
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
///
/// Event staff reach it through the staff work list with their grant as
/// [access]: it then hides what the grant does not allow and leaves out the
/// reads only managers may make.
class DoorScreen extends ConsumerStatefulWidget {
  const DoorScreen({
    super.key,
    required this.organizerId,
    required this.eventId,
    this.initialEvent,
    this.initialFilter,
    this.scanCamera,
    this.access = const DoorAccess(),
  });

  final String organizerId;
  final String eventId;

  /// The event the opener already had, shown until the listener delivers.
  final Event? initialEvent;

  /// The filter to open on, such as Asked from a join-request task.
  final DoorFilter? initialFilter;

  /// Replaces the scanner's live camera in previews and tests.
  final Widget? scanCamera;

  /// What this phone may do at the door; everything unless staff.
  final DoorAccess access;

  @override
  ConsumerState<DoorScreen> createState() => _DoorScreenState();
}

class _DoorScreenState extends ConsumerState<DoorScreen> {
  var _scanning = false;
  Timer? _heartbeat;

  DoorSession get _session =>
      ref.read(doorSessionProvider(widget.eventId).notifier);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.initialFilter case final filter?) _session.setFilter(filter);
      unawaited(_guard(_session.loadOutbox));
      unawaited(_session.heartbeat());
    });
    _heartbeat = Timer.periodic(
      EventStaffPresenceRepository.heartbeatInterval,
      (_) => unawaited(_session.heartbeat()),
    );
    ref.listenManual(appConnectivityProvider, (_, next) {
      final results = next.asData?.value;
      if (results != null && !connectivityResultsAreOffline(results)) {
        unawaited(_guard(_session.flushOutbox));
      }
    });
  }

  @override
  void dispose() {
    _heartbeat?.cancel();
    super.dispose();
  }

  /// The guest whose claim review is on its way.
  String? _reviewingClaim;

  Future<void> _reviewClaim(
    EventRuntimeClaimRequest claim,
    EventRuntimeClaimDecision decision, {
    String? attendeeId,
  }) async {
    if (_reviewingClaim != null) return;
    final l10n = context.l10n;
    setState(() => _reviewingClaim = claim.uid);
    try {
      await DoorSession.reviewClaimMutation.run(
        ref,
        (tx) => tx
            .get(doorSessionProvider(widget.eventId).notifier)
            .reviewClaim(
              uid: claim.uid,
              decision: decision,
              attendeeId: attendeeId,
            ),
      );
      if (!mounted) return;
      showCatchNotice(
        context,
        decision == EventRuntimeClaimDecision.approve
            ? l10n.hostsOperationalRosterClaimApproved
            : l10n.hostsOperationalRosterClaimRejected,
      );
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted) setState(() => _reviewingClaim = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final access = widget.access;
    final state = ref.watch(
      doorControllerProvider(widget.eventId, manage: access.manage),
    );
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
          result: state.scanned,
          onTicket: _session.scanTicket,
          onNext: _session.clearScanned,
          onUndo: () => unawaited(_guard(_session.undoScanned)),
          onClose: () {
            _session.clearScanned();
            setState(() => _scanning = false);
          },
        ),
      );
    }
    // Web guests waiting to be matched to a name on the list, with Approve
    // (choosing the guest) and Reject, through the existing runtime claim
    // review; none while nobody is waiting.
    final pendingClaims = access.reviewClaims
        ? ref
                  .watch(watchPendingEventRuntimeClaimsProvider(widget.eventId))
                  .value ??
              const <EventRuntimeClaimRequest>[]
        : const <EventRuntimeClaimRequest>[];
    final claims = pendingClaims.isEmpty
        ? null
        : HostRuntimeClaimList(
            key: const ValueKey<String>('door-claims'),
            claims: pendingClaims,
            attendees:
                ref.watch(watchEventAttendeesProvider(widget.eventId)).value ??
                const <EventAttendee>[],
            pendingUid: _reviewingClaim,
            onApprove: (claim, attendeeId) => unawaited(
              _reviewClaim(
                claim,
                EventRuntimeClaimDecision.approve,
                attendeeId: attendeeId,
              ),
            ),
            onReject: (claim) => unawaited(
              _reviewClaim(claim, EventRuntimeClaimDecision.reject),
            ),
          );
    final event = state.event ?? widget.initialEvent;
    final format = event == null
        ? null
        : catchFormatForActivity(event.eventFormat.activityKind);
    final Widget body = state.status == DoorStatus.error
        ? CatchLocalizedErrorState(
            state.error!,
            context: AppErrorContext.event,
            onRetry: () =>
                retryDoorReads(ref, widget.eventId, manage: access.manage),
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
            claims: claims,
            access: access,
          );
    final scan = access.checkIn
        ? CatchDockAction(
            label: l10n.doorScanTicket,
            icon: CatchIcons.scanQr,
            onPressed: _openScanner,
          )
        : null;
    final walkIn = access.manage
        ? CatchDockAction(
            label: l10n.doorAddWalkIn,
            onPressed: () => unawaited(_addWalkIn()),
          )
        : null;
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
              fallback: access.role == null
                  ? Routes.hostTodayScreen.path
                  : Routes.hostWorkScreen.path,
            ),
          ),
          live: l10n.doorLiveTag,
        ),
        body: body,
        dock: switch ((scan, walkIn)) {
          (final scan?, _) => CatchDock(
            placement: CatchDockPlacement.bar,
            primary: scan,
            secondary: walkIn,
          ),
          (null, final walkIn?) => CatchDock(
            placement: CatchDockPlacement.bar,
            primary: walkIn,
          ),
          (null, null) => null,
        },
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
