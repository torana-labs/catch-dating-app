import 'package:flutter/widgets.dart';

class CaptureDevice {
  const CaptureDevice({
    required this.id,
    required this.size,
    this.devicePixelRatio = 1.0,
    this.safeArea = EdgeInsets.zero,
    this.showsStatusBar = false,
  });

  final String id;
  final Size size;
  final double devicePixelRatio;
  final EdgeInsets safeArea;

  /// Whether captures draw a clean status bar (9:41, full signal, Wi-Fi and
  /// a full battery) in the top safe area, as a marketing screen shows.
  final bool showsStatusBar;

  static const reviewTall = CaptureDevice(
    id: 'review-tall',
    size: Size(440, 1820),
  );

  static const reviewPhone = CaptureDevice(
    id: 'review-phone',
    size: Size(440, 1220),
  );

  static const designPhone = CaptureDevice(
    id: 'design-phone',
    size: Size(390, 812),
  );

  static const claudePhone390 = CaptureDevice(
    id: 'claude-phone-390x812',
    size: Size(390, 812),
    safeArea: EdgeInsets.only(top: 44, bottom: 32),
  );

  static const iphone15 = CaptureDevice(id: 'iphone-15', size: Size(393, 852));

  static const iphone17Pro = CaptureDevice(
    id: 'iphone-17-pro',
    size: Size(402, 874),
    safeArea: EdgeInsets.only(top: 59, bottom: 34),
  );

  /// A generic phone for marketing captures: the iPhone 17 Pro screen in
  /// points and safe areas, with nothing unique to Apple hardware. The
  /// website draws its frame (CatchDeviceFrame kind phone) and the marketing
  /// exporter frames it the same way, so no notch or island is drawn.
  static const genericPhone = CaptureDevice(
    id: 'generic-phone',
    size: Size(402, 874),
    safeArea: EdgeInsets.only(top: 62, bottom: 34),
    showsStatusBar: true,
  );

  /// A generic 11-inch tablet held landscape for marketing captures. The
  /// website draws its frame (CatchDeviceFrame kind tablet) and the exporter
  /// passes the screen through unframed. The phone status bar's geometry does
  /// not fit the 24pt top inset, so none is drawn.
  static const genericTablet = CaptureDevice(
    id: 'generic-tablet',
    size: Size(1194, 834),
    safeArea: EdgeInsets.only(top: 24, bottom: 20),
  );

  /// A desktop browser's content area for marketing captures. The website
  /// draws the window (CatchDeviceFrame kind browser) and the exporter passes
  /// the screen through unframed.
  static const desktopBrowser = CaptureDevice(
    id: 'desktop-browser',
    size: Size(1440, 900),
  );

  static const auditTablet = CaptureDevice(
    id: 'audit-tablet-1024x1366',
    size: Size(1024, 1366),
    safeArea: EdgeInsets.only(top: 24, bottom: 20),
  );

  /// An 11-inch tablet held landscape: the door's operations layout.
  static const auditTabletLandscape = CaptureDevice(
    id: 'audit-tablet-landscape-1194x834',
    size: Size(1194, 834),
    safeArea: EdgeInsets.only(top: 24, bottom: 20),
  );

  static const auditMedium = CaptureDevice(
    id: 'audit-medium-700x1000',
    size: Size(700, 1000),
    safeArea: EdgeInsets.only(top: 24, bottom: 20),
  );

  static const auditDesktop = CaptureDevice(
    id: 'audit-desktop-1440x1000',
    size: Size(1440, 1000),
  );

  static const all = <CaptureDevice>[
    reviewTall,
    reviewPhone,
    designPhone,
    claudePhone390,
    iphone15,
    iphone17Pro,
    genericPhone,
    genericTablet,
    desktopBrowser,
    auditMedium,
    auditTablet,
    auditTabletLandscape,
    auditDesktop,
  ];

  static CaptureDevice fromId(String id) {
    for (final device in all) {
      if (device.id == id) return device;
    }
    throw ArgumentError.value(id, 'id', 'Unknown capture device id.');
  }
}
