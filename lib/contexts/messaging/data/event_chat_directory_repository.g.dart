// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_chat_directory_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventChatDirectoryRepository)
final eventChatDirectoryRepositoryProvider =
    EventChatDirectoryRepositoryProvider._();

final class EventChatDirectoryRepositoryProvider
    extends
        $FunctionalProvider<
          EventChatDirectoryRepository,
          EventChatDirectoryRepository,
          EventChatDirectoryRepository
        >
    with $Provider<EventChatDirectoryRepository> {
  EventChatDirectoryRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventChatDirectoryRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventChatDirectoryRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventChatDirectoryRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventChatDirectoryRepository create(Ref ref) {
    return eventChatDirectoryRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventChatDirectoryRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventChatDirectoryRepository>(value),
    );
  }
}

String _$eventChatDirectoryRepositoryHash() =>
    r'deb35091958eb5dfd56adc2571dd7e0cc44af67d';
