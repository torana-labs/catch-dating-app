// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_chat_signals.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventChatSignalSource)
final eventChatSignalSourceProvider = EventChatSignalSourceProvider._();

final class EventChatSignalSourceProvider
    extends
        $FunctionalProvider<
          EventChatSignalSource,
          EventChatSignalSource,
          EventChatSignalSource
        >
    with $Provider<EventChatSignalSource> {
  EventChatSignalSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventChatSignalSourceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventChatSignalSourceHash();

  @$internal
  @override
  $ProviderElement<EventChatSignalSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventChatSignalSource create(Ref ref) {
    return eventChatSignalSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventChatSignalSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventChatSignalSource>(value),
    );
  }
}

String _$eventChatSignalSourceHash() =>
    r'fe36997cb1629a79b0b4f45ce584f23da5bea583';
