// Marketing capture `host_event_share_links_instagram_fragment`: one widget cut out of `host_event_share_links`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_event_share_links.dart';

final hostEventShareLinksInstagramFragmentCapture = ScreenCaptureEntry(
  id: 'host_event_share_links_instagram_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostOperations.event.shareLinks.instagramLink',
  ],
  disableAnimations: hostEventShareLinksCapture.disableAnimations,
  providerOverrides: hostEventShareLinksCapture.providerOverrides,
  builder: hostEventShareLinksCapture.builder,
  fragment: CaptureFragment(
    find: () =>
        find.byKey(const ValueKey<String>('host-event-invite-link-instagram')),
    padding: fragmentRowPadding,
  ),
);
