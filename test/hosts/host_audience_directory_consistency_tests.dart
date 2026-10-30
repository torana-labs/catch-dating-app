part of 'host_operations_screen_test.dart';

void _registerAudienceDirectoryConsistencyTests() {
  testWidgets(
    'Groups owns app-bar creation, explicit ordering and clearable filters',
    (tester) async {
      final organizer = buildOrganizer(id: 'customers-club', ownerUserId: _hostUid);
      final requests = <HostCustomersDirectoryRequest>[];
      final audience = HostSavedAudience(
        organizerId: organizer.id,
        audienceId: 'audience-1',
        name: 'Repeat runners',
        status: 'active',
        definition: const HostSavedAudienceDefinition(
          join: HostSavedAudienceJoin.all,
          predicates: [
            HostSavedAudienceComputedSegment(
              HostAudienceSegment.repeatAttendee,
            ),
          ],
        ),
        definitionHash:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        definitionVersion: 1,
        revision: 1,
        lastPreviewMatchCount: 9,
        lastPreviewAt: DateTime(2026, 8, 30),
        createdAt: DateTime(2026, 8, 29),
        updatedAt: DateTime(2026, 8, 30),
      );

      await _pumpHostScreen(
        tester,
        const HostCustomersScreen(initialView: HostAudienceView.audiences),
        overrides: [
          ..._hostOrganizerOverrides(owned: [organizer]),
          hostCustomersDirectoryControllerProvider.overrideWith2(
            (_) => _FixedHostCustomersDirectoryController(
              requests,
              _customerDirectoryState(),
            ),
          ),
          hostGroupDirectoryControllerProvider.overrideWith2(
            (_) => _FixedHostGroupDirectoryController(
              AsyncData(
                HostSavedAudiencePage(audiences: [audience], nextCursor: null),
              ),
            ),
          ),
        ],
      );

      expect(find.text('People'), findsOneWidget);
      expect(find.text('Groups'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('host-saved-audience-create')),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byType(CatchTopBar),
          matching: find.byKey(const ValueKey('host-saved-audience-create')),
        ),
        findsOneWidget,
      );
      expect(find.text('GROUPS'), findsNothing);
      expect(find.text('Automations'), findsNothing);
      expect(find.text('Repeat runners'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('host-customers-add-customer')),
        findsNothing,
      );
      expect(requests, isEmpty);
      expect(find.text('Sort: Name'), findsOneWidget);
      await tester.tap(find.text('Sort: Name'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Recently checked'));
      await pumpFeatureUi(tester);
      expect(find.text('Sort: Recently checked'), findsOneWidget);
      await tester.tap(find.text('Filters'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Selected people'));
      await pumpFeatureUi(tester);
      expect(find.text('Repeat runners'), findsNothing);
      await tester.tap(find.text('Clear'));
      await pumpFeatureUi(tester);
      expect(find.text('Repeat runners'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
