import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_chrome_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_map_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_organizer_display_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' as events;

final _l10n = AppLocalizationsEn();
final _matrixNow = DateTime(2026, 7, 21, 12);

void main() {
  final matrix = _readMatrix();
  final appHarness = (matrix['proofHarnesses'] as List<Object?>)
      .cast<Map<String, Object?>>()
      .singleWhere((entry) => entry['id'] == 'app.publicSurfaceBehavior');
  final appSurfaces = (matrix['surfaces'] as List<Object?>)
      .cast<Map<String, Object?>>()
      .where((surface) => surface['platform'] == 'app')
      .toList(growable: false);
  final configurations = <({Map<String, Object?> config, String surfaceId})>[
    for (final surface in appSurfaces)
      for (final config
          in (surface['configurations'] as List<Object?>)
              .cast<Map<String, Object?>>())
        (surfaceId: surface['id']! as String, config: config),
  ];

  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  test('synthetic organizers are never publicly browseable', () {
    expect(
      _organizerForValues(
        const {},
      ).copyWith(synthetic: true).isPubliclyBrowseable,
      isFalse,
    );
  });

  test(
    'public surface behavior contract enumerates every registered app row',
    () {
      final registered = (appHarness['configurationIds'] as List<Object?>)
          .cast<String>()
          .toSet();
      final exercised = configurations
          .map((entry) => entry.config['id']! as String)
          .toSet();
      expect(exercised, registered);
      expect(exercised.length, configurations.length);
    },
  );

  for (final entry in configurations) {
    final id = entry.config['id']! as String;
    test(id, () {
      final values = (entry.config['values']! as Map<String, Object?>)
          .cast<String, String>();
      final expectations =
          (entry.config['expectations']! as Map<String, Object?>).map(
            (key, value) => MapEntry(
              key,
              (value! as Map<String, Object?>).cast<String, String>(),
            ),
          );

      _verifyAuthority(values, expectations);
      switch (entry.surfaceId) {
        case 'app.explore':
          _verifyExplore(values, expectations);
        case 'app.exploreMap':
          _verifyExploreMap(values, expectations);
        case 'app.organizerDetail':
          _verifyOrganizerDetail(values, expectations);
        case 'app.eventDetail':
          _verifyEventDetail(id, values, expectations);
        case 'app.eventLocation':
          _verifyEventLocation(values, expectations);
        case 'app.savedEvents':
        case 'app.privateConsumerRoots':
        case 'app.ownAccountRoutes':
        case 'app.eventSuccessCompanion':
        case 'app.socialConsumerRoutes':
        case 'app.onboarding':
          _verifyRouteGuard(
            surface: appSurfaces.singleWhere(
              (surface) => surface['id'] == entry.surfaceId,
            ),
            values: values,
            expectation: expectations['route.access']!,
          );
        default:
          fail('Unowned app behavior surface ${entry.surfaceId}.');
      }
    });
  }
}

Map<String, Object?> _readMatrix() {
  return (jsonDecode(
        File('design/public_surface_behavior.json').readAsStringSync(),
      )
      as Map<String, Object?>);
}

void _verifyAuthority(
  Map<String, String> values,
  Map<String, Map<String, String>> expectations,
) {
  if (!values.containsKey('organizer.ownershipState')) return;
  final authority = _authority(values);
  final badge = expectations['organizer.provenanceBadge'];
  final variant = badge?['variant'];
  if (variant != null) {
    expect(
      _trustVariant(authority.trustState),
      variant,
      reason: 'Authority tuple must resolve to the declared UI trust variant.',
    );
  }
  if (values['organizer.claimState'] == 'suppressed') {
    expect(authority.blocksPublicRead, isTrue);
  }
}

OrganizerAuthority _authority(Map<String, String> values) {
  final ownership = values['organizer.ownershipState'] ?? 'programmatic';
  final claim = values['organizer.claimState'] ?? 'unclaimed';
  final verification = values['organizer.verificationStatus'] ?? 'unverified';
  return OrganizerAuthority.resolve(
    hasLegacyOwner: false,
    ownership: OrganizerOwnership.fromJson({'state': ownership}),
    claim: OrganizerClaim.fromJson({'state': claim}),
    publicPage: OrganizerPublicPage.fromJson({
      'publishStatus': values['organizer.publishStatus'] ?? 'published',
      'indexStatus': 'indexed',
    }),
    provenance: OrganizerProvenance.fromJson({
      'origin': ownership == 'userCreated' ? 'userCreated' : 'scraper',
      'sourceConfidence': verification == 'ownerVerified'
          ? 'ownerVerified'
          : verification == 'sourceBacked'
          ? 'high'
          : 'low',
      'verificationStatus': verification,
    }),
  );
}

