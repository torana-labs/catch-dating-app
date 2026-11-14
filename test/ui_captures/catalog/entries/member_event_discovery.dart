// Marketi// Marketi// Marketing// Marketing // Marketing // Marketing capt// Marketing capture `// Marketing capture `member_event_discovery`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'dart:async';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_platform/cities/city_repository.dart';
import 'package:catch_platform/device/device_location.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' show AsyncData;
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/member_discovery_fixtures.dart';

final memberEventDiscoveryCapture = ScreenCaptureEntry(
  id: 'member_event_discovery',
  routeIds: const <String>['exploreScreen'],
  device: CaptureDevice.reviewTall,
  marketingFixtureKeys: const <String>['salesDemo.member.eventDiscovery'],
  providerOverrides: [
    cityListProvider.overrideWith((ref) async => memberDiscoveryCities),
    selectedExploreCityProvider.overrideWithValue(memberDiscoveryCities.first),
    deviceLocationProvider.overrideWith(CaptureDeviceLocation.new),
    exploreDiscoveryReferenceNowProvider.overrideWithValue(
      DateTime(2026, 6, 11, 10),
    ),
    uidProvider.overrideWith((ref) => Stream.value(null)),
    watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
    exploreSourceOrganizersProvider.overrideWithValue(
      AsyncData(memberDiscoveryOrganizers),
    ),
    exploreOrganizersViewModelProvider.overrideWithValue(
      AsyncData(
        ExploreViewModel.partition(
          organizers: memberDiscoveryOrganizers,
          joinedOrganizerIds: const <String>{},
        ),
      ),
    ),
    exploreFeedViewModelProvider.overrideWithValue(
      AsyncData(
        ExploreFeedViewModel(
          items: [memberDiscoveryItems.first],
          featuredEventId: memberDiscoveryItems.first.event.id,
          dateSupplyCounts: {
            ExploreTimeFilter.tonight: 1,
            ExploreTimeFilter.tomorrow: 1,
            ExploreTimeFilter.dayTwo: 1,
            ExploreTimeFilter.dayThree: 0,
            ExploreTimeFilter.dayFour: 1,
            ExploreTimeFilter.dayFive: 0,
            ExploreTimeFilter.daySix: 1,
            ExploreTimeFilter.anytime: memberDiscoveryItems.length,
          },
        ),
      ),
    ),
  ],
  builder: (context) => const ExploreScreen(),
);
