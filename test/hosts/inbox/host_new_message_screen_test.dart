import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_new_message_screen.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';
import 'host_inbox_test_fixtures.dart';

class _Directory extends HostCustomersDirectoryController {
  @override
  Future<HostCustomersDirectoryState> build(
    HostCustomersDirectoryRequest request,
  ) async => const HostCustomersDirectoryState(
    contacts: [
      HostCustomerDirectoryContact(
        contactId: 'person',
        displayName: 'Riya',
        attendedEventCount: 0,
        lastAttendedAt: null,
        tags: {},
        hasAmbiguousIdentity: false,
        whatsappOptedIn: false,
        whatsappAdminSuppressed: false,
      ),
    ],
    nextCursor: null,
    matchCount: 1,
    matchCountCoverage: HostCustomerMatchCountCoverage.exact,
    sourceCoverage: HostCustomerDirectoryCoverage.exact,
    projectionVersion: 1,
  );
}

class _PendingDirectory extends HostCustomersDirectoryController {
  @override
  Future<HostCustomersDirectoryState> build(
    HostCustomersDirectoryRequest request,
  ) => Completer<HostCustomersDirectoryState>().future;
}

class _Actions extends Fake implements HostCustomersController {
  final opened = <String>[];
  @override
  Future<String> startConversation({
    required String organizerId,
    required String contactId,
  }) async {
    opened.add('$organizerId/$contactId');
    return 'existing';
  }
}

HostCommunicationPlan _plan(bool available) => HostCommunicationPlan(
  organizerId: 'org',
  intent: HostCommunicationIntent.individualConversation,
  capabilityVersion: 1,
  resolvedAt: DateTime(2026, 9, 16),
  recipients: [
    HostCommunicationRecipientPlan(
      contactId: 'person',
      displayName: 'Riya',
      outcome: available
          ? HostCommunicationOutcome.inCatch
          : HostCommunicationOutcome.unavailable,
      recommendedRouteId: available ? HostCommunicationRouteId.catchChat : null,
      routes: [
        HostCommunicationRouteOption(
          routeId: HostCommunicationRouteId.catchChat,
          executionMode: HostCommunicationExecutionMode.managedDelivery,
          availability: available
              ? HostCommunicationRouteAvailability.available
              : HostCommunicationRouteAvailability.unavailable,
          blocker: available
              ? null
              : HostCommunicationRouteBlocker.catchAccountRequired,
        ),
      ],
    ),
  ],
);

void main() {
  testWidgets('new-message loading uses the eventual full-width person row', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostCustomersDirectoryControllerProvider.overrideWith2(
            (_) => _PendingDirectory(),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const HostNewMessageScreen(organizerId: 'org'),
        ),
      ),
    );
    await tester.pump();
    expect(find.byType(CatchSkeleton), findsNWidgets(3));
    for (final skeleton in find.byType(CatchSkeleton).evaluate()) {
      final loadingField = find.descendant(
        of: find.byWidget(skeleton.widget),
        matching: find.byType(CatchField),
      );
      expect(tester.getRect(loadingField).width, 800);
    }
    expect(find.bySemanticsLabel('Loading person'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  for (final available in [true, false]) {
    testWidgets(
      'new message resolves a person and respects route availability $available',
      (tester) async {
        final actions = _Actions();
        HostNewMessageSelection? selected;
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              uidProvider.overrideWithValue(const AsyncData('host')),
              hostCustomersDirectoryControllerProvider.overrideWith2(
                (_) => _Directory(),
              ),
              hostCustomersControllerProvider.overrideWithValue(actions),
              hostCommunicationPlanProvider(
                'org',
                'person',
              ).overrideWithValue(AsyncData(_plan(available))),
              hostWhatsappThreadsProvider('org').overrideWithValue(
                const AsyncData(
                  HostWhatsappThreadPage(
                    organizerId: 'org',
                    threads: [],
                    nextCursor: null,
                  ),
                ),
              ),
              matchStreamProvider('existing').overrideWithValue(
                AsyncData(
                  preview('existing', 'guest', events: ['event']).match,
                ),
              ),
            ],
            child: MaterialApp(
              theme: AppTheme.light,
              home: Builder(
                builder: (context) => Scaffold(
                  body: CatchButton(
                    label: 'Compose',
                    onPressed: () async {
                      selected = await Navigator.of(context)
                          .push<HostNewMessageSelection>(
                            MaterialPageRoute(
                              builder: (_) => const HostNewMessageScreen(
                                organizerId: 'org',
                              ),
                            ),
                          );
                    },
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Compose'));
        await pumpUntilFound(tester, find.text('Riya'));
        await pumpFeatureUi(tester);
        expect(find.text('Add person'), findsOneWidget);
        expect(find.byType(CatchSearchField), findsOneWidget);
        await tester.tap(find.text('Riya'));
        await pumpFeatureUi(tester);
        if (available) {
          expect(actions.opened, isEmpty);
          await tester.tap(find.text('Message via Catch'));
          await pumpFeatureUi(tester);
          expect(actions.opened, ['org/person']);
          expect(selected?.endpointId, 'existing');
          expect(selected?.scope, const HostInboxScope.event('event'));
        } else {
          expect(find.text('Message via Catch'), findsNothing);
          expect(find.text('Open person details'), findsOneWidget);
          expect(actions.opened, isEmpty);
          expect(selected, isNull);
        }
        expect(tester.takeException(), isNull);
      },
    );
  }
}
