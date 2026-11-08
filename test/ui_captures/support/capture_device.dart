import 'package:flutter/widgets.dart';

class CaptureDevice {
  const CaptureDevice({
    required this.id,
    required this.size,
    this.devicePixelRatio = 1.0,
    this.safeArea = EdgeInsets.zero,
  });

  final String id;
  final Size size;
  final double devicePixelRatio;
  final EdgeInsets safeArea;

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
