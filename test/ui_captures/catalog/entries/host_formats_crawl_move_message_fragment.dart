// Marketing capture `host_formats_crawl_move_message_fragment`: one widget cut out of `host_formats_crawl_move_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_formats_crawl_move_phone.dart';

final hostFormatsCrawlMoveMessageFragmentCapture = ScreenCaptureEntry(
  id: 'host_formats_crawl_move_message_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.formatsCrawlMove.groupMessage',
  ],
  providerOverrides: hostFormatsCrawlMovePhoneCapture.providerOverrides,
  builder: hostFormatsCrawlMovePhoneCapture.builder,
  fragment: CaptureFragment(
    find: () =>
        nearestFragment(find.textContaining('Next stop:'), CatchChatBubble),
    padding: fragmentCardPadding,
  ),
);