String _trustVariant(OrganizerTrustState state) => switch (state) {
  OrganizerTrustState.crawledUnclaimed => 'crawled-unclaimed',
  OrganizerTrustState.sourceBacked => 'crawled-source-backed',
  OrganizerTrustState.claimPending => 'claim-pending',
  OrganizerTrustState.claimedUnverified => 'claimed-source-backed',
  OrganizerTrustState.firstParty => 'first-party',
  OrganizerTrustState.ownerVerified => 'claimed-verified',
  OrganizerTrustState.suppressed => 'suppressed',
};

void _verifyExplore(
  Map<String, String> values,
  Map<String, Map<String, String>> expectations,
) {
  final session = values['viewer.session'];
  final showAccountControls = exploreShowsAccountControls(
    authResolved: session != 'resolving',
    uid: session == 'signedIn' ? 'viewer-1' : null,
  );
  for (final element in ['account.savedEvents', 'account.joinedFilter']) {
    expect(
      expectations[element]!['disposition'],
      showAccountControls ? 'visibleNative' : 'hidden',
    );
  }
  final visible =
      _consumerOrganizerIsPubliclyBrowseable(values) && session != 'resolving';
  expect(
    expectations['organizer.card']!['disposition'],
    visible ? 'visibleReadOnly' : 'hidden',
  );
  expect(
    expectations['event.catchAction']!['disposition'],
    visible && values['event.supply'] == 'catchNative'
        ? 'visibleNative'
        : 'hidden',
  );
  expect(
    expectations['event.externalAction']!['disposition'],
    visible && values['event.supply'] == 'external'
        ? 'visibleExternal'
        : 'hidden',
  );
  final membershipState = exploreOrganizerMembershipActionState(
    contentVisible: visible,
    authResolved: session != 'resolving',
    uid: session == 'signedIn' ? 'viewer-1' : null,
    isFollowing: values['viewer.relationship'] == 'member',
  );
  expect(
    expectations['organizer.membership']!['disposition'],
    switch (membershipState) {
      ExploreOrganizerMembershipActionState.hidden => 'hidden',
      ExploreOrganizerMembershipActionState.signInGate => 'visibleSignInGate',
      ExploreOrganizerMembershipActionState.follow => 'visibleNative',
      ExploreOrganizerMembershipActionState.following => 'visibleReadOnly',
    },
  );
}

void _verifyExploreMap(
  Map<String, String> values,
  Map<String, Map<String, String>> expectations,
) {
  final session = values['viewer.session'];
  final uidAsync = switch (session) {
    'resolving' => const AsyncLoading<String?>(),
    'guest' => const AsyncData<String?>(null),
    _ => const AsyncData<String?>('viewer-1'),
  };
  expect(exploreMapViewerCacheKey(uidAsync), switch (session) {
    'resolving' => 'auth-resolving',
    'guest' => 'guest',
    _ => 'viewer:viewer-1',
  });
  expect(
    expectations['account.joinedFilter']!['disposition'],
    session == 'signedIn' ? 'visibleNative' : 'hidden',
  );
  final visible =
      _consumerOrganizerIsPubliclyBrowseable(values) && session != 'resolving';
  expect(
    expectations['event.mapMarker']!['disposition'],
    visible ? 'visibleReadOnly' : 'hidden',
  );
  expect(
    expectations['event.catchAction']!['disposition'],
    visible && values['event.supply'] == 'catchNative'
        ? 'visibleNative'
        : 'hidden',
  );
  expect(
    expectations['event.externalAction']!['disposition'],
    visible && values['event.supply'] == 'external'
        ? 'visibleExternal'
        : 'hidden',
  );
}

