part of 'host_operations_screen_test.dart';

void _registerHostOperationsCustomerStateTests() {
  testWidgets(
    'customer directory keeps initial loading distinct from failure',
    (tester) async {
      final organizer = buildOrganizer(id: 'loading-club', ownerUserId: _hostUid);
      await _pumpHostScreen(
        tester,
        const HostCustomersScreen(),
        settle: false,
        overrides: [
          ..._hostOrganizerOverrides(owned: [organizer]),
          hostCustomersDirectoryControllerProvider.overrideWith2(
            (_) => _PendingHostCustomersDirectoryController(),
          ),
        ],
      );

      expect(find.byType(CatchField), findsWidgets);
      expect(find.byType(CatchSkeleton), findsWidgets);
      expect(find.byType(CatchSection), findsWidgets);
      expect(find.text('Customers unavailable'), findsNothing);
      expect(find.text('Customer details unavailable'), findsNothing);
    },
  );

  testWidgets('customer directory failure names the directory resource', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'error-club', ownerUserId: _hostUid);
    await _pumpHostScreen(
      tester,
      const HostCustomersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [organizer]),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FailingHostCustomersDirectoryController(),
        ),
      ],
    );

    expect(find.text('Customers unavailable'), findsOneWidget);
    expect(find.text('Reload customers'), findsOneWidget);
    expect(find.text('Customer details unavailable'), findsNothing);
    expect(find.text('Reload customer'), findsNothing);
  });
}

class _PendingHostCustomersDirectoryController
    extends HostCustomersDirectoryController {
  @override
  Future<HostCustomersDirectoryState> build(
    HostCustomersDirectoryRequest request,
  ) => Completer<HostCustomersDirectoryState>().future;
}

class _FailingHostCustomersDirectoryController
    extends HostCustomersDirectoryController {
  @override
  Future<HostCustomersDirectoryState> build(
    HostCustomersDirectoryRequest request,
  ) =>
      Future<HostCustomersDirectoryState>.error(StateError('directory failed'));
}
