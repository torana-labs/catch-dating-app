import 'package:catch_dating_app/pages/event/cross_paths_event_consent_section.dart';
import 'package:catch_dating_app/pages/event/cross_paths_event_consent_state.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('eligibility requires both consent gates and a future booking', () {
    final now = DateTime(2026, 8, 5, 10);
    final event = buildEvent(
      startTime: now.add(const Duration(hours: 2)),
      crossPathsDiscoveryEnabled: true,
    );
    final profile = buildUser().copyWith(prefsShowInCrossPaths: true);
    final participation = buildEventParticipation(
      event: event,
      uid: profile.uid,
    );

    expect(
      crossPathsEventConsentEligible(
        event: event,
        participation: participation,
        userProfile: profile,
        now: now,
      ),
      isTrue,
    );
    expect(
      crossPathsEventConsentEligible(
        event: event.copyWith(crossPathsDiscoveryEnabled: false),
        participation: participation,
        userProfile: profile,
        now: now,
      ),
      isFalse,
    );
    expect(
      crossPathsEventConsentEligible(
        event: event,
        participation: participation,
        userProfile: profile.copyWith(prefsShowInCrossPaths: false),
        now: now,
      ),
      isFalse,
    );
  });

  test(
    'keeps only an existing enabled consent revocable after eligibility',
    () {
      final revocable = crossPathsEventConsentSectionStateFrom(
        eligibleToEnable: false,
        loaded: true,
        enabled: true,
        pending: false,
        unavailable: false,
      );
      final ineligibleAndOff = crossPathsEventConsentSectionStateFrom(
        eligibleToEnable: false,
        loaded: true,
        enabled: false,
        pending: false,
        unavailable: false,
      );

      expect(revocable.visible, isTrue);
      expect(revocable.canChange, isTrue);
      expect(ineligibleAndOff.visible, isFalse);
    },
  );

  testWidgets('stays absent for the hidden state', (tester) async {
    await pumpEventsTestApp(
      tester,
      const CrossPathsEventConsentSection(
        state: CrossPathsEventConsentSectionState.hidden(),
        onChanged: null,
      ),
    );

    expect(
      find.byKey(const ValueKey('cross_paths.event_consent.toggle')),
      findsNothing,
    );
  });

  testWidgets('renders the route-resolved event consent state', (tester) async {
    await pumpEventsTestApp(
      tester,
      CrossPathsEventConsentSection(
        state: const CrossPathsEventConsentSectionState(
          visible: true,
          enabled: true,
          loaded: true,
          pending: false,
          unavailable: false,
        ),
        onChanged: (_) {},
      ),
    );

    final field = tester.widget<CatchField>(
      find.byKey(const ValueKey('cross_paths.event_consent.toggle')),
    );
    expect(field.toggled, isTrue);
    expect(find.text('Meet people at this event'), findsOneWidget);
    expect(find.textContaining('not a public attendee list'), findsOneWidget);
  });
}
