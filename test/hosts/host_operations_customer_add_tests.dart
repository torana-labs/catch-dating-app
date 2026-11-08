part of 'host_operations_screen_test.dart';

/// The add-a-person route is still drawn by the legacy editor; its form
/// rules stay covered here after the legacy directory and detail retired.
void _registerHostOperationsCustomerAddTests() {
  testWidgets('manual customer form captures useful identity and memory', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      const HostAddCustomerScreen(organizerId: 'organizer-1'),
    );

    expect(find.byType(CatchRouteScaffold), findsOneWidget);
    expect(find.byType(CatchSheet), findsNothing);
    expect(
      find.byKey(const ValueKey('host-add-customer-details')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('host-add-customer-memory')),
      findsOneWidget,
    );
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-add-customer-name')),
          )
          .title,
      'Name shown to your team',
    );
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-add-customer-phone')),
          )
          .title,
      'Mobile number',
    );
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-add-customer-email')),
          )
          .title,
      'Email',
    );
    await tester.ensureVisible(
      find.byKey(const ValueKey('host-add-customer-memory')),
    );
    await tester.tap(find.byKey(const ValueKey('host-add-customer-memory')));
    await pumpFeatureUi(tester);
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-add-customer-note')),
          )
          .title,
      'Private note',
    );
    expect(
      find.textContaining('does not grant permission to send messages'),
      findsOneWidget,
    );

    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-add-customer-name')),
        matching: find.byType(TextField),
      ),
      'Name only',
    );
    await tester.tap(find.byKey(const ValueKey('host-add-customer-submit')));
    await pumpFeatureUi(tester);

    expect(
      find.text('Add or keep at least one mobile number or email address.'),
      findsOneWidget,
    );
  });

  for (final endpoint in ['phone', 'email']) {
    testWidgets(
      'Add person accepts only $endpoint and retains values on failure',
      (tester) async {
        final controller = _CreatePersonProbe();
        await _pumpHostScreen(
          tester,
          const HostAddCustomerScreen(organizerId: 'organizer-1'),
          overrides: [
            hostCustomersControllerProvider.overrideWithValue(controller),
          ],
        );
        await tester.enterText(
          find.descendant(
            of: find.byKey(const ValueKey('host-add-customer-name')),
            matching: find.byType(TextField),
          ),
          'Maya Kapoor',
        );
        final field = find.descendant(
          of: find.byKey(ValueKey('host-add-customer-$endpoint')),
          matching: find.byType(TextField),
        );
        await tester.enterText(
          field,
          endpoint == 'phone' ? '+919876543210' : 'MAYA@Example.COM',
        );
        await tester.tap(
          find.byKey(const ValueKey('host-add-customer-submit')),
        );
        await pumpFeatureUi(tester);
        expect(
          controller.requests,
          hasLength(1),
          reason: tester.allStates
              .whereType<FormFieldState>()
              .map((s) => '${s.value}: ${s.errorText}')
              .join(' | '),
        );
        final request = controller.requests.single;
        expect(request['name'], 'Maya Kapoor');
        expect(request['phone'], endpoint == 'phone' ? '+919876543210' : null);
        expect(
          request['email'],
          endpoint == 'email' ? 'maya@example.com' : null,
        );
        expect(request['note'], isNull);
        expect(find.text('Maya Kapoor'), findsOneWidget);
        expect(
          find.text('Add or keep at least one mobile number or email address.'),
          findsNothing,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}

class _CreatePersonProbe extends Fake implements HostCustomersController {
  final requests = <Map<String, String?>>[];
  @override
  Future<HostCreatedCustomer> createCustomer({
    required String organizerId,
    required String displayName,
    String? phoneE164,
    String? email,
    String? initialNote,
  }) async {
    requests.add({
      'name': displayName,
      'phone': phoneE164,
      'email': email,
      'note': initialNote,
    });
    throw StateError('Simulated retryable save failure');
  }
}
