// Marketing capture `host_people_drifting_fragment`: one widget cut out of `host_people_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_people_phone.dart';

final hostPeopleDriftingFragmentCapture = ScreenCaptureEntry(
  id: 'host_people_drifting_fragment',
  routeIds: const <String>['hostAudienceScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>['hostAudience.people.list.drifting'],
  providerOverrides: hostPeoplePhoneCapture.providerOverrides,
  builder: hostPeoplePhoneCapture.builder,
  fragment: CaptureFragment(
    find: () => find.byKey(const ValueKey<String>('host-people-row-kr')),
    padding: fragmentRowPadding,
  ),
);
