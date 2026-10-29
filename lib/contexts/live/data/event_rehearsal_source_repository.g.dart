// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_source_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventRehearsalSourceRepository)
final eventRehearsalSourceRepositoryProvider =
    EventRehearsalSourceRepositoryProvider._();

final class EventRehearsalSourceRepositoryProvider
    extends
        $FunctionalProvider<
          EventRehearsalSourceRepository,
          EventRehearsalSourceRepository,
          EventRehearsalSourceRepository
        >
    with $Provider<EventRehearsalSourceRepository> {
  EventRehearsalSourceRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventRehearsalSourceRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalSourceRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventRehearsalSourceRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventRehearsalSourceRepository create(Ref ref) {
    return eventRehearsalSourceRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventRehearsalSourceRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventRehearsalSourceRepository>(
        value,
      ),
    );
  }
}

String _$eventRehearsalSourceRepositoryHash() =>
    r'1d103cfe2b15015d01b8cc5c69a24cce82f37a0c';
