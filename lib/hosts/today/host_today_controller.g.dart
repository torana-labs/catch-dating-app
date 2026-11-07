// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_today_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Device-local attendance writes still waiting to reach the server, read
/// once each time Today opens.

@ProviderFor(hostTodayAttendanceOutbox)
final hostTodayAttendanceOutboxProvider = HostTodayAttendanceOutboxFamily._();

/// Device-local attendance writes still waiting to reach the server, read
/// once each time Today opens.

final class HostTodayAttendanceOutboxProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostAttendanceOutboxSummary>,
          HostAttendanceOutboxSummary,
          FutureOr<HostAttendanceOutboxSummary>
        >
    with
        $FutureModifier<HostAttendanceOutboxSummary>,
        $FutureProvider<HostAttendanceOutboxSummary> {
  /// Device-local attendance writes still waiting to reach the server, read
  /// once each time Today opens.
  HostTodayAttendanceOutboxProvider._({
    required HostTodayAttendanceOutboxFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostTodayAttendanceOutboxProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostTodayAttendanceOutboxHash();

  @override
  String toString() {
    return r'hostTodayAttendanceOutboxProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostAttendanceOutboxSummary> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostAttendanceOutboxSummary> create(Ref ref) {
    final argument = this.argument as String;
    return hostTodayAttendanceOutbox(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostTodayAttendanceOutboxProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostTodayAttendanceOutboxHash() =>
    r'0b0240c50f9e91f21b2a6a0813e0b348c5233a39';

/// Device-local attendance writes still waiting to reach the server, read
/// once each time Today opens.

final class HostTodayAttendanceOutboxFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostAttendanceOutboxSummary>,
          String
        > {
  HostTodayAttendanceOutboxFamily._()
    : super(
        retry: null,
        name: r'hostTodayAttendanceOutboxProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Device-local attendance writes still waiting to reach the server, read
  /// once each time Today opens.

  HostTodayAttendanceOutboxProvider call(String accountId) =>
      HostTodayAttendanceOutboxProvider._(argument: accountId, from: this);

  @override
  String toString() => r'hostTodayAttendanceOutboxProvider';
}

/// Today, composed from its read owners: the organizer's events, the
/// attention queue and the roster of the featured event are listeners, the
/// thirty-day report is the cached host-reports read, and the local
/// attendance outbox joins the attention queue. Nothing here invalidates a
/// read after a write.

@ProviderFor(hostTodayController)
final hostTodayControllerProvider = HostTodayControllerFamily._();

/// Today, composed from its read owners: the organizer's events, the
/// attention queue and the roster of the featured event are listeners, the
/// thirty-day report is the cached host-reports read, and the local
/// attendance outbox joins the attention queue. Nothing here invalidates a
/// read after a write.

final class HostTodayControllerProvider
    extends $FunctionalProvider<HostTodayState, HostTodayState, HostTodayState>
    with $Provider<HostTodayState> {
  /// Today, composed from its read owners: the organizer's events, the
  /// attention queue and the roster of the featured event are listeners, the
  /// thirty-day report is the cached host-reports read, and the local
  /// attendance outbox joins the attention queue. Nothing here invalidates a
  /// read after a write.
  HostTodayControllerProvider._({
    required HostTodayControllerFamily super.from,
    required HostTodayRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostTodayControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostTodayControllerHash();

  @override
  String toString() {
    return r'hostTodayControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostTodayState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HostTodayState create(Ref ref) {
    final argument = this.argument as HostTodayRequest;
    return hostTodayController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostTodayState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostTodayState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostTodayControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostTodayControllerHash() =>
    r'9ef7fc394db3e89e91eb08b3d363c5b267b2183f';

/// Today, composed from its read owners: the organizer's events, the
/// attention queue and the roster of the featured event are listeners, the
/// thirty-day report is the cached host-reports read, and the local
/// attendance outbox joins the attention queue. Nothing here invalidates a
/// read after a write.

final class HostTodayControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostTodayState, HostTodayRequest> {
  HostTodayControllerFamily._()
    : super(
        retry: null,
        name: r'hostTodayControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Today, composed from its read owners: the organizer's events, the
  /// attention queue and the roster of the featured event are listeners, the
  /// thirty-day report is the cached host-reports read, and the local
  /// attendance outbox joins the attention queue. Nothing here invalidates a
  /// read after a write.

  HostTodayControllerProvider call(HostTodayRequest request) =>
      HostTodayControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostTodayControllerProvider';
}
