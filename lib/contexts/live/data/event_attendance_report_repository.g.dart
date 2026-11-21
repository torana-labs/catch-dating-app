// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_attendance_report_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAttendanceReportRepository)
final eventAttendanceReportRepositoryProvider =
    EventAttendanceReportRepositoryProvider._();

final class EventAttendanceReportRepositoryProvider
    extends
        $FunctionalProvider<
          EventAttendanceReportRepository,
          EventAttendanceReportRepository,
          EventAttendanceReportRepository
        >
    with $Provider<EventAttendanceReportRepository> {
  EventAttendanceReportRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAttendanceReportRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAttendanceReportRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAttendanceReportRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAttendanceReportRepository create(Ref ref) {
    return eventAttendanceReportRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAttendanceReportRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAttendanceReportRepository>(
        value,
      ),
    );
  }
}

String _$eventAttendanceReportRepositoryHash() =>
    r'833843f065933cc6b26da52c4e506216e7405f73';

/// The event's attendance report, by listener; null until the server has
/// written one.

@ProviderFor(watchEventAttendanceReport)
final watchEventAttendanceReportProvider = WatchEventAttendanceReportFamily._();

/// The event's attendance report, by listener; null until the server has
/// written one.

final class WatchEventAttendanceReportProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventAttendanceReport?>,
          EventAttendanceReport?,
          Stream<EventAttendanceReport?>
        >
    with
        $FutureModifier<EventAttendanceReport?>,
        $StreamProvider<EventAttendanceReport?> {
  /// The event's attendance report, by listener; null until the server has
  /// written one.
  WatchEventAttendanceReportProvider._({
    required WatchEventAttendanceReportFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventAttendanceReportProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventAttendanceReportHash();

  @override
  String toString() {
    return r'watchEventAttendanceReportProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventAttendanceReport?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventAttendanceReport?> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventAttendanceReport(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventAttendanceReportProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventAttendanceReportHash() =>
    r'bd213b9a5bbbba4901c4db966bd93158bc1f9100';

/// The event's attendance report, by listener; null until the server has
/// written one.

final class WatchEventAttendanceReportFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventAttendanceReport?>, String> {
  WatchEventAttendanceReportFamily._()
    : super(
        retry: null,
        name: r'watchEventAttendanceReportProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The event's attendance report, by listener; null until the server has
  /// written one.

  WatchEventAttendanceReportProvider call(String eventId) =>
      WatchEventAttendanceReportProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventAttendanceReportProvider';
}
