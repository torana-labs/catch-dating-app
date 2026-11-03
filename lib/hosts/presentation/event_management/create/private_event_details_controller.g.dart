// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'private_event_details_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(privateEventDetailsDependencies)
final privateEventDetailsDependenciesProvider =
    PrivateEventDetailsDependenciesProvider._();

final class PrivateEventDetailsDependenciesProvider
    extends
        $FunctionalProvider<
          PrivateEventDetailsDependencies,
          PrivateEventDetailsDependencies,
          PrivateEventDetailsDependencies
        >
    with $Provider<PrivateEventDetailsDependencies> {
  PrivateEventDetailsDependenciesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'privateEventDetailsDependenciesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$privateEventDetailsDependenciesHash();

  @$internal
  @override
  $ProviderElement<PrivateEventDetailsDependencies> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PrivateEventDetailsDependencies create(Ref ref) {
    return privateEventDetailsDependencies(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PrivateEventDetailsDependencies value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PrivateEventDetailsDependencies>(
        value,
      ),
    );
  }
}

String _$privateEventDetailsDependenciesHash() =>
    r'be766cf34ee3de8e2869ab438edb1b6e8d181b37';

/// Exact-command journal makes a lost details response safe to retry after
/// app restart or manager access changes, without creating another mutation.

@ProviderFor(PrivateEventDetailsController)
final privateEventDetailsControllerProvider =
    PrivateEventDetailsControllerFamily._();

/// Exact-command journal makes a lost details response safe to retry after
/// app restart or manager access changes, without creating another mutation.
final class PrivateEventDetailsControllerProvider
    extends
        $NotifierProvider<
          PrivateEventDetailsController,
          PrivateEventDetailsState
        > {
  /// Exact-command journal makes a lost details response safe to retry after
  /// app restart or manager access changes, without creating another mutation.
  PrivateEventDetailsControllerProvider._({
    required PrivateEventDetailsControllerFamily super.from,
    required PrivateEventDetailsScope super.argument,
  }) : super(
         retry: null,
         name: r'privateEventDetailsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$privateEventDetailsControllerHash();

  @override
  String toString() {
    return r'privateEventDetailsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  PrivateEventDetailsController create() => PrivateEventDetailsController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PrivateEventDetailsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PrivateEventDetailsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is PrivateEventDetailsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$privateEventDetailsControllerHash() =>
    r'ca7d6ccfe2e37585af3d9f61b609e06224012699';

/// Exact-command journal makes a lost details response safe to retry after
/// app restart or manager access changes, without creating another mutation.

final class PrivateEventDetailsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          PrivateEventDetailsController,
          PrivateEventDetailsState,
          PrivateEventDetailsState,
          PrivateEventDetailsState,
          PrivateEventDetailsScope
        > {
  PrivateEventDetailsControllerFamily._()
    : super(
        retry: null,
        name: r'privateEventDetailsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Exact-command journal makes a lost details response safe to retry after
  /// app restart or manager access changes, without creating another mutation.

  PrivateEventDetailsControllerProvider call(PrivateEventDetailsScope scope) =>
      PrivateEventDetailsControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'privateEventDetailsControllerProvider';
}

/// Exact-command journal makes a lost details response safe to retry after
/// app restart or manager access changes, without creating another mutation.

abstract class _$PrivateEventDetailsController
    extends $Notifier<PrivateEventDetailsState> {
  late final _$args = ref.$arg as PrivateEventDetailsScope;
  PrivateEventDetailsScope get scope => _$args;

  PrivateEventDetailsState build(PrivateEventDetailsScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<PrivateEventDetailsState, PrivateEventDetailsState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<PrivateEventDetailsState, PrivateEventDetailsState>,
              PrivateEventDetailsState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
