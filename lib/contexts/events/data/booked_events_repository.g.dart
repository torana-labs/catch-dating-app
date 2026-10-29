// GENERATED CODE - DO NOT MODIFY BY HAND

part of '../../bookings/data/booked_events_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(bookedEventsRepository)
final bookedEventsRepositoryProvider = BookedEventsRepositoryProvider._();

final class BookedEventsRepositoryProvider
    extends
        $FunctionalProvider<
          BookedEventsRepository,
          BookedEventsRepository,
          BookedEventsRepository
        >
    with $Provider<BookedEventsRepository> {
  BookedEventsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'bookedEventsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$bookedEventsRepositoryHash();

  @$internal
  @override
  $ProviderElement<BookedEventsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  BookedEventsRepository create(Ref ref) {
    return bookedEventsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(BookedEventsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<BookedEventsRepository>(value),
    );
  }
}

String _$bookedEventsRepositoryHash() =>
    r'99a176e47433280cc73a562f2d2f02cef5ad8312';

@ProviderFor(watchAttendedEvents)
final watchAttendedEventsProvider = WatchAttendedEventsFamily._();

final class WatchAttendedEventsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Event>>,
          List<Event>,
          Stream<List<Event>>
        >
    with $FutureModifier<List<Event>>, $StreamProvider<List<Event>> {
  WatchAttendedEventsProvider._({
    required WatchAttendedEventsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchAttendedEventsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchAttendedEventsHash();

  @override
  String toString() {
    return r'watchAttendedEventsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Event>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Event>> create(Ref ref) {
    final argument = this.argument as String;
    return watchAttendedEvents(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchAttendedEventsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchAttendedEventsHash() =>
    r'468b02b659a5036d9580f4f1ec4d033a663a525e';

final class WatchAttendedEventsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Event>>, String> {
  WatchAttendedEventsFamily._()
    : super(
        retry: null,
        name: r'watchAttendedEventsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchAttendedEventsProvider call(String uid) =>
      WatchAttendedEventsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchAttendedEventsProvider';
}

@ProviderFor(watchSignedUpEvents)
final watchSignedUpEventsProvider = WatchSignedUpEventsFamily._();

final class WatchSignedUpEventsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Event>>,
          List<Event>,
          Stream<List<Event>>
        >
    with $FutureModifier<List<Event>>, $StreamProvider<List<Event>> {
  WatchSignedUpEventsProvider._({
    required WatchSignedUpEventsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchSignedUpEventsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchSignedUpEventsHash();

  @override
  String toString() {
    return r'watchSignedUpEventsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Event>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Event>> create(Ref ref) {
    final argument = this.argument as String;
    return watchSignedUpEvents(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchSignedUpEventsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchSignedUpEventsHash() =>
    r'81168d961e37ba9176a74c080bac62afba0e2e5e';

final class WatchSignedUpEventsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Event>>, String> {
  WatchSignedUpEventsFamily._()
    : super(
        retry: null,
        name: r'watchSignedUpEventsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchSignedUpEventsProvider call(String uid) =>
      WatchSignedUpEventsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchSignedUpEventsProvider';
}
