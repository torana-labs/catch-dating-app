// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'my_memberships_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Member self-serve pause, resume and cancel-at-period-end.

@ProviderFor(MyMembershipsController)
final myMembershipsControllerProvider = MyMembershipsControllerProvider._();

/// Member self-serve pause, resume and cancel-at-period-end.
final class MyMembershipsControllerProvider
    extends $NotifierProvider<MyMembershipsController, void> {
  /// Member self-serve pause, resume and cancel-at-period-end.
  MyMembershipsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'myMembershipsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$myMembershipsControllerHash();

  @$internal
  @override
  MyMembershipsController create() => MyMembershipsController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$myMembershipsControllerHash() =>
    r'0f7d65d03bf2c3ef15e89e2e5b74b1c37f3a1c70';

/// Member self-serve pause, resume and cancel-at-period-end.

abstract class _$MyMembershipsController extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
