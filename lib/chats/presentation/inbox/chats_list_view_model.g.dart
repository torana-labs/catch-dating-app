// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chats_list_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ChatSearchQuery)
final chatSearchQueryProvider = ChatSearchQueryProvider._();

final class ChatSearchQueryProvider
    extends $NotifierProvider<ChatSearchQuery, String> {
  ChatSearchQueryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'chatSearchQueryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$chatSearchQueryHash();

  @$internal
  @override
  ChatSearchQuery create() => ChatSearchQuery();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String>(value),
    );
  }
}

String _$chatSearchQueryHash() => r'f36931c4a7dd09361238bb69679f96e4b174f1bf';

abstract class _$ChatSearchQuery extends $Notifier<String> {
  String build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<String, String>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<String, String>,
              String,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(chatsListViewModel)
final chatsListViewModelProvider = ChatsListViewModelProvider._();

final class ChatsListViewModelProvider
    extends
        $FunctionalProvider<
          AsyncValue<ChatsListViewModel>,
          AsyncValue<ChatsListViewModel>,
          AsyncValue<ChatsListViewModel>
        >
    with $Provider<AsyncValue<ChatsListViewModel>> {
  ChatsListViewModelProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'chatsListViewModelProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$chatsListViewModelHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<ChatsListViewModel>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<ChatsListViewModel> create(Ref ref) {
    return chatsListViewModel(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<ChatsListViewModel> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<ChatsListViewModel>>(
        value,
      ),
    );
  }
}

String _$chatsListViewModelHash() =>
    r'6b2fa7585929862c89cf16b49d493a21dcde5223';
