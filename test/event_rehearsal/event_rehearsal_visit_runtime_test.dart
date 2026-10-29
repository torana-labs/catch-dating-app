import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_practice_role_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_screen.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_practice_role_section.dart';
import 'package:catch_dating_app/event_success/event_success.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_rehearsal_accountability_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  test(
    'projection preserves recorded visits and never promotes messages into return proof',
    () {
      final before = practiceVisitSnapshot();
      final after = EventRehearsalBootstrap.fromCallableData(
        practiceVisitResult(practiceVisitChange()),
      );
      EventRehearsalRuntimeProjection project(EventRehearsalBootstrap value) =>
          buildEventRehearsalRuntimeProjection(
            value,
            practiceGuestLabel: 'Practice guest',
            latePracticeGuestLabel: 'Late guest',
          );
      final initial = project(before);
      final saved = project(after);
      expect(initial.accountabilityAttendees, hasLength(2));
      expect(
        initial.accountabilityAttendees.every(
          (a) => a.currentAccountabilityResolution == null,
        ),
        isTrue,
      );
      expect(
        saved.accountabilityAttendees.first.currentAccountabilityResolution,
        EventSuccessAccountabilityResolution.returned,
      );
      expect(
        saved.accountabilityAttendees[1].currentAccountabilityResolution,
        isNull,
      );
      expect(
        saved.accountabilityAttendees.first.checkedInAt,
        initial.accountabilityAttendees.first.checkedInAt,
      );
      expect(saved.roster.checkedInIds, initial.roster.checkedInIds);
      expect(
        saved.assignments.map((a) => a.toJson()),
        initial.assignments.map((a) => a.toJson()),
      );
    },
  );

  Future<void> mount(WidgetTester tester, _Repository repository) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
          eventRehearsalProvider(
            repository.snapshot.session.id,
          ).overrideWith((ref) => Stream.value(repository.snapshot)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: HostEventRehearsalScreen(
            clubId: repository.snapshot.session.organizerId,
            sessionId: repository.snapshot.session.id,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
  }

  testWidgets(
    'real rehearsal runtime opens the shared visit action and retains sweep completion warning',
    (tester) async {
      final wire = practiceVisitBootstrap();
      final projection = buildEventRehearsalRuntimeProjection(
        EventRehearsalBootstrap.fromCallableData(wire),
        practiceGuestLabel: 'Practice guest',
        latePracticeGuestLabel: 'Late guest',
      );
      final plan = EventSuccessRuntime(
        plan: projection.plan,
        event: projection.event,
        now: practiceVisitSnapshot().session.virtualNow,
      ).livePlan(bookedCount: 2, checkedInCount: 2)!;
      (wire['session']! as Map<String, Object?>)['activeStepIndex'] =
          plan.steps.length - 1;
      final repository = _Repository(
        EventRehearsalBootstrap.fromCallableData(wire),
      );
      await mount(tester, repository);
      final panel = tester.widget<EventSuccessHostWorkspacePageBody>(
        find.byType(EventSuccessHostWorkspacePageBody),
      );
      expect(panel.accountabilityMode, EventSuccessAccountability.sweep);
      expect(panel.accountabilityAttendees, hasLength(2));
      expect(find.byType(EventAssistanceSweepSection), findsOneWidget);
      final complete = find.text('Mark live guide complete');
      await tester.ensureVisible(complete);
      await tester.tap(complete);
      await pumpFeatureUi(tester);
      expect(find.text('Some guests aren’t marked yet'), findsOneWidget);
      await tester.tap(find.text('Review sweep'));
      await pumpFeatureUi(tester);
      final review = find.descendant(
        of: find.byKey(const ValueKey('sweep.guest.actor-01')),
        matching: find.text('Review visit'),
      );
      await tester.ensureVisible(review);
      await tester.tap(review);
      await pumpFeatureUi(tester);
      expect(find.byType(EventAssistanceVisitSection), findsOneWidget);
      await tester.tap(find.text('Mark returned'));
      await pumpFeatureUi(tester);
      expect(repository.writes, hasLength(1));
      final decision =
          repository.writes.single.command as RehearsalResolveAccountability;
      expect(decision.actorId, 'actor-01');
      expect(
        repository
            .snapshot
            .accountabilityReviews!
            .rows
            .first
            .evidence
            .disposition
            .name,
        'returned',
      );
      await tester.tap(find.text('Done'));
      await pumpFeatureUi(tester);
      expect(find.text('1 of 2 marked'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'real rehearsal runtime opens one guest group review without changing attendance',
    (tester) async {
      final fixture =
          jsonDecode(
                File(
                  'test/event_rehearsal/fixtures/staff_reviews.json',
                ).readAsStringSync(),
              )
              as Map;
      final repository = _Repository(
        EventRehearsalBootstrap.fromCallableData(fixture['manager']),
      );
      await mount(tester, repository);
      final selector = find.byType(EventAssistanceGroupRosterSection);
      expect(selector, findsOneWidget);
      final guestField = find.descendant(
        of: selector,
        matching: find.text('Guest'),
      );
      await tester.ensureVisible(guestField);
      await tester.tap(guestField);
      await pumpFeatureUi(tester);
      final name = repository.snapshot.actors.first.displayName;
      await tester.tap(find.widgetWithText(CatchMenuRow<Object?>, name));
      await pumpFeatureUi(tester);
      final review = find.text('Review group');
      await tester.ensureVisible(review);
      await tester.tap(review);
      await pumpFeatureUi(tester);
      final section = tester.widget<EventAssistanceMembershipSection>(
        find.byType(EventAssistanceMembershipSection),
      );
      expect(
        section.facts.accepted?.groupId,
        repository
            .snapshot
            .membershipReviews!
            .rows
            .first
            .facts
            .accepted
            ?.groupId,
      );
      expect(section.actorUid, 'host-1');
      expect(section.handoverReview, isNotNull);
      expect(repository.writes, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'selected expired practice duty opens read-only controls and stays visible in the rehearsal strip',
    (tester) async {
      final fixture =
          jsonDecode(
                File(
                  'test/event_rehearsal/fixtures/staff_reviews.json',
                ).readAsStringSync(),
              )
              as Map;
      final repository =
          _Repository(
              EventRehearsalBootstrap.fromCallableData(fixture['manager']),
            )
            ..roleSnapshot = EventRehearsalBootstrap.fromCallableData(
              fixture['expired'],
            );
      await mount(tester, repository);
      await tester.tap(find.byIcon(CatchIcons.more));
      await pumpFeatureUi(tester);
      await tester.ensureVisible(
        find.byType(EventRehearsalPracticeRoleSection),
      );
      await tester.tap(find.text('Host').hitTestable());
      await pumpFeatureUi(tester);
      await tester.tap(find.widgetWithText(CatchMenuRow<Object?>, 'sweep'));
      await pumpFeatureUi(tester);
      final roleContext = tester.element(
        find.byType(EventRehearsalPracticeRoleSection),
      );
      expect(
        ProviderScope.containerOf(roleContext).read(
          eventRehearsalPracticeRoleControllerProvider((
            sessionId: repository.snapshot.session.id,
            clockId: repository.snapshot.staffReview!.clockId,
          )),
        ),
        'practice-staff:sweep',
      );
      Navigator.of(
        tester.element(find.byType(EventRehearsalPracticeRoleSection)),
      ).pop();
      await pumpFeatureUi(tester);
      final banner = tester.widget<CatchBanner>(
        find.byWidgetPredicate(
          (w) => w is CatchBanner && w.variant == CatchBannerVariant.statuses,
        ),
      );
      expect(
        banner.statuses.single.message,
        'Synthetic guests · Assistance as sweep',
      );
      final review = find.descendant(
        of: find.byKey(const ValueKey('sweep.guest.actor-01')),
        matching: find.text('Review visit'),
      );
      await tester.ensureVisible(review);
      await tester.tap(review);
      await pumpFeatureUi(tester);
      expect(repository.roleReads, ['practice-staff:sweep']);
      expect(
        find.text('Your current role cannot update this guest’s visit.'),
        findsOneWidget,
      );
      expect(find.text('Mark returned'), findsNothing);
      expect(repository.writes, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
}

class _Repository extends Fake implements EventRehearsalRepository {
  _Repository(this.snapshot);
  EventRehearsalBootstrap snapshot;
  EventRehearsalBootstrap? roleSnapshot;
  final roleReads = <String>[];
  final writes = <RehearsalAssistanceChange>[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;
  @override
  Future<EventRehearsalBootstrap> fetchPracticeRole({
    required String sessionId,
    required String practiceOperatorId,
    required String hostUid,
  }) async {
    roleReads.add(practiceOperatorId);
    return roleSnapshot!;
  }

  @override
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) async {
    writes.add(change);
    return snapshot = EventRehearsalBootstrap.fromCallableData(
      practiceVisitResult(change),
    );
  }
}
