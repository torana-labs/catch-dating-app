import 'dart:async';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/people/add_person_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/errors/provider_retry_policy.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod/misc.dart' show Override;

/// Add person, redrawn on the system: the old editor's form rules, kept.
void main() {
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  testWidgets('manual customer form captures useful identity and memory', (
    tester,
  ) async {
    await _pumpAddCustomer(tester);

    expect(find.byType(CatchScreen), findsOneWidget);
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
      _fieldTitle(tester, 'host-add-customer-name'),
      'Name shown to your team',
    );
    expect(_fieldTitle(tester, 'host-add-customer-phone'), 'Mobile number');
    expect(_fieldTitle(tester, 'host-add-customer-email'), 'Email');
    await tester.ensureVisible(
      find.byKey(const ValueKey('host-add-customer-note')),
    );
    expect(_fieldTitle(tester, 'host-add-customer-note'), 'Private note');
    expect(
      find.textContaining('does not grant permission to send messages'),
      findsOneWidget,
    );

    await tester.enterText(_input('host-add-customer-name'), 'Name only');
    await tester.tap(_add);
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
        await _pumpAddCustomer(
          tester,
          overrides: [
            hostCustomersControllerProvider.overrideWithValue(controller),
          ],
        );
        await tester.enterText(_input('host-add-customer-name'), 'Maya Kapoor');
        await tester.enterText(
          _input('host-add-customer-$endpoint'),
          endpoint == 'phone' ? '+919876543210' : 'MAYA@Example.COM',
        );
        await tester.tap(_add);
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

  testWidgets('a person added returns to People, and the form freezes '
      'while it is added', (tester) async {
    final pending = Completer<HostCreatedCustomer>();
    final controller = _CreatePersonProbe(result: pending.future);
    Object? returned;
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (context, _) => TextButton(
            onPressed: () async {
              returned = await context.push<Object?>('/new');
            },
            child: const Text('Open'),
          ),
        ),
        GoRoute(
          path: '/new',
          builder: (_, _) =>
              const HostAddPersonScreen(organizerId: 'organizer-1'),
        ),
      ],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          firebaseFirestoreProvider.overrideWithValue(FakeFirebaseFirestore()),
          hostCustomersControllerProvider.overrideWithValue(controller),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await tester.tap(find.text('Open'));
    await pumpFeatureUi(tester);
    await tester.enterText(_input('host-add-customer-name'), 'Maya Kapoor');
    await tester.enterText(
      _input('host-add-customer-email'),
      'maya@example.com',
    );
    await tester.tap(_add);
    await tester.pump();
    expect(controller.requests, hasLength(1));
    final name = tester.widget<CatchField>(
      find.byKey(const ValueKey('host-add-customer-name')),
    );
    expect(name.states, contains(WidgetState.disabled));

    pending.complete(
      const HostCreatedCustomer(
        organizerId: 'organizer-1',
        contactId: 'contact-1',
        displayName: 'Maya Kapoor',
        revision: 1,
      ),
    );
    await pumpFeatureUi(tester);
    expect(returned, isA<HostCreatedCustomer>());
    expect(find.byType(HostAddPersonScreen), findsNothing);
  });
}

/// The dock's Add person; the title says the same.
final _add = find.descendant(
  of: find.byType(CatchDock),
  matching: find.text('Add person'),
);

Finder _input(String key) => find.descendant(
  of: find.byKey(ValueKey(key)),
  matching: find.byType(TextField),
);

String? _fieldTitle(WidgetTester tester, String key) =>
    tester.widget<CatchField>(find.byKey(ValueKey(key))).title;

Future<void> _pumpAddCustomer(
  WidgetTester tester, {
  List<Override> overrides = const [],
}) async {
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) =>
            const HostAddPersonScreen(organizerId: 'organizer-1'),
      ),
    ],
  );
  await tester.pumpWidget(
    ProviderScope(
      retry: catchProviderRetry,
      overrides: [
        firebaseFirestoreProvider.overrideWithValue(FakeFirebaseFirestore()),
        ...overrides,
      ],
      child: MaterialApp.router(
        theme: AppTheme.light,
        routerConfig: router,
        builder: (context, child) =>
            CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

class _CreatePersonProbe extends Fake implements HostCustomersController {
  _CreatePersonProbe({this.result});

  /// What the create answers; null fails it as a retryable save.
  final Future<HostCreatedCustomer>? result;
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
    return result ?? (throw StateError('Simulated retryable save failure'));
  }
}
