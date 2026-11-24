import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/city_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_kernel/city_data.dart';
import 'package:catch_platform/cache/cache_policies.dart';
import 'package:catch_platform/device/device_location.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'explore_device_location_fakes.dart';

const _cities = [
  CityData(name: 'mumbai', label: 'Mumbai', latitude: 19.07, longitude: 72.87),
];

/// Pumps Explore over a feed whose value [feed] decides on every build.
Future<void> _pump(
  WidgetTester tester,
  AsyncValue<ExploreFeedViewModel> Function(int build) feed,
) async {
  var builds = 0;
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        cityListProvider.overrideWith((ref) async => _cities),
        deviceLocationProvider.overrideWith(NoDeviceLocation.new),
        uidProvider.overrideWith((ref) => Stream.value(null)),
        exploreSourceOrganizersProvider.overrideWithValue(
          const AsyncData(<Organizer>[]),
        ),
        exploreOrganizersViewModelProvider.overrideWithValue(
          const AsyncData(
            ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
          ),
        ),
        // Each read is new, so the feed that composes it rebuilds.
        exploreDiscoveryReferenceNowProvider.overrideWith(
          (ref) => DateTime.now(),
        ),
        // Like the real feed, it composes a read that a refresh renews.
        exploreFeedViewModelProvider.overrideWith((ref) {
          ref.watch(exploreDiscoveryReferenceNowProvider);
          return feed(++builds);
        }),
      ],
      child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
    ),
  );
  await tester.pump();
}

void main() {
  testWidgets('pull-to-refresh ends when the recomposed feed settles', (
    tester,
  ) async {
    await _pump(
      tester,
      (_) => const AsyncData(ExploreFeedViewModel(items: [])),
    );
    var done = false;
    unawaited(
      tester
          .state<RefreshIndicatorState>(find.byType(RefreshIndicator))
          .show()
          .then((_) => done = true),
    );
    await tester.pump();
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 500));
    expect(done, isTrue);
  });

  testWidgets('pull-to-refresh over a feed that never settles ends at the '
      'discovery refresh deadline', (tester) async {
    await _pump(
      tester,
      (build) => build == 1
          ? const AsyncData(ExploreFeedViewModel(items: []))
          : const AsyncLoading(),
    );
    var done = false;
    unawaited(
      tester
          .state<RefreshIndicatorState>(find.byType(RefreshIndicator))
          .show()
          .then((_) => done = true),
    );
    await tester.pump();
    // One-second steps: the indicator starts the refresh a moment after
    // show(), so the deadline runs from then. It must not end early and must
    // end within a few seconds of the deadline.
    var elapsed = Duration.zero;
    while (!done && elapsed < CachePolicies.discovery.refresh * 2) {
      await pumpFeatureUiFor(tester, const Duration(seconds: 1));
      elapsed += const Duration(seconds: 1);
    }
    expect(done, isTrue);
    expect(
      elapsed,
      greaterThanOrEqualTo(
        CachePolicies.discovery.refresh - const Duration(seconds: 1),
      ),
    );
    expect(
      elapsed,
      lessThanOrEqualTo(
        CachePolicies.discovery.refresh + const Duration(seconds: 3),
      ),
    );
  });
}
