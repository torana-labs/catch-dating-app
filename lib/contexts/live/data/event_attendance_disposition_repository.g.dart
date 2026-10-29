// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_attendance_disposition_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAttendanceDispositionRepository)
final eventAttendanceDispositionRepositoryProvider =
    EventAttendanceDispositionRepositoryProvider._();

final class EventAttendanceDispositionRepositoryProvider
    extends
        $FunctionalProvider<
          EventAttendanceDispositionRepository,
          EventAttendanceDispositionRepository,
          EventAttendanceDispositionRepository
        >
    with $Provider<EventAttendanceDispositionRepository> {
  EventAttendanceDispositionRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAttendanceDispositionRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAttendanceDispositionRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAttendanceDispositionRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAttendanceDispositionRepository create(Ref ref) {
    return eventAttendanceDispositionRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAttendanceDispositionRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<EventAttendanceDispositionRepository>(value),
    );
  }
}

String _$eventAttendanceDispositionRepositoryHash() =>
    r'53fa0c1262963e39aea1fdfa340dec4b8764c326';

@ProviderFor(eventAttendanceDispositionCommands)
final eventAttendanceDispositionCommandsProvider =
    EventAttendanceDispositionCommandsProvider._();

final class EventAttendanceDispositionCommandsProvider
    extends
        $FunctionalProvider<
          EventAttendanceDispositionCommands,
          EventAttendanceDispositionCommands,
          EventAttendanceDispositionCommands
        >
    with $Provider<EventAttendanceDispositionCommands> {
  EventAttendanceDispositionCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAttendanceDispositionCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAttendanceDispositionCommandsHash();

  @$internal
  @override
  $ProviderElement<EventAttendanceDispositionCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAttendanceDispositionCommands create(Ref ref) {
    return eventAttendanceDispositionCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAttendanceDispositionCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAttendanceDispositionCommands>(
        value,
      ),
    );
  }
}

String _$eventAttendanceDispositionCommandsHash() =>
    r'def59acced69c41551a3ee020fd621dbb66e6314';
