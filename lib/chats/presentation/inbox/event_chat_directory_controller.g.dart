// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_chat_directory_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The signed-in person's event chats, newest event first, from one listener
/// on their directory rows. Writes to bookings, roster rows, rooms and chat
/// memberships reach it through the triggers that rebuild those rows.

@ProviderFor(eventChatDirectory)
final eventChatDirectoryProvider = EventChatDirectoryProvider._();

/// The signed-in person's event chats, newest event first, from one listener
/// on their directory rows. Writes to bookings, roster rows, rooms and chat
/// memberships reach it through the triggers that rebuild those rows.

final class EventChatDirectoryProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventChatAccess>>,
          List<EventChatAccess>,
          Stream<List<EventChatAccess>>
        >
    with
        $FutureModifier<List<EventChatAccess>>,
        $StreamProvider<List<EventChatAccess>> {
  /// The signed-in person's event chats, newest event first, from one listener
  /// on their directory rows. Writes to bookings, roster rows, rooms and chat
  /// memberships reach it through the triggers that rebuild those rows.
  EventChatDirectoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: _noDirectoryReadRetry,
        name: r'eventChatDirectoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventChatDirectoryHash();

  @$internal
  @override
  $StreamProviderElement<List<EventChatAccess>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventChatAccess>> create(Ref ref) {
    return eventChatDirectory(ref);
  }
}

String _$eventChatDirectoryHash() =>
    r'bd80fcd5d7c348f365ecc21f75bee9c10535164b';