void _verifyOrganizerDetail(
  Map<String, String> values,
  Map<String, Map<String, String>> expectations,
) {
  final routeAllowed = _authorityRouteAllowed(values);
  expect(
    expectations['route.access']!['disposition'],
    routeAllowed ? 'routeAllowed' : 'hidden',
  );
  if (!routeAllowed || values['viewer.session'] == 'resolving') {
    for (final entry in expectations.entries) {
      if (entry.key == 'route.access' && routeAllowed) continue;
      expect(entry.value['disposition'], 'hidden', reason: entry.key);
    }
    return;
  }
  final signedIn = values['viewer.session'] == 'signedIn';
  final isOwner = values['viewer.relationship'] == 'host';
  final isMember = values['viewer.relationship'] == 'member';
  final isHostApp = values['runtime.appRole'] == 'host';
  final socialReady = values['viewer.profileReadiness'] == 'socialReady';
  final hasHost = values['organizer.hostIdentity'] == 'present';
  expect(expectations['organizer.share']!['disposition'], 'visibleNative');
  expect(
    expectations['organizer.membership']!['disposition'],
    !signedIn
        ? 'visibleSignInGate'
        : isOwner || isHostApp
        ? 'hidden'
        : 'visibleNative',
  );
  expect(
    expectations['organizer.notifications']!['disposition'],
    signedIn && isMember && !isHostApp ? 'visibleNative' : 'hidden',
  );
  expect(
    expectations['review.read']!['disposition'],
    signedIn ? 'visibleReadOnly' : 'hidden',
  );
  expect(
    expectations['host.profile']!['disposition'],
    signedIn && hasHost ? 'visibleNative' : 'hidden',
  );
  expect(
    expectations['host.message']!['disposition'],
    signedIn && socialReady && hasHost && !isOwner && !isHostApp
        ? 'visibleNative'
        : 'hidden',
  );
  expect(
    expectations['organizer.contact']!['disposition'],
    values['organizer.contactAvailability'] == 'present'
        ? 'visibleExternal'
        : 'hidden',
  );
}

