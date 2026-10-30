// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_inbox_catch_pages_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The live window and each paged source retain independent cursors.

@ProviderFor(HostInboxCatchPages)
final hostInboxCatchPagesProvider = HostInboxCatchPagesFamily._();

/// The live window and each paged source retain independent cursors.
final class HostInboxCatchPagesProvider
    extends $NotifierProvider<HostInboxCatchPages, HostInboxCatchPageState> {
  /// The live window and each paged source retain independent cursors.
  HostInboxCatchPagesProvider._({
    required HostInboxCatchPagesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostInboxCatchPagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostInboxCatchPagesHash();

  @override
  String toString() {
    return r'hostInboxCatchPagesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostInboxCatchPages create() => HostInboxCatchPages();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostInboxCatchPageState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostInboxCatchPageState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostInboxCatchPagesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostInboxCatchPagesHash() =>
    r'05b45ec3de77b93fad485e15e82f673155ccdea2';

/// The live window and each paged source retain independent cursors.

final class HostInboxCatchPagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostInboxCatchPages,
          HostInboxCatchPageState,
          HostInboxCatchPageState,
          HostInboxCatchPageState,
          String
        > {
  HostInboxCatchPagesFamily._()
    : super(
        retry: null,
        name: r'hostInboxCatchPagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The live window and each paged source retain independent cursors.

  HostInboxCatchPagesProvider call(String accountId) =>
      HostInboxCatchPagesProvider._(argument: accountId, from: this);

  @override
  String toString() => r'hostInboxCatchPagesProvider';
}

/// The live window and each paged source retain independent cursors.

abstract class _$HostInboxCatchPages
    extends $Notifier<HostInboxCatchPageState> {
  late final _$args = ref.$arg as String;
  String get accountId => _$args;

  HostInboxCatchPageState build(String accountId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<HostInboxCatchPageState, HostInboxCatchPageState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<HostInboxCatchPageState, HostInboxCatchPageState>,
              HostInboxCatchPageState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// Revalidates older endpoint membership against the live document before
/// including it. A cached page never keeps a revoked conversation visible.

@ProviderFor(hostInboxCatchViewModel)
final hostInboxCatchViewModelProvider = HostInboxCatchViewModelProvider._();

/// Revalidates older endpoint membership against the live document before
/// including it. A cached page never keeps a revoked conversation visible.

final class HostInboxCatchViewModelProvider
    extends
        $FunctionalProvider<
          AsyncValue<ChatsListViewModel>,
          AsyncValue<ChatsListViewModel>,
          AsyncValue<ChatsListViewModel>
        >
    with $Provider<AsyncValue<ChatsListViewModel>> {
  /// Revalidates older endpoint membership against the live document before
  /// including it. A cached page never keeps a revoked conversation visible.
  HostInboxCatchViewModelProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostInboxCatchViewModelProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostInboxCatchViewModelHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<ChatsListViewModel>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<ChatsListViewModel> create(Ref ref) {
    return hostInboxCatchViewModel(ref);
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

String _$hostInboxCatchViewModelHash() =>
    r'a48176c40b0e5f458a80aa5264de8223f6fc4c28';
