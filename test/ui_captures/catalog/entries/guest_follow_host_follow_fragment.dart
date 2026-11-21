// Marketing capture `guest_follow_host_follow_fragment`: one widget cut out of `guest_follow_host`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'guest_follow_host.dart';

final guestFollowHostFollowFragmentCapture = ScreenCaptureEntry(
  id: 'guest_follow_host_follow_fragment',
  routeIds: const <String>['organizerDetailScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.guest.followHost.followButton',
  ],
  disableAnimations: guestFollowHostCapture.disableAnimations,
  providerOverrides: guestFollowHostCapture.providerOverrides,
  builder: guestFollowHostCapture.builder,
  fragment: CaptureFragment(
    find: () => nearestFragment(find.text('Follow organizer'), CatchButton),
    padding: fragmentCardPadding,
  ),
);
