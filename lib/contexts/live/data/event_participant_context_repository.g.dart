// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_participant_context_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventParticipantContextRepository)
final eventParticipantContextRepositoryProvider =
    EventParticipantContextRepositoryProvider._();

final class EventParticipantContextRepositoryProvider
    extends
        $FunctionalProvider<
          EventParticipantContextRepository,
          EventParticipantContextRepository,
          EventParticipantContextRepository
        >
    with $Provider<EventParticipantContextRepository> {
  EventParticipantContextRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventParticipantContextRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventParticipantContextRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventParticipantContextRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventParticipantContextRepository create(Ref ref) {
    return eventParticipantContextRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventParticipantContextRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventParticipantContextRepository>(
        value,
      ),
    );
  }
}

String _$eventParticipantContextRepositoryHash() =>
    r'441bbff391f45802958d655444be339f5b3fd853';