void _verifyEventDetail(
  String id,
  Map<String, String> values,
  Map<String, Map<String, String>> expectations,
) {
  final routeAllowed = _authorityRouteAllowed(values);
  expect(
    expectations['route.access']!['disposition'],
    routeAllowed ? 'routeAllowed' : 'hidden',
  );
  if (!routeAllowed) {
    for (final entry in expectations.entries) {
      expect(entry.value['disposition'], 'hidden', reason: entry.key);
    }
    return;
  }
  if (values['viewer.session'] == 'resolving') {
    for (final entry in expectations.entries) {
      if (entry.key == 'route.access') continue;
      expect(entry.value['disposition'], 'hidden', reason: entry.key);
    }
    return;
  }

  final signedIn = values['viewer.session'] == 'signedIn';
  final userProfile = _profileFor(values['viewer.profileReadiness']!);
  final bookingReady = eventDetailHasBookingReadyProfile(
    userProfile,
    now: _matrixNow,
  );
  final socialReady = values['viewer.profileReadiness'] == 'socialReady';
  final isOwner = values['viewer.relationship'] == 'host';
  final isHostApp = values['runtime.appRole'] == 'host';
  final availability = values['event.availability']!;
  final lifecycle = values['event.lifecycle']!;
  expect(expectations['event.share']!['disposition'], 'visibleNative');
  expect(
    expectations['event.save']!['disposition'],
    !signedIn
        ? 'visibleSignInGate'
        : !bookingReady
        ? 'visibleProfileGate'
        : 'visibleNative',
  );
  expect(
    expectations['event.calendar']!['disposition'],
    lifecycle == 'upcoming' && ['joined', 'hosted'].contains(availability)
        ? 'visibleExternal'
        : 'hidden',
  );
  expect(
    expectations['event.companion']!['disposition'],
    availability == 'joined' ? 'visibleNative' : 'hidden',
  );
  expect(
    expectations['event.invite']!['disposition'],
    availability == 'joined' && lifecycle == 'upcoming'
        ? 'visibleNative'
        : 'hidden',
  );
  expect(
    expectations['review.write']!['disposition'],
    availability == 'attended' && lifecycle == 'past' && socialReady
        ? 'visibleNative'
        : 'hidden',
  );
  expect(
    expectations['host.message']!['disposition'],
    socialReady &&
            !isOwner &&
            !isHostApp &&
            values['organizer.hostIdentity'] == 'present'
        ? 'visibleNative'
        : 'hidden',
  );
  if (signedIn) {
    expect(
      bookingReady,
      values['viewer.profileReadiness'] != 'incomplete',
      reason: '$id must exercise a real non-null incomplete profile.',
    );
  }
  final signupExpectation = expectations['event.signup']!;
  if (!signedIn) {
    expect(signupExpectation['disposition'], 'visibleSignInGate');
  } else if (!bookingReady) {
    expect(signupExpectation['disposition'], 'visibleProfileGate');
  } else if (availability == 'profileRequired') {
    final event = events.buildEvent(
      startTime: _matrixNow.add(const Duration(hours: 2)),
      constraints: const EventConstraints(minAge: 18),
    );
    final account = userProfile!.copyWith(dateOfBirth: null);
    expect(eventDetailHasBookingReadyProfile(account, now: _matrixNow), isTrue);
    expect(
      eventDetailHasBookingReadyProfile(account, now: _matrixNow, event: event),
      isFalse,
    );
    final resolved = resolveViewerEventAvailability(
      event: event,
      userProfile: account,
      now: _matrixNow,
    );
    expect(resolved.status, ViewerEventAvailabilityStatus.profileRequired);
    expect(signupExpectation['disposition'], 'visibleProfileGate');
    expect(signupExpectation['variant'], 'complete-event-details');
  } else if (values['event.paymentCapability'] != 'notRequired') {
    final supported = values['event.paymentCapability'] == 'supported';
    final event = events.buildEvent(
      startTime: _matrixNow.add(const Duration(hours: 2)),
      priceInPaise: 15000,
    );
    final dockState = eventDetailBookingDockStateFrom(
      l10n: _l10n,
      event: event,
      userProfile: userProfile!,
      participation: null,
      now: _matrixNow,
      hasInviteCode: false,
      supportsPaidBookings: supported,
    );
    expect(
      signupExpectation['disposition'],
      dockState.primaryAction == EventDetailBookingDockAction.book
          ? 'visibleNative'
          : 'visibleDisabled',
    );
    expect(
      signupExpectation['variant'],
      dockState.primaryAction == EventDetailBookingDockAction.book
          ? 'book-and-pay'
          : 'paid-booking-unavailable',
    );
  } else if (lifecycle != 'upcoming') {
    expect(signupExpectation['disposition'], 'visibleDisabled');
  } else {
    final status = ViewerEventAvailabilityStatus.values.singleWhere(
      (status) => status.name == availability,
    );
    expect(
      eventSignUpStatusForViewerAvailability(status),
      _expectedSignUpStatus(status),
    );
    expect(
      signupExpectation['disposition'],
      _expectedSignUpDisposition(status),
    );
  }
  if (expectations['organizer.openDetail']!['disposition'] == 'visibleNative') {
    expect(
      eventDetailOrganizerRouteFor(
        isHostApp: values['runtime.appRole'] == 'host',
      ),
      values['runtime.appRole'] == 'host'
          ? Routes.hostOrganizerDetailScreen
          : Routes.organizerDetailScreen,
    );
  }
  if (values['runtime.appRole'] == 'host' &&
      expectations['organizer.openDetail']!['disposition'] == 'visibleNative') {
    expect(expectations['organizer.openDetail']!['variant'], 'host-detail');
  }
}

EventSignUpStatus _expectedSignUpStatus(ViewerEventAvailabilityStatus status) {
  return switch (status) {
    ViewerEventAvailabilityStatus.open ||
    ViewerEventAvailabilityStatus.saved ||
    ViewerEventAvailabilityStatus.approvedToBook ||
    ViewerEventAvailabilityStatus.runPreferencesRequired =>
      EventSignUpStatus.eligible,
    ViewerEventAvailabilityStatus.joined => EventSignUpStatus.signedUp,
    ViewerEventAvailabilityStatus.waitlisted => EventSignUpStatus.waitlisted,
    ViewerEventAvailabilityStatus.attended => EventSignUpStatus.attended,
    ViewerEventAvailabilityStatus.waitlistAvailable ||
    ViewerEventAvailabilityStatus.full => EventSignUpStatus.full,
    ViewerEventAvailabilityStatus.past => EventSignUpStatus.past,
    _ => EventSignUpStatus.ineligible,
  };
}

