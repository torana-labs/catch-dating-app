// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'package:flutter/material.dart';
import '../../../hosts/live/live_captures.dart';
import '../../support/capture_device.dart';

// The live console is drawn for a tall phone and a landscape tablet.
const hostLivePhone = CaptureDevice(
  id: 'host-live-phone-390x1240',
  size: Size(390, 1240),
);
const hostLiveTablet = CaptureDevice(
  id: 'host-live-tablet-1194x834',
  size: hostLiveTabletLandscapeSize,
);
