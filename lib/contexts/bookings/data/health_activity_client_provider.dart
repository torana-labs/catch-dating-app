import 'package:catch_dating_app/contexts/bookings/data/health_activity_client.dart';
import 'package:catch_dating_app/contexts/bookings/data/health_activity_client_stub.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'health_activity_client_provider.g.dart';

/// Installable app packages override this when they own a native health SDK.
///
/// The Host package deliberately retains the unsupported default so HealthKit
/// and Health Connect are absent from its native dependency graph.
// keepalive: this capability binding is immutable for an installable app root.
@Riverpod(keepAlive: true)
HealthActivityClient healthActivityClient(Ref ref) =>
    const UnsupportedHealthActivityClient();
