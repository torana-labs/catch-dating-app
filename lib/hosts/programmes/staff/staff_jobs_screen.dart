import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_jobs_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_jobs_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// A staff member's jobs at one programme, day: the job on now, the next
/// function, the rest and the other pages their duties open.
///
/// It reads the programme's work access (offline it reopens from the
/// phone's saved copy, shown with its time). A join link's invite is
/// claimed first, then the route is replaced with the programme's own, so
/// the invite is never reopened. Every destination checks its own access.
class StaffJobsScreen extends ConsumerStatefulWidget {
  const StaffJobsScreen({
    super.key,
    required this.programId,
    this.inviteId,
    this.now,
  });

  final String programId;

  /// The staff invite a join link carries; claimed before access resolves.
  final String? inviteId;

  /// Replaces the wall clock in tests and captures.
  final DateTime Function()? now;

  @override
  ConsumerState<StaffJobsScreen> createState() => _StaffJobsScreenState();
}

class _StaffJobsScreenState extends ConsumerState<StaffJobsScreen> {
  ProviderSubscription<AsyncValue<ProgramReadView<ProgramWorkAccess>>>?
  _inviteSubscription;

  ProgramWorkEntryProvider get _provider =>
      programWorkEntryProvider(widget.programId, widget.inviteId);

  @override
  void initState() {
    super.initState();
    _listenForInvite();
  }

  @override
  void didUpdateWidget(StaffJobsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.programId != widget.programId ||
        oldWidget.inviteId != widget.inviteId) {
      _listenForInvite();
    }
  }

  @override
  void dispose() {
    _inviteSubscription?.close();
    super.dispose();
  }

  /// A claimed invite is an entry action, not a workspace address: once
  /// access settles, the route becomes the programme's own.
  void _listenForInvite() {
    _inviteSubscription?.close();
    _inviteSubscription = null;
    final inviteId = widget.inviteId;
    if (inviteId == null || inviteId.isEmpty) return;
    final provider = _provider;
    _inviteSubscription = ref.listenManual(provider, (_, next) {
      final result = next.asData?.value;
      if (next.isLoading || result == null) return;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted ||
            widget.inviteId != inviteId ||
            provider != _provider ||
            ref.read(provider).asData?.value != result ||
            ModalRoute.of(context)?.isCurrent != true) {
          return;
        }
        context.replaceNamed(
          Routes.hostWorkProgramScreen.name,
          pathParameters: {'programId': result.value.programId},
        );
      });
    }, fireImmediately: true);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final now = widget.now?.call() ?? DateTime.now();
    final access = ref.watch(_provider);
    final state = switch (access) {
      AsyncData(:final value) => StaffJobsState.fromAccess(
        value.value,
        now: now,
        savedAt: value.snapshotAt,
      ),
      AsyncError() => const StaffJobsState.error(),
      _ => const StaffJobsState.loading(),
    };
    final programId = access.asData?.value.value.programId ?? widget.programId;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-jobs-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tabHome,
          kicker: state.title.isEmpty
              ? null
              : l10n.hostStaffJobsKicker(title: state.title),
          title: l10n.hostStaffJobsTitle,
        ),
        body: StaffJobsBody(
          state: state,
          onOpen: (job) => _open(programId, job),
          onLink: (link) => _link(access.asData?.value.value, programId, link),
          onRetry: () => ref.invalidate(_provider),
        ),
      ),
    );
  }

  void _open(String programId, StaffJob job) {
    final program = {'programId': programId};
    switch (job.kind) {
      case StaffJobKind.greeter:
        context.pushNamed(
          Routes.hostWorkArrivalsScreen.name,
          pathParameters: {...program, 'pickupPointId': job.placeId},
          queryParameters: {'station': job.title},
        );
      case StaffJobKind.dispatch:
        context.pushNamed(
          Routes.hostWorkDispatchScreen.name,
          pathParameters: {...program, 'pickupPointId': job.placeId},
          queryParameters: {'station': job.title},
        );
      case StaffJobKind.hotel:
        context.pushNamed(
          Routes.hostWorkHotelScreen.name,
          pathParameters: {...program, 'hotelId': job.placeId},
        );
      case StaffJobKind.door:
        context.pushNamed(
          Routes.hostWorkDoorScreen.name,
          pathParameters: {...program, 'functionId': job.placeId},
          queryParameters: {'function': job.title},
        );
      case StaffJobKind.lead:
        context.pushNamed(
          Routes.hostWorkNowScreen.name,
          pathParameters: program,
        );
    }
  }

  void _link(ProgramWorkAccess? access, String programId, StaffJobLink link) {
    final program = {'programId': programId};
    switch (link) {
      case StaffJobLink.alerts:
        context.pushNamed(
          Routes.hostWorkAttentionScreen.name,
          pathParameters: program,
        );
      case StaffJobLink.messages:
        context.pushNamed(
          Routes.hostProgramMomentsScreen.name,
          pathParameters: program,
          queryParameters: {'title': ?access?.title},
        );
      case StaffJobLink.inbox:
        context.pushNamed(
          Routes.hostInboxScreen.name,
          queryParameters: {
            'programId': programId,
            'organizerId': ?access?.organizerId,
          },
        );
      case StaffJobLink.guests:
        context.pushNamed(
          Routes.hostWorkGuestsScreen.name,
          pathParameters: program,
        );
      case StaffJobLink.importList:
        context.pushNamed(
          Routes.hostWorkImportScreen.name,
          pathParameters: program,
        );
      case StaffJobLink.phoneImport:
        context.pushNamed(
          Routes.hostWorkPhoneImportScreen.name,
          pathParameters: program,
        );
      case StaffJobLink.trips:
        context.pushNamed(
          Routes.hostWorkTripsScreen.name,
          pathParameters: program,
        );
      case StaffJobLink.counts:
        context.pushNamed(
          Routes.hostWorkCountsScreen.name,
          pathParameters: program,
        );
      case StaffJobLink.attendance:
        context.pushNamed(
          Routes.hostWorkAttendanceReportScreen.name,
          pathParameters: program,
        );
    }
  }
}
