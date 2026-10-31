import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/host_legacy_redirects.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/profile_readiness_fixtures.dart';
import '../test_pump_helpers.dart';

const _testUid = 'user-1';

UserProfile _socialReadyUser() => buildSocialReadyUser(uid: _testUid);

UserProfile _identityIncompleteUser() => UserProfile(
  uid: _testUid,
  name: 'New Runner',
  dateOfBirth: DateTime(1995, 6, 15),
  gender: Gender.man,
  phoneNumber: '',
  profileComplete: false,
);

UserProfile _bookingReadyUser() =>
    buildBookingReadyIncompleteUser(uid: _testUid);

String? _redirect({
  required AsyncValue<String?> uidAsync,
  required AsyncValue<UserProfile?> userProfileAsync,
  required String location,
  bool hasPendingAuthVerification = false,
  String? matchedLocation,
}) {
  final uri = Uri.parse(location);
  return appRedirect(
    uidAsync: uidAsync,
    userProfileAsync: userProfileAsync,
    hasPendingAuthVerification: hasPendingAuthVerification,
    matchedLocation: matchedLocation ?? uri.path,
    uri: uri,
  );
}

// Public provider transitions produce combined states without internal APIs.
Future<AsyncValue<UserProfile?>> _profileFailure({
  bool previousKnown = false,
  UserProfile? previous,
  bool retry = false,
}) async {
  var pending = Completer<UserProfile?>();
  final provider = FutureProvider<UserProfile?>((ref) => pending.future);
  final container = ProviderContainer(retry: (_, _) => null);
  try {
    container.listen(provider, (_, _) {});
    if (previousKnown) {
      pending.complete(previous);
      await container.read(provider.future);
      pending = Completer<UserProfile?>();
      container.invalidate(provider);
    }
    final failed = container.read(provider.future);
    pending.completeError(StateError('profile unavailable'), StackTrace.empty);
    await expectLater(failed, throwsStateError);
    if (retry) {
      pending = Completer<UserProfile?>();
      container.invalidate(provider);
    }
    final snapshot = container.read(provider);
    expect(
      (
        snapshot.hasValue,
        snapshot.isLoading,
        snapshot.hasError,
        snapshot.value,
      ),
      (previousKnown, retry, true, previous),
    );
    expect(snapshot.error, isStateError);
    return snapshot;
  } finally {
    container.dispose();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  group('profile-read recovery before protected routes', () {
    const destination = '/payment-history?source=receipt';
    final loading = Uri(
      path: '/loading',
      queryParameters: {'from': destination},
    ).toString();
    final failure = AsyncError<UserProfile?>(
      StateError('profile unavailable'),
      StackTrace.empty,
    );

    test(
      'initial and cached-null failures retain the intended destination',
      () async {
        for (final profile in [
          failure,
          await _profileFailure(previousKnown: true),
          await _profileFailure(retry: true),
        ]) {
          for (final location in [
            destination,
            Uri(
              path: '/onboarding',
              queryParameters: {'from': destination},
            ).toString(),
          ]) {
            expect(
              _redirect(
                uidAsync: const AsyncData(_testUid),
                userProfileAsync: profile,
                location: location,
              ),
              loading,
            );
          }
          expect(
            _redirect(
              uidAsync: const AsyncData(_testUid),
              userProfileAsync: profile,
              location: loading,
            ),
            isNull,
          );
        }
      },
    );

    test('successful absence still enters onboarding with the same intent', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: const AsyncData(null),
          location: loading,
        ),
        Uri(
          path: '/onboarding',
          queryParameters: {'from': destination},
        ).toString(),
      );
    });

    test('cached real profile remains usable after a failed refresh', () async {
      final profile = await _profileFailure(
        previousKnown: true,
        previous: _socialReadyUser(),
      );
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: profile,
          location: destination,
        ),
        isNull,
      );
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: profile,
          location: loading,
        ),
        destination,
      );
    });

    test('public browsing remains available during profile failure', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: failure,
          location: Routes.exploreScreen.path,
        ),
        isNull,
      );
    });

    test('Host routes remain independent of the Consumer profile', () {
      AppConfig.configureEntrypointRole(AppRole.host);
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: failure,
          location: Routes.hostTodayScreen.path,
        ),
        isNull,
      );
    });

    for (final intent in ['complete-profile', 'complete-run-preferences']) {
      test(
        '$intent survives error and retry when returning to own account',
        () async {
          final onboarding = Uri(
            path: '/onboarding',
            queryParameters: {'intent': intent, 'from': '/you'},
          ).toString();
          final blocked = _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: failure,
            location: onboarding,
          )!;
          final blockedUri = Uri.parse(blocked);
          expect(blockedUri.path, '/loading');
          expect(blockedUri.queryParameters, {
            'intent': intent,
            'from': '/you',
          });
          for (final profile in [failure, await _profileFailure(retry: true)]) {
            expect(
              _redirect(
                uidAsync: const AsyncData(_testUid),
                userProfileAsync: profile,
                location: blocked,
              ),
              isNull,
            );
          }
          final incomplete = _bookingReadyUser().copyWith(
            activityPreferences: const ActivityPreferences(),
          );
          expect(
            _redirect(
              uidAsync: const AsyncData(_testUid),
              userProfileAsync: AsyncData(incomplete),
              location: blocked,
            ),
            onboarding,
          );
          expect(
            _redirect(
              uidAsync: const AsyncData(_testUid),
              userProfileAsync: AsyncData(incomplete),
              location: onboarding,
            ),
            isNull,
          );
          expect(
            _redirect(
              uidAsync: const AsyncData(_testUid),
              userProfileAsync: AsyncData(_socialReadyUser()),
              location: onboarding,
            ),
            '/you',
          );
        },
      );
    }
  });

  group('own account access before profile setup', () {
    for (final path in [
      '/you',
      '/settings',
      '/settings/whatsapp',
      '/you/forms',
      '/you/forms/response-1',
      '/events/event-1/chat',
      '/events/event-1/chat/profile',
      '/events/event-1/chat/people',
      '/events/event-1/chat/people/person-1',
      '/chats',
    ]) {
      test('$path requires resolved auth but not a loaded profile', () {
        for (final profile in <AsyncValue<UserProfile?>>[
          const AsyncLoading(),
          const AsyncData(null),
          AsyncData(_identityIncompleteUser()),
          AsyncError(StateError('profile unavailable'), StackTrace.empty),
        ]) {
          expect(
            _redirect(
              uidAsync: const AsyncData(_testUid),
              userProfileAsync: profile,
              location: path,
            ),
            isNull,
          );
          expect(
            _redirect(
              uidAsync: const AsyncData(null),
              userProfileAsync: const AsyncData(null),
              location: path,
            ),
            startsWith('/start'),
          );
          expect(
            _redirect(
              uidAsync: const AsyncLoading(),
              userProfileAsync: profile,
              location: path,
            ),
            startsWith('/loading'),
          );
          for (final entry in ['/auth', '/loading', '/start', '/onboarding']) {
            expect(
              _redirect(
                uidAsync: const AsyncData(_testUid),
                userProfileAsync: profile,
                location: '$entry?from=${Uri.encodeComponent(path)}',
              ),
              path,
            );
          }
        }
      });
    }
    test('does not waive adjacent private or booking routes', () {
      for (final path in [
        '/you/reviews',
        '/you/unknown',
        '/settings/launch-access',
        '/you/forms/response-1/other',
        '/events/event-1/chat/other',
        '/events/event-1/chat/people/person-1/other',
        '/payment-history',
        '/chats/match-1',
        '/chats/unknown/other',
      ]) {
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: const AsyncData(null),
            location: path,
          ),
          startsWith('/onboarding'),
        );
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: const AsyncLoading(),
            location: path,
          ),
          startsWith('/loading'),
        );
      }
    });
  });

  group('form profile claim routes', () {
    test('requires sign-in but not a dating or booking-ready profile', () {
      for (final path in ['/you/forms', '/you/forms/response-1']) {
        expect(
          _redirect(
            uidAsync: const AsyncData(null),
            userProfileAsync: const AsyncData(null),
            location: path,
          ),
          startsWith('/start'),
        );
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: const AsyncData(null),
            location: path,
          ),
          isNull,
        );
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: AsyncData(_identityIncompleteUser()),
            location: path,
          ),
          isNull,
        );
      }
    });
    test(
      'returns to form review after authentication, preserving other gates',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: const AsyncData(null),
            location: '/auth?from=%2Fyou%2Fforms%2Fresponse-1',
          ),
          '/you/forms/response-1',
        );
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: const AsyncData(null),
            location: '/payment-history',
          ),
          startsWith('/onboarding'),
        );
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: const AsyncData(null),
            location: '/you/forms/response-1/other',
          ),
          startsWith('/onboarding'),
        );
      },
    );
  });

  group('route role boundary', () {
    test('host management routes are not available to consumer role', () {
      final hostRoutes = Routes.values.where(
        (route) => route.audience == AppRouteAudience.host,
      );

      expect(hostRoutes, isNotEmpty);
      for (final route in hostRoutes) {
        expect(
          routeAvailableForAppRole(route, AppRole.consumer),
          isFalse,
          reason: '${route.name} should stay host-app only.',
        );
        expect(routeAvailableForAppRole(route, AppRole.host), isTrue);
      }
    });

    test('consumer routes are not mounted for the Host app role', () {
      final consumerRoutes = Routes.values.where(
        (route) => route.audience == AppRouteAudience.consumer,
      );

      expect(consumerRoutes, isNotEmpty);
      for (final route in consumerRoutes) {
        expect(
          routeAvailableForAppRole(route, AppRole.host),
          isFalse,
          reason: '${route.name} should stay consumer-app only.',
        );
        expect(routeAvailableForAppRole(route, AppRole.consumer), isTrue);
      }
    });

    test('launch access is a normal Consumer Settings route', () {
      expect(Routes.launchAccessScreen.path, '/settings/launch-access');
      expect(Routes.launchAccessScreen.audience, AppRouteAudience.consumer);
      expect(
        routeAvailableForAppRole(Routes.launchAccessScreen, AppRole.consumer),
        isTrue,
      );
      expect(
        routeAvailableForAppRole(Routes.launchAccessScreen, AppRole.host),
        isFalse,
      );
    });

    test('shared bootstrap and development routes remain role-neutral', () {
      final sharedRoutes = Routes.values.where(
        (route) => route.audience == AppRouteAudience.shared,
      );

      expect(sharedRoutes, isNotEmpty);
      for (final route in sharedRoutes) {
        expect(routeAvailableForAppRole(route, AppRole.consumer), isTrue);
        expect(routeAvailableForAppRole(route, AppRole.host), isTrue);
      }
    });

    test('consumer in-app event deep links stay on consumer event routes', () {
      expect(
        AppDeepLinks.inAppEventPath(
          organizerId: 'club-1',
          eventId: 'event-1',
          appRole: AppRole.consumer,
        ),
        '/organizers/club-1/events/event-1',
      );
      expect(
        AppDeepLinks.inAppEventPath(
          organizerId: 'club-1',
          eventId: 'event-1',
          appRole: AppRole.host,
        ),
        '/host/organizers/club-1/events/event-1',
      );
    });
  });

  group('guest public route matcher', () {
    test('allows only the declared public discovery route shapes', () {
      for (final location in [
        '/start',
        '/auth',
        '/organizers',
        '/organizers/map',
        '/organizers/club-1',
        '/organizers/club-1/events/event-1',
        '/events/event-1/location',
      ]) {
        expect(
          isGuestPublicRoute(location),
          isTrue,
          reason: '$location should remain guest-public.',
        );
      }
    });

    test('rejects nested account routes under public organizer paths', () {
      for (final location in [
        '/saved-events',
        '/organizers/club-1/events/event-1/companion',
        '/organizers/club-1/events/event-1/manage',
        '/organizers/club-1/settings',
      ]) {
        expect(
          isGuestPublicRoute(location),
          isFalse,
          reason: '$location must remain account-only.',
        );
      }
    });
  });

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

  group('appRedirect', () {
    test('host app starts on host tooling instead of the consumer welcome', () {
      AppConfig.configureEntrypointRole(AppRole.host);
      final container = ProviderContainer();
      addTearDown(container.dispose);

      expect(
        container.read(initialAppLocationProvider),
        Routes.hostTodayScreen.path,
      );
    });

    test('host app sends unauthenticated users directly to auth', () {
      AppConfig.configureEntrypointRole(AppRole.host);

      expect(
        _redirect(
          uidAsync: const AsyncData(null),
          userProfileAsync: const AsyncData(null),
          location: '/host/organizers',
          matchedLocation: Routes.hostOrganizersScreen.path,
        ),
        '/auth?from=%2Fhost%2Forganizers',
      );

      expect(
        _redirect(
          uidAsync: const AsyncData(null),
          userProfileAsync: const AsyncData(null),
          location: '/start',
          matchedLocation: Routes.startScreen.path,
        ),
        '/auth',
      );
    });

    test('host app does not resume stale consumer destinations', () {
      AppConfig.configureEntrypointRole(AppRole.host);

      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: const AsyncData(null),
          location: '/auth?from=%2Fclubs',
          matchedLocation: Routes.authScreen.path,
        ),
        Routes.hostTodayScreen.path,
      );
    });

    test(
      'unauthenticated users are sent to the start screen with the pending route',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(null),
            userProfileAsync: const AsyncData(null),
            location: '/chats/match-1',
            matchedLocation: Routes.chatScreen.path,
          ),
          '/start?from=%2Fchats%2Fmatch-1',
        );
      },
    );

    test('unauthenticated users can stay on the start screen', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(null),
          userProfileAsync: const AsyncData(null),
          location: '/start',
          matchedLocation: Routes.startScreen.path,
        ),
        null,
      );
    });

    test('unauthenticated users can browse Explore', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(null),
          userProfileAsync: const AsyncData(null),
          location: '/clubs',
          matchedLocation: Routes.exploreScreen.path,
        ),
        null,
      );
    });

    test(
      'legacy unauthenticated onboarding links move to start and preserve from',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(null),
            userProfileAsync: const AsyncData(null),
            location: '/onboarding?from=%2Fclubs%2Fclub-1',
            matchedLocation: Routes.onboardingScreen.path,
          ),
          '/start?from=%2Fclubs%2Fclub-1',
        );
      },
    );

    test(
      'authenticated users without a profile may still browse public routes',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: const AsyncData(null),
            location: '/organizers',
            matchedLocation: Routes.exploreScreen.path,
          ),
          null,
        );
      },
    );

    test('authenticated users without a profile still gate private routes', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: const AsyncData(null),
          location: '/chats/match-1',
          matchedLocation: '/chats/match-1',
        ),
        '/onboarding?from=%2Fchats%2Fmatch-1',
      );
    });

    test('club detail deep links are accessible to unauthenticated users', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(null),
          userProfileAsync: const AsyncData(null),
          location: '/clubs/club-1',
          matchedLocation: Routes.organizerDetailScreen.path,
        ),
        null,
      );
    });

    test('event detail deep links are accessible to unauthenticated users', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(null),
          userProfileAsync: const AsyncData(null),
          location: '/clubs/club-1/events/event-1',
          matchedLocation: Routes.eventDetailScreen.path,
        ),
        null,
      );
    });

    test('event companion deep links require authentication', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(null),
          userProfileAsync: const AsyncData(null),
          location: '/organizers/club-1/events/event-1/companion',
          matchedLocation: Routes.eventSuccessCompanionScreen.path,
        ),
        '/start?from=%2Forganizers%2Fclub-1%2Fevents%2Fevent-1%2Fcompanion',
      );
    });

    test(
      'identity-incomplete profiles stay in onboarding and preserve the pending route',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: AsyncData(_identityIncompleteUser()),
            location: '/auth?from=%2Fchats%2Fmatch-1',
            matchedLocation: Routes.authScreen.path,
          ),
          '/onboarding?from=%2Fchats%2Fmatch-1',
        );
      },
    );

    test(
      'booking-ready users can access event routes without a social-ready profile',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: AsyncData(_bookingReadyUser()),
            location: '/clubs/club-1/events/event-1',
            matchedLocation: Routes.eventDetailScreen.path,
          ),
          null,
        );
      },
    );

    test('booking-ready users are sent to profile completion for catches', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: AsyncData(_bookingReadyUser()),
          location: '/catches/event-1?tab=recent',
          matchedLocation: Routes.swipeEventScreen.path,
        ),
        '/onboarding?intent=complete-profile&from=%2Fcatches%2Fevent-1%3Ftab%3Drecent',
      );
    });

    test('booking-ready users may hit the retired catches hub redirect', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: AsyncData(_bookingReadyUser()),
          location: '/catches',
          matchedLocation: Routes.swipeHubScreen.path,
        ),
        null,
      );
    });

    test('profile-completion onboarding is allowed until social ready', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: AsyncData(_bookingReadyUser()),
          location:
              '/onboarding?intent=complete-profile&from=%2Fcatches%2Fevent-1',
          matchedLocation: Routes.onboardingScreen.path,
        ),
        null,
      );
    });

    test(
      'run-preference onboarding is allowed until run preferences are ready',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: AsyncData(
              _socialReadyUser().copyWith(
                activityPreferences: const ActivityPreferences(),
              ),
            ),
            location:
                '/onboarding?intent=complete-run-preferences&from=%2Fclubs%2Fclub-1%2Fevents%2Fevent-1',
            matchedLocation: Routes.onboardingScreen.path,
          ),
          null,
        );
      },
    );

    test('run-preference onboarding resumes once run preferences are ready', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: AsyncData(_socialReadyUser()),
          location:
              '/onboarding?intent=complete-run-preferences&from=%2Fclubs%2Fclub-1%2Fevents%2Fevent-1',
          matchedLocation: Routes.onboardingScreen.path,
        ),
        '/clubs/club-1/events/event-1',
      );
    });

    test('loading auth state routes through the loading screen', () {
      expect(
        _redirect(
          uidAsync: const AsyncLoading(),
          userProfileAsync: const AsyncLoading(),
          location: '/catches/event-1?tab=recent',
          matchedLocation: Routes.swipeEventScreen.path,
        ),
        '/loading?from=%2Fcatches%2Fevent-1%3Ftab%3Drecent',
      );
    });

    test(
      'fully set-up users resume the preserved destination from onboarding',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: AsyncData(_socialReadyUser()),
            location: '/onboarding?from=%2Fchats%2Fmatch-1',
            matchedLocation: Routes.onboardingScreen.path,
          ),
          '/chats/match-1',
        );
      },
    );

    test('fully set-up users visiting the auth route land on dashboard', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: AsyncData(_socialReadyUser()),
          location: '/auth',
          matchedLocation: Routes.authScreen.path,
        ),
        '/',
      );
    });

    test(
      'fully set-up users visiting start resume the preserved destination',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(_testUid),
            userProfileAsync: AsyncData(_socialReadyUser()),
            location: '/start?from=%2Fclubs%2Fclub-1',
            matchedLocation: Routes.startScreen.path,
          ),
          '/clubs/club-1',
        );
      },
    );

    test('unauthenticated users can access the auth route', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(null),
          userProfileAsync: const AsyncData(null),
          location: '/auth?from=%2Fchats%2Fmatch-1',
          matchedLocation: Routes.authScreen.path,
        ),
        null,
      );
    });

    test(
      'pending OTP verification returns signed-out users from start to auth',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(null),
            userProfileAsync: const AsyncData(null),
            hasPendingAuthVerification: true,
            location: '/start',
            matchedLocation: Routes.startScreen.path,
          ),
          Routes.authScreen.path,
        );
      },
    );

    test(
      'pending OTP verification returns signed-out users from default route to auth',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(null),
            userProfileAsync: const AsyncData(null),
            hasPendingAuthVerification: true,
            location: '/',
            matchedLocation: Routes.dashboardScreen.path,
          ),
          '/auth?from=%2F',
        );
      },
    );

    test(
      'pending OTP verification does not steal signed-out public club browsing',
      () {
        expect(
          _redirect(
            uidAsync: const AsyncData(null),
            userProfileAsync: const AsyncData(null),
            hasPendingAuthVerification: true,
            location: '/clubs/club-1',
            matchedLocation: Routes.organizerDetailScreen.path,
          ),
          null,
        );
      },
    );

    test('invalid from values are discarded on resume', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: AsyncData(_socialReadyUser()),
          location: '/auth?from=chats/match-1',
          matchedLocation: Routes.authScreen.path,
        ),
        '/',
      );
    });

    test('authority-style from values are discarded on resume', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: AsyncData(_socialReadyUser()),
          location: '/auth?from=%2F%2Fexample.com%2Fclubs',
          matchedLocation: Routes.authScreen.path,
        ),
        '/',
      );
    });

    test('transient pending destinations resume to dashboard', () {
      expect(
        _redirect(
          uidAsync: const AsyncData(_testUid),
          userProfileAsync: AsyncData(_socialReadyUser()),
          location: '/loading?from=%2Fauth',
          matchedLocation: Routes.loadingScreen.path,
        ),
        '/',
      );
    });
  });
}
