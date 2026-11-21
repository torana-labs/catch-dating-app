// Marketing capture `host_formats_crawl_move_next_stop_fragment`: one widget cut out of `host_formats_crawl_move_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_formats_crawl_move_phone.dart';

final hostFormatsCrawlMoveNextStopFragmentCapture = ScreenCaptureEntry(
  id: 'host_formats_crawl_move_next_stop_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.formatsCrawlMove.nextStop',
  ],
  providerOverrides: hostFormatsCrawlMovePhoneCapture.providerOverrides,
  builder: hostFormatsCrawlMovePhoneCapture.builder,
  fragment: CaptureFragment(
    find: () => nearestFragment(
      find.descendant(
        of: find.byKey(const ValueKey<String>('formats-crawl-move-sheet')),
        matching: find.text('Leave'),
      ),
      CatchSurface,
    ),
    padding: fragmentCardPadding,
  ),
);
