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
    r'2a8130558644647236566d8ace05330a3355530e';
