// Marketing capture `host_create_studios`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/marketing_vertical_drafts.dart';

/// Creating a yoga class in Catch Host: the first step of the create flow.
final hostCreateStudiosCapture = ScreenCaptureEntry(
  id: 'host_create_studios',
  routeIds: const <String>['hostCreateEventScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>['hostMarketingIndia.host.createStudios'],
  disableAnimations: true,
  providerOverrides: marketingVerticalCreateOverrides(),
  builder: (context) => marketingVerticalCreateCapture('studios'),
);
