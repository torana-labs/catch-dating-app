// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_route_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(chatRouteState)
final chatRouteStateProvider = ChatRouteStateFamily._();

final class ChatRouteStateProvider
    extends $FunctionalProvider<ChatRouteState, ChatRouteState, ChatRouteState>
    with $Provider<ChatRouteState> {
  ChatRouteStateProvider._({
    required ChatRouteStateFamily super.from,
    required ChatRouteStateArgs super.argument,
  }) : super(
         retry: null,
         name: r'chatRouteStateProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$chatRouteStateHash();

  @override
  String toString() {
    return r'chatRouteStateProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<ChatRouteState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ChatRouteState create(Ref ref) {
    final argument = this.argument as ChatRouteStateArgs;
    return chatRouteState(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ChatRouteState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ChatRouteState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ChatRouteStateProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$chatRouteStateHash() => r'86cadacaadf7bfdb1c143f10f3db4ae06e1e1755';

final class ChatRouteStateFamily extends $Family
    with $FunctionalFamilyOverride<ChatRouteState, ChatRouteStateArgs> {
  ChatRouteStateFamily._()
    : super(
        retry: null,
        name: r'chatRouteStateProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ChatRouteStateProvider call(ChatRouteStateArgs args) =>
      ChatRouteStateProvider._(argument: args, from: this);

  @override
  String toString() => r'chatRouteStateProvider';
}
