// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'saved_event_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(savedEventRepository)
final savedEventRepositoryProvider = SavedEventRepositoryProvider._();

final class SavedEventRepositoryProvider
    extends
        $FunctionalProvider<
          SavedEventRepository,
          SavedEventRepository,
          SavedEventRepository
        >
    with $Provider<SavedEventRepository> {
  SavedEventRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'savedEventRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$savedEventRepositoryHash();

  @$internal
  @override
  $ProviderElement<SavedEventRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  SavedEventRepository create(Ref ref) {
    return savedEventRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SavedEventRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SavedEventRepository>(value),
    );
  }
}

String _$savedEventRepositoryHash() =>
    r'199a3dfaac4723cd98ef2aa9fa3ec81a95e744ec';

@ProviderFor(watchSavedEventsForUser)
final watchSavedEventsForUserProvider = WatchSavedEventsForUserFamily._();

final class WatchSavedEventsForUserProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<SavedEvent>>,
          List<SavedEvent>,
          Stream<List<SavedEvent>>
        >
    with $FutureModifier<List<SavedEvent>>, $StreamProvider<List<SavedEvent>> {
  WatchSavedEventsForUserProvider._({
    required WatchSavedEventsForUserFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchSavedEventsForUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchSavedEventsForUserHash();

  @override
  String toString() {
    return r'watchSavedEventsForUserProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<SavedEvent>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<SavedEvent>> create(Ref ref) {
    final argument = this.argument as String;
    return watchSavedEventsForUser(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchSavedEventsForUserProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchSavedEventsForUserHash() =>
    r'2310dff8092d65ac71f87693bae6043e41e7064c';

final class WatchSavedEventsForUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<SavedEvent>>, String> {
  WatchSavedEventsForUserFamily._()
    : super(
        retry: null,
        name: r'watchSavedEventsForUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchSavedEventsForUserProvider call(String uid) =>
      WatchSavedEventsForUserProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchSavedEventsForUserProvider';
}

@ProviderFor(watchSavedEvent)
final watchSavedEventProvider = WatchSavedEventFamily._();

final class WatchSavedEventProvider
    extends
        $FunctionalProvider<
          AsyncValue<SavedEvent?>,
          SavedEvent?,
          Stream<SavedEvent?>
        >
    with $FutureModifier<SavedEvent?>, $StreamProvider<SavedEvent?> {
  WatchSavedEventProvider._({
    required WatchSavedEventFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'watchSavedEventProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchSavedEventHash();

  @override
  String toString() {
    return r'watchSavedEventProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<SavedEvent?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<SavedEvent?> create(Ref ref) {
    final argument = this.argument as (String, String);
    return watchSavedEvent(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchSavedEventProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchSavedEventHash() => r'9c357e8d52e158d2d22972027cc5366d4e643bd8';

final class WatchSavedEventFamily extends $Family
    with $FunctionalFamilyOverride<Stream<SavedEvent?>, (String, String)> {
  WatchSavedEventFamily._()
    : super(
        retry: null,
        name: r'watchSavedEventProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchSavedEventProvider call(String uid, String eventId) =>
      WatchSavedEventProvider._(argument: (uid, eventId), from: this);

  @override
  String toString() => r'watchSavedEventProvider';
}

@ProviderFor(watchSavedEventDetailsForUser)
final watchSavedEventDetailsForUserProvider =
    WatchSavedEventDetailsForUserFamily._();

final class WatchSavedEventDetailsForUserProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Event>>,
          List<Event>,
          Stream<List<Event>>
        >
    with $FutureModifier<List<Event>>, $StreamProvider<List<Event>> {
  WatchSavedEventDetailsForUserProvider._({
    required WatchSavedEventDetailsForUserFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchSavedEventDetailsForUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchSavedEventDetailsForUserHash();

  @override
  String toString() {
    return r'watchSavedEventDetailsForUserProvider'
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
    return watchSavedEventDetailsForUser(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchSavedEventDetailsForUserProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchSavedEventDetailsForUserHash() =>
    r'34d3f1cbaa9ffef4a283de6f03a2b0d0afb9e7ae';

final class WatchSavedEventDetailsForUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Event>>, String> {
  WatchSavedEventDetailsForUserFamily._()
    : super(
        retry: null,
        name: r'watchSavedEventDetailsForUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchSavedEventDetailsForUserProvider call(String uid) =>
      WatchSavedEventDetailsForUserProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchSavedEventDetailsForUserProvider';
}