String _expectedSignUpDisposition(ViewerEventAvailabilityStatus status) {
  return switch (status) {
    ViewerEventAvailabilityStatus.open ||
    ViewerEventAvailabilityStatus.saved ||
    ViewerEventAvailabilityStatus.joined ||
    ViewerEventAvailabilityStatus.waitlisted ||
    ViewerEventAvailabilityStatus.approvedToBook ||
    ViewerEventAvailabilityStatus.requestRequired ||
    ViewerEventAvailabilityStatus.waitlistAvailable ||
    ViewerEventAvailabilityStatus.runPreferencesRequired => 'visibleNative',
    ViewerEventAvailabilityStatus.hosted => 'hidden',
    _ => 'visibleDisabled',
  };
}

void _verifyEventLocation(
  Map<String, String> values,
  Map<String, Map<String, String>> expectations,
) {
  final routeAllowed = _authorityRouteAllowed(values);
  expect(
    expectations['route.access']!['disposition'],
    routeAllowed ? 'routeAllowed' : 'hidden',
  );
  final exact = values['location.availability'] == 'exact';
  final contentReady = routeAllowed && values['viewer.session'] != 'resolving';
  expect(
    expectations['location.map']!['disposition'],
    !contentReady
        ? 'hidden'
        : exact
        ? 'visibleReadOnly'
        : 'visibleDisabled',
  );
  expect(
    expectations['location.directions']!['disposition'],
    contentReady && exact ? 'visibleExternal' : 'hidden',
  );
}

bool _authorityRouteAllowed(Map<String, String> values) {
  if (values['viewer.session'] == 'resolving') return true;
  final organizer = _organizerForValues(values);
  if (values['organizer.lifecycleAvailability'] == 'unavailable') {
    final activeOrganizer = organizer.copyWith(
      status: OrganizerLifecycleStatus.active,
      archived: false,
    );
    expect(
      activeOrganizer
          .copyWith(status: OrganizerLifecycleStatus.archived)
          .isPubliclyBrowseable,
      isFalse,
    );
    expect(
      activeOrganizer.copyWith(archived: true).isPubliclyBrowseable,
      isFalse,
    );
  }
  if (values['runtime.appRole'] == 'host') {
    return values['viewer.relationship'] == 'host' &&
        organizer.isHostedBy('owner-1');
  }
  return organizer.isPubliclyBrowseable;
}

bool _consumerOrganizerIsPubliclyBrowseable(Map<String, String> values) {
  final organizer = _organizerForValues(values);
  if (values['organizer.lifecycleAvailability'] == 'unavailable') {
    final activeOrganizer = organizer.copyWith(
      status: OrganizerLifecycleStatus.active,
      archived: false,
    );
    final lifecycleArchived = activeOrganizer.copyWith(
      status: OrganizerLifecycleStatus.archived,
    );
    final legacyArchived = activeOrganizer.copyWith(archived: true);
    expect(lifecycleArchived.isPubliclyBrowseable, isFalse);
    expect(legacyArchived.isPubliclyBrowseable, isFalse);
    return false;
  }
  return organizer.isPubliclyBrowseable;
}

Organizer _organizerForValues(Map<String, String> values) {
  final lifecycleUnavailable =
      values['organizer.lifecycleAvailability'] == 'unavailable';
  return Organizer(
    id: 'organizer-1',
    name: 'Organizer',
    description: 'Matrix fixture',
    location: 'in-dl-delhi-ncr',
    area: 'Delhi',
    hostUserId: 'owner-1',
    createdAt: DateTime(2026),
    status: lifecycleUnavailable
        ? OrganizerLifecycleStatus.archived
        : OrganizerLifecycleStatus.active,
    appVisibility: values['organizer.appVisibility'] == 'hidden'
        ? OrganizerAppVisibility.hidden
        : OrganizerAppVisibility.discoverable,
    ownership: OrganizerOwnership.fromJson({
      'state': values['organizer.ownershipState'] ?? 'programmatic',
    }),
    claim: OrganizerClaim.fromJson({
      'state': values['organizer.claimState'] ?? 'unclaimed',
    }),
    provenance: OrganizerProvenance.fromJson({
      'origin': values['organizer.ownershipState'] == 'userCreated'
          ? 'userCreated'
          : 'scraper',
      'sourceConfidence':
          values['organizer.verificationStatus'] == 'ownerVerified'
          ? 'ownerVerified'
          : values['organizer.verificationStatus'] == 'sourceBacked'
          ? 'high'
          : 'low',
      'verificationStatus':
          values['organizer.verificationStatus'] ?? 'unverified',
    }),
  );
}

