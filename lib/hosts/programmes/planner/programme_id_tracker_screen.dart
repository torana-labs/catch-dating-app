import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_id_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_id_tracker_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final _random = Random.secure();

/// IDs for the hotels (RbProgIdTracker), from `listProgramIdTracker`.
/// Accept and Ask for a clearer photo run `decideProgramGuestId`; Send to
/// the hotels shares the hotel's front-desk link (`issueProgramWebLink`,
/// hotelHandover); Remind opens a planned message.
class HostProgrammeIdTrackerScreen extends ConsumerStatefulWidget {
  const HostProgrammeIdTrackerScreen({
    super.key,
    required this.programId,
    this.initialGuestId,
  });

  final String programId;

  /// The guest whose ID opens beside the list.
  final String? initialGuestId;

  @override
  ConsumerState<HostProgrammeIdTrackerScreen> createState() =>
      _HostProgrammeIdTrackerScreenState();
}

class _HostProgrammeIdTrackerScreenState
    extends ConsumerState<HostProgrammeIdTrackerScreen> {
  String? _hotelId;
  HostProgrammeIdFilter _filter = HostProgrammeIdFilter.all;
  late String? _guestId = widget.initialGuestId;
  bool _busy = false;

  Future<void> _decide(
    ProgramIdTrackerRow row,
    ProgramGuestIdDecision decision,
  ) async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    var ok = true;
    try {
      await ref
          .read(programWorkRepositoryProvider)
          .decideGuestId(
            programId: widget.programId,
            row: row,
            decision: decision,
            requestId:
                'guest-id-${DateTime.now().microsecondsSinceEpoch}-'
                '${_random.nextInt(1 << 30)}',
          );
    } on Object {
      ok = false;
    }
    ref.invalidate(programIdTrackerProvider(widget.programId, _hotelId));
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      showCatchNotice(
        context,
        l10n.hostProgrammeIdsDecisionFailed,
        tone: CatchNoticeTone.danger,
      );
    }
  }

  Future<void> _sendToHotel(String hotelId, String hotelName) async {
    final l10n = context.l10n;
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    try {
      final link = await ref
          .read(programPlannerRepositoryProvider)
          .issueWebLink(
            programId: widget.programId,
            kind: ProgramWebLinkKind.hotelHandover,
            subjectId: hotelId,
          );
      final url = AppConfig.publicSiteUrl.resolve(
        '/hotel/${Uri.encodeComponent(link.token)}',
      );
      await ref
          .read(externalShareControllerProvider)
          .shareText(
            text: url.toString(),
            subject: l10n.hostProgrammeIdsLinkSubject(hotel: hotelName),
            origin: origin,
          );
    } on Object {
      if (mounted) {
        showCatchNotice(
          context,
          l10n.hostProgrammeIdsSendFailed,
          tone: CatchNoticeTone.danger,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final programId = widget.programId;
    final read = ref.watch(programIdTrackerProvider(programId, _hotelId));
    final tracker = read.value;
    final hotels = tracker?.hotels ?? const [];
    final sendTo = hotels.length == 1
        ? hotels.single
        : hotels.where((hotel) => hotel.hotelId == _hotelId).firstOrNull;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-id-tracker-screen'),
        bodyScrolls: false,
        body: HostProgrammeIdTrackerBody(
          status: read.hasError
              ? HostProgrammeStatus.error
              : tracker == null
              ? HostProgrammeStatus.loading
              : HostProgrammeStatus.ready,
          tracker: tracker,
          filter: _filter,
          selectedGuestId: _guestId,
          busy: _busy,
          onBack: () => context.canPop()
              ? context.pop()
              : context.goNamed(
                  Routes.hostProgramWorkspaceScreen.name,
                  pathParameters: {'programId': programId},
                ),
          onHotel: (hotelId) => setState(() {
            _hotelId = hotelId;
            _guestId = null;
          }),
          onFilter: (filter) => setState(() => _filter = filter),
          onSelect: (row) => setState(
            () => _guestId = _guestId == row.guestId ? null : row.guestId,
          ),
          onDecide: (row, decision) => unawaited(_decide(row, decision)),
          onSendToHotels: sendTo == null
              ? null
              : () => unawaited(_sendToHotel(sendTo.hotelId, sendTo.name)),
          onRemind: () => openHostProgrammePage(
            context,
            programId,
            HostProgrammePage.message,
          ),
          onRetry: () =>
              ref.invalidate(programIdTrackerProvider(programId, _hotelId)),
        ),
      ),
    );
  }
}
