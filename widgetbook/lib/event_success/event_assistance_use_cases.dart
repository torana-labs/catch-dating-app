import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_membership_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_staff_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_groups_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_membership_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_practice_role_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_staff_edit_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_staff_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_sweep_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_visit_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_group_roster_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_groups_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_sweep_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_sweep_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_visit_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_visit_sheet.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook/widgetbook.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'event_assistance_preview_repositories.dart';

const _path = '[P1 product surfaces]/Event Success assistance';

@widgetbook.UseCase(
  name: 'Observation and recovery states',
  type: EventAssistanceVisitSection,
  path: _path,
)
Widget assistanceVisitStates(BuildContext context) {
  final phase = context.knobs.object.dropdown<EventAssistanceVisitPhase>(
    label: 'Visit state',
    options: EventAssistanceVisitPhase.values,
    labelBuilder: (value) => value.name,
  );
  return Scaffold(
    body: Align(
      alignment: Alignment.bottomCenter,
      child: CatchSheet(
        title: 'Asha Menon',
        mode: CatchSheetMode.scrollable,
        child: EventAssistanceVisitSection(
          disposition: phase == EventAssistanceVisitPhase.saved
              ? AssistanceVisitDisposition.returned
              : AssistanceVisitDisposition.unresolved,
          submittedDisposition: AssistanceVisitDisposition.returned,
          phase: phase,
          onResolve: (_) {},
          onRetry: () {},
          onReload: () {},
          onDone: () {},
        ),
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Mixed visit roster',
  type: EventAssistanceSweepSection,
  path: _path,
)
Widget assistanceSweepStates(BuildContext context) => const Scaffold(
  body: SingleChildScrollView(
    child: CatchPageBody(
      child: EventAssistanceSweepSection(
        guests: [
          EventAssistanceSweepGuest(
            id: 'a',
            name: 'Asha Menon',
            disposition: AssistanceVisitDisposition.unresolved,
          ),
          EventAssistanceSweepGuest(
            id: 'b',
            name: 'Nora Patel',
            disposition: AssistanceVisitDisposition.returned,
          ),
          EventAssistanceSweepGuest(
            id: 'c',
            name: 'Jamie Fernandes',
            disposition: AssistanceVisitDisposition.departed,
          ),
        ],
        onReview: null,
      ),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Live roster to visit',
  type: EventAssistanceLiveSweepSection,
  path: _path,
)
Widget assistanceLiveSweep(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.liveSweep);

@widgetbook.UseCase(
  name: 'Live observation with exact retry',
  type: EventAssistanceVisitSheet,
  path: _path,
)
Widget assistanceLiveVisit(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.liveVisit);

@widgetbook.UseCase(
  name: 'Practice roster to visit',
  type: EventRehearsalSweepSection,
  path: _path,
)
Widget assistancePracticeSweep(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.practiceSweep);

@widgetbook.UseCase(
  name: 'Practice observation with exact retry',
  type: EventRehearsalVisitSheet,
  path: _path,
)
Widget assistancePracticeVisit(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.practiceVisit);

@widgetbook.UseCase(
  name: 'Choose assistance identity',
  type: EventRehearsalPracticeRoleSection,
  path: _path,
)
Widget assistancePracticeRole(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.practiceRole);

@widgetbook.UseCase(
  name: 'Manage fictional staff',
  type: EventRehearsalStaffSection,
  path: _path,
)
Widget assistancePracticeStaff(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.practiceStaff);

@widgetbook.UseCase(
  name: 'Edit duty with exact retry',
  type: EventRehearsalStaffEditSection,
  path: _path,
)
Widget assistancePracticeStaffEdit(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.practiceStaffEdit);

@widgetbook.UseCase(
  name: 'Shared group responsibility actions',
  type: EventAssistanceMembershipSection,
  path: _path,
)
Widget assistanceMembershipStates(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.liveMembership);
@widgetbook.UseCase(
  name: 'Shared guest selection for groups',
  type: EventAssistanceGroupRosterSection,
  path: _path,
)
Widget assistanceGroupRoster(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.liveGroups);
@widgetbook.UseCase(
  name: 'Live roster to group review',
  type: EventAssistanceLiveGroupsSection,
  path: _path,
)
Widget assistanceLiveGroups(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.liveGroups);
@widgetbook.UseCase(
  name: 'Live group action with exact retry',
  type: EventAssistanceMembershipSheet,
  path: _path,
)
Widget assistanceLiveMembership(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.liveMembership);
@widgetbook.UseCase(
  name: 'Practice roster to group review',
  type: EventRehearsalGroupsSection,
  path: _path,
)
Widget assistancePracticeGroups(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.practiceGroups);
@widgetbook.UseCase(
  name: 'Practice group action with exact retry',
  type: EventRehearsalMembershipSheet,
  path: _path,
)
Widget assistancePracticeMembership(BuildContext context) =>
    const _AssistancePreview(surface: _Surface.practiceMembership);

enum _Surface {
  liveGroups,
  liveMembership,
  practiceGroups,
  practiceMembership,
  liveSweep,
  liveVisit,
  practiceSweep,
  practiceVisit,
  practiceRole,
  practiceStaff,
  practiceStaffEdit,
}

class _AssistancePreview extends StatefulWidget {
  const _AssistancePreview({required this.surface});
  final _Surface surface;
  @override
  State<_AssistancePreview> createState() => _AssistancePreviewState();
}

class _AssistancePreviewState extends State<_AssistancePreview> {
  late final _fixtures = loadAssistancePreviewFixtures();
  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, Object?>>(
    future: _fixtures,
    builder: (context, value) {
      if (value.hasError) {
        return Text('Could not load assistance preview: ${value.error}');
      }
      if (!value.hasData) return const CatchLoadingIndicator();
      final repository = AssistancePreviewPracticeRepository(value.requireData);
      final rehearsal = repository.snapshot;
      final event = EventSuccessCompanionFixtures.socialEvent;
      final guest = EventAttendee(
        id: 'guest-1',
        eventId: event.id,
        organizerId: event.organizerId,
        displayName: 'Asha Menon',
        searchName: 'asha menon',
        source: EventAttendeeSource.hostManual,
        status: EventAttendeeStatus.checkedIn,
        createdAt: event.startTime,
        updatedAt: event.startTime,
        checkedInAt: event.startTime,
      );
      final surface = switch (widget.surface) {
        _Surface.liveGroups => EventAssistanceLiveGroupsSection(
          event: event,
          attendees: AsyncData([guest]),
        ),
        _Surface.liveMembership => EventAssistanceMembershipSheet(
          scope: EventAssistanceGuestScope(
            organizerId: event.organizerId,
            eventId: event.id,
            attendeeId: guest.id,
          ),
          guestName: guest.displayName,
        ),
        _Surface.practiceGroups => EventRehearsalGroupsSection(
          rehearsal: rehearsal,
        ),
        _Surface.practiceMembership => EventRehearsalMembershipSheet(
          scope: rehearsal.membershipReviews!.rows.first.scope,
          guestName: rehearsal.actors.first.displayName,
        ),
        _Surface.liveSweep => EventAssistanceLiveSweepSection(
          event: event,
          attendees: AsyncData([guest]),
        ),
        _Surface.liveVisit => EventAssistanceVisitSheet(
          guestName: guest.displayName,
          scope: EventAssistanceAccountabilityScope(
            group: EventAssistanceGroupScope(
              organizerId: event.organizerId,
              eventId: event.id,
              groupId: 'event:whole',
            ),
            attendeeId: guest.id,
          ),
        ),
        _Surface.practiceSweep => EventRehearsalSweepSection(
          rehearsal: rehearsal,
        ),
        _Surface.practiceVisit => EventRehearsalVisitSheet(
          scope: rehearsal.accountabilityReviews!.rows.first.scope,
          guestName: rehearsal.actors.first.displayName,
        ),
        _Surface.practiceRole => EventRehearsalPracticeRoleSection(
          scope: (
            sessionId: rehearsal.session.id,
            clockId: rehearsal.staffReview!.clockId,
          ),
        ),
        _Surface.practiceStaff => EventRehearsalStaffSection(
          sessionId: rehearsal.session.id,
        ),
        _Surface.practiceStaffEdit => const _StaffEditPreview(),
      };
      final sheet =
          widget.surface == _Surface.liveMembership ||
          widget.surface == _Surface.practiceMembership ||
          widget.surface == _Surface.liveVisit ||
          widget.surface == _Surface.practiceVisit;
      return ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
          eventAssistanceMembershipRepositoryProvider.overrideWith(
            (ref) => AssistancePreviewMembershipRepository(value.requireData),
          ),
          eventAssistanceAccountabilityRepositoryProvider.overrideWith(
            (ref) => AssistancePreviewLiveRepository(),
          ),
        ],
        child: Navigator(
          onGenerateInitialRoutes: (_, _) => [
            MaterialPageRoute<void>(
              builder: (_) => const Scaffold(
                body: Center(
                  child: Text(
                    'Review closed. Reopen this preview to try again.',
                  ),
                ),
              ),
            ),
            MaterialPageRoute<void>(
              builder: (_) => Scaffold(
                body: sheet
                    ? Align(alignment: Alignment.bottomCenter, child: surface)
                    : SingleChildScrollView(
                        child: CatchPageBody(child: surface),
                      ),
              ),
            ),
          ],
          onGenerateRoute: (_) => null,
        ),
      );
    },
  );
}

class _StaffEditPreview extends ConsumerStatefulWidget {
  const _StaffEditPreview();
  @override
  ConsumerState<_StaffEditPreview> createState() => _StaffEditPreviewState();
}

class _StaffEditPreviewState extends ConsumerState<_StaffEditPreview> {
  var _configured = false;
  @override
  void initState() {
    super.initState();
    ref.listenManual(eventRehearsalAssistanceProvider('practice-room'), (
      _,
      next,
    ) {
      if (_configured ||
          next.isLoading ||
          next.hasError ||
          next.asData == null) {
        return;
      }
      _configured = true;
      ref
          .read(eventRehearsalStaffControllerProvider('practice-room').notifier)
          .configure(next.requireValue, defaultName: 'Practice lead');
    }, fireImmediately: true);
  }

  @override
  Widget build(BuildContext context) =>
      const EventRehearsalStaffSection(sessionId: 'practice-room');
}
