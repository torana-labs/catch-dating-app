// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_chat_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventChatRepository)
final eventChatRepositoryProvider = EventChatRepositoryProvider._();

final class EventChatRepositoryProvider
    extends
        $FunctionalProvider<
          EventChatRepository,
          EventChatRepository,
          EventChatRepository
        >
    with $Provider<EventChatRepository> {
  EventChatRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventChatRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventChatRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventChatRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventChatRepository create(Ref ref) {
    return eventChatRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventChatRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventChatRepository>(value),
    );
  }
}

String _$eventChatRepositoryHash() =>
    r'b2f76ebbf232a46f408db561f07466d3d586fdda';

@ProviderFor(eventChatAccess)
final eventChatAccessProvider = EventChatAccessFamily._();

final class EventChatAccessProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventChatAccess>,
          EventChatAccess,
          FutureOr<EventChatAccess>
        >
    with $FutureModifier<EventChatAccess>, $FutureProvider<EventChatAccess> {
  EventChatAccessProvider._({
    required EventChatAccessFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventChatAccessProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventChatAccessHash();

  @override
  String toString() {
    return r'eventChatAccessProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<EventChatAccess> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventChatAccess> create(Ref ref) {
    final argument = this.argument as String;
    return eventChatAccess(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is EventChatAccessProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventChatAccessHash() => r'f7b87401c8ff7e31c44a1ab92d69727abdb9666f';

final class EventChatAccessFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<EventChatAccess>, String> {
  EventChatAccessFamily._()
    : super(
        retry: null,
        name: r'eventChatAccessProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventChatAccessProvider call(String eventId) =>
      EventChatAccessProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventChatAccessProvider';
}