void _verifyRouteGuard({
  required Map<String, Object?> surface,
  required Map<String, String> values,
  required Map<String, String> expectation,
}) {
  AppConfig.configureEntrypointRole(AppRole.consumer);
  final session = values['viewer.session']!;
  final readiness = values['viewer.profileReadiness'] ?? 'notApplicable';
  for (final routeId in (surface['routeIds'] as List<Object?>).cast<String>()) {
    final route = Routes.values.singleWhere((route) => route.name == routeId);
    final location = route.path.replaceAllMapped(
      RegExp(r':[A-Za-z][A-Za-z0-9_]*'),
      (_) => 'fixture',
    );
    final redirect = appRedirect(
      uidAsync: session == 'resolving'
          ? const AsyncLoading<String?>()
          : AsyncData<String?>(session == 'signedIn' ? 'viewer-1' : null),
      userProfileAsync: session == 'resolving'
          ? const AsyncLoading<UserProfile?>()
          : AsyncData<UserProfile?>(_profileFor(readiness)),
      hasPendingAuthVerification: false,
      matchedLocation: location,
      uri: Uri.parse(location),
    );
    final disposition = expectation['disposition'];
    switch (disposition) {
      case 'routeAllowed':
        expect(redirect, isNull, reason: routeId);
        break;
      case 'routeLoadingRedirect':
        expect(
          Uri.parse(redirect!).path,
          Routes.loadingScreen.path,
          reason: routeId,
        );
        break;
      case 'routeSignInRedirect':
        expect(
          [Routes.startScreen.path, Routes.authScreen.path],
          contains(Uri.parse(redirect!).path),
          reason: routeId,
        );
        break;
      case 'routeProfileRedirect':
        expect(
          Uri.parse(redirect!).path,
          Routes.onboardingScreen.path,
          reason: routeId,
        );
        break;
      case 'routeResumeRedirect':
        expect(redirect, isNotNull, reason: routeId);
        expect(Uri.parse(redirect!).path, isNot(Routes.onboardingScreen.path));
        break;
      default:
        fail('Unknown route disposition $disposition for $routeId.');
    }
  }
}

UserProfile? _profileFor(String readiness) {
  if (readiness == 'notApplicable') return null;
  if (readiness == 'incomplete') {
    return UserProfile(
      uid: 'viewer-1',
      email: 'viewer@example.com',
      name: 'Viewer One',
      dateOfBirth: DateTime(1995),
      gender: Gender.woman,
      phoneNumber: '',
      profileComplete: false,
    );
  }
  final bookingReady = UserProfile(
    uid: 'viewer-1',
    email: 'viewer@example.com',
    name: 'Viewer One',
    dateOfBirth: DateTime(1995),
    gender: Gender.woman,
    phoneNumber: '+919999999999',
    profileComplete: true,
    interestedInGenders: const [Gender.man],
    activityPreferences: const ActivityPreferences(
      running: RunningPreferences(version: currentRunPreferencesVersion),
    ),
  );
  if (readiness == 'bookingReady') return bookingReady;
  return bookingReady.copyWith(
    profilePhotos: [
      for (var index = 0; index < minimumProfilePhotoCount; index += 1)
        ProfilePhoto.uploaded(
          position: index,
          url: 'https://example.com/viewer-$index.jpg',
          storagePath: 'matrix/viewer-$index.jpg',
          now: DateTime(2026),
        ),
    ],
    profilePrompts: [
      for (final promptId in defaultProfilePromptIds)
        ProfilePromptAnswer(
          promptId: promptId,
          prompt: promptId,
          answer: 'Matrix social-ready answer.',
        ),
    ],
  );
}
