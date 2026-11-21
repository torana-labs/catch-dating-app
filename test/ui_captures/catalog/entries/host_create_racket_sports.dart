// Marketing capture `host_create_racket_sports`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/marketing_vertical_drafts.dart';

/// Creating a pickleball mixer in Catch Host: the first step of the create flow.
final hostCreateRacketSportsCapture = ScreenCaptureEntry(
  id: 'host_create_racket_sports',
  routeIds: const <String>['hostCreateEventScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.createRacketSports',
  ],
  disableAnimations: true,
  providerOverrides: marketingVerticalCreateOverrides(),
  builder: (context) => marketingVerticalCreateCapture('racket-sports'),
);
