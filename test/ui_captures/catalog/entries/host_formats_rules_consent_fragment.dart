// Marketing capture `host_formats_rules_consent_fragment`: one widget cut out of `host_formats_rules_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_formats_rules_phone.dart';

final hostFormatsRulesConsentFragmentCapture = ScreenCaptureEntry(
  id: 'host_formats_rules_consent_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.formatsRules.consent',
  ],
  providerOverrides: hostFormatsRulesPhoneCapture.providerOverrides,
  builder: hostFormatsRulesPhoneCapture.builder,
  fragment: CaptureFragment(
    find: () => nearestFragment(find.text('Consent'), CatchNotice),
    padding: fragmentCardPadding,
  ),
);
