import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/host_legacy_redirects.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../test_pump_helpers.dart';

/// Host organizer routes, split from router_redirect_test.dart to keep
/// each routing test file under the size budget.
void main() {
  group('Host organizer routes', () {
    test('legacy Host root redirects to Today', () {
      expect(Routes.hostHomeScreen.path, '/host');
      expect(Routes.hostTodayScreen.path, '/host/today');
      expect(Routes.hostEventsScreen.path, '/host/events');
      expect(Routes.hostAudienceScreen.path, '/host/audience');
      expect(Routes.hostAddCustomerScreen.path, '/host/audience/people/new');
      expect(
        Routes.hostCreateSavedAudienceScreen.path,
        '/host/audience/audiences/new',
      );
      expect(
        Routes.hostSavedAudienceDetailScreen.path,
        '/host/audience/audiences/:audienceId',
      );
      expect(Routes.hostCustomersLegacyScreen.path, '/host/customers');
      expect(Routes.hostFormsLegacyScreen.path, '/host/forms');
      expect(Routes.hostApplicationsScreen.path, '/host/audience/applications');
      expect(
        Routes.hostApplicationDetailScreen.path,
        '/host/audience/applications/:applicationId',
      );
      expect(
        Routes.hostCustomerDetailScreen.path,
        '/host/audience/people/:contactId',
      );
      expect(hostHomeLegacyRedirect(), Routes.hostTodayScreen.path);
    });

    test('legacy event operator links redirect onto the work shell', () {
      expect(Routes.hostWorkEventScreen.path, '/host/work/event/:eventId');
      expect(
        hostOperatorEventLegacyRedirect(
          Uri.parse('/host/operator/event-9?invite=abc'),
          eventId: 'event-9',
        ),
        '/host/work/event/event-9?invite=abc',
      );
    });

    test('legacy application links redirect into Audience ownership', () {
      expect(
        hostApplicationsLegacyRedirect(
          Uri.parse('/host/customers/applications?organizerId=organizer-1'),
        ),
        '/host/audience?organizerId=organizer-1&view=responses',
      );
      expect(
        hostApplicationsLegacyRedirect(
          Uri.parse(
            '/host/customers/applications/application-1?organizerId=organizer-1',
          ),
          applicationId: 'application-1',
        ),
        '/host/audience/applications/application-1?organizerId=organizer-1',
      );
    });

    test('retired application directories preserve filters in Responses', () {
      for (final path in [
        '/host/audience/applications',
        '/host/customers/applications',
        '/host/forms/applications',
      ]) {
        final uri = Uri.parse(
          '$path?organizerId=organizer-1&formId=form-1&contactId=contact-1&view=forms',
        );
        final redirected = Uri.parse(
          path.startsWith('/host/customers')
              ? hostCustomersLegacyRedirect(uri)
              : path.startsWith('/host/forms')
              ? hostFormsLegacyRedirect(uri)
              : hostApplicationsLegacyRedirect(uri),
        );
        expect(redirected.path, Routes.hostAudienceScreen.path);
        expect(redirected.queryParameters, {
          'organizerId': 'organizer-1',
          'formId': 'form-1',
          'contactId': 'contact-1',
          'view': 'responses',
        });
      }
    });

    test('legacy application detail links still open the exact application', () {
      for (final redirect in [
        hostCustomersLegacyRedirect,
        hostFormsLegacyRedirect,
      ]) {
        final base = redirect == hostCustomersLegacyRedirect
            ? 'customers'
            : 'forms';
        final redirected = Uri.parse(
          redirect(
            Uri.parse(
              '/host/$base/applications/application-1?organizerId=organizer-1',
            ),
          ),
        );
        expect(redirected.path, '/host/audience/applications/application-1');
        expect(redirected.queryParameters['organizerId'], 'organizer-1');
      }
    });

    test('legacy Customers and Forms links preserve deep-link state', () {
      expect(
        hostCustomersLegacyRedirect(
          Uri.parse(
            '/host/customers/audiences/audience-1?organizerId=organizer-1',
          ),
        ),
        '/host/audience/audiences/audience-1?organizerId=organizer-1',
      );
      expect(
        hostCustomersLegacyRedirect(
          Uri.parse('/host/customers/contact-1?organizerId=organizer-1'),
        ),
        '/host/audience/people/contact-1?organizerId=organizer-1',
      );
      expect(
        hostFormsLegacyRedirect(
          Uri.parse('/host/forms?organizerId=organizer-1&view=responses'),
        ),
        '/host/audience?organizerId=organizer-1&view=responses',
      );
      expect(
        hostFormsLegacyRedirect(
          Uri.parse('/host/forms/form-1/analytics?organizerId=organizer-1'),
        ),
        '/host/audience/forms/form-1/analytics?organizerId=organizer-1',
      );
    });

    test('organizer settings spokes use canonical top-level routes', () {
      expect(
        Routes.hostOrganizerEventDefaultsScreen.path,
        '/host/organizers/event-defaults',
      );
      expect(
        Routes.hostOrganizerLiveGuideScreen.path,
        '/host/organizers/live-guide',
      );
      expect(Routes.hostOrganizerTeamScreen.path, '/host/organizers/team');
      expect(
        Routes.hostOrganizerPaymentsScreen.path,
        '/host/organizers/payments',
      );
      expect(
        Routes.hostEventRehearsalStartScreen.path,
        '/host/organizers/:organizerId/rehearsals/new',
      );
      expect(
        Routes.hostEventRehearsalScreen.path,
        '/host/organizers/:organizerId/rehearsals/:sessionId',
      );
      expect(
        Routes.hostOrganizerMessagingScreen.path,
        '/host/organizer/:organizerId/messaging',
      );

      for (final route in [
        Routes.hostOrganizerEventDefaultsScreen,
        Routes.hostOrganizerLiveGuideScreen,
        Routes.hostOrganizerTeamScreen,
        Routes.hostOrganizerPaymentsScreen,
        Routes.hostOrganizerMessagingScreen,
      ]) {
        expect(route.audience, AppRouteAudience.host);
      }
    });

    test('organizer route forwards stable edit field query keys', () {
      final screen = hostOrganizerScreenForUri(
        Uri.parse(
          '/host/organizer?organizerId=club-1&tab=insights&editField=description',
        ),
      );

      expect(screen.initialOrganizerId, 'club-1');
      expect(screen.initialExpandedEditField, 'description');
      expect(screen.initialTab.name, 'insights');
      expect(screen.effectiveInitialTab.name, 'edit');
    });

    test('redirects the retired Organizer Audience tab into Audience', () {
      expect(
        hostOrganizerAudienceRedirect(
          Uri.parse('/host/organizer?organizerId=club-1&tab=audience'),
        ),
        '/host/audience?organizerId=club-1',
      );
      expect(
        hostOrganizerAudienceRedirect(
          Uri.parse('/host/organizer?organizerId=club-1&tab=insights'),
        ),
        isNull,
      );
    });

    test('organizer index opens the primary organizer workspace', () {
      expect(
        hostOrganizerIndexRedirect(Uri.parse('/host/organizers')),
        Routes.hostOrganizerScreen.path,
      );
      expect(
        hostOrganizerIndexRedirect(
          Uri.parse('/host/organizers?source=host-navigation'),
        ),
        '/host/organizer?source=host-navigation',
      );
    });

    testWidgets('GoRouter keeps the canonical create-event child route', (
      tester,
    ) async {
      final router = GoRouter(
        initialLocation: '/host/organizers/club-1/create-event',
        routes: [
          GoRoute(
            path: Routes.hostOrganizerScreen.path,
            builder: (_, _) => const Text('Organizer route'),
          ),
          GoRoute(
            path: Routes.hostOrganizersScreen.path,
            redirect: (_, state) => hostOrganizerIndexRedirect(state.uri),
            routes: [
              GoRoute(
                path: ':organizerId',
                builder: (_, _) => const Text('Club route'),
                routes: [
                  GoRoute(
                    path: 'create-event',
                    builder: (_, _) => const Text('Create event route'),
                  ),
                ],
              ),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await pumpFeatureUi(tester);

      expect(find.text('Create event route'), findsOneWidget);
      expect(find.text('Organizer route'), findsNothing);
    });
  });
}
