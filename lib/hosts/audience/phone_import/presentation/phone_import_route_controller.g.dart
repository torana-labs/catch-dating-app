// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'phone_import_route_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Canonical entry composition and fresh access checks. Route widgets own
/// subscriptions, navigation and Flutter lifetime mechanics, not repositories.

@ProviderFor(PhoneImportRouteController)
final phoneImportRouteControllerProvider =
    PhoneImportRouteControllerProvider._();

/// Canonical entry composition and fresh access checks. Route widgets own
/// subscriptions, navigation and Flutter lifetime mechanics, not repositories.
final class PhoneImportRouteControllerProvider
    extends $NotifierProvider<PhoneImportRouteController, void> {
  /// Canonical entry composition and fresh access checks. Route widgets own
  /// subscriptions, navigation and Flutter lifetime mechanics, not repositories.
  PhoneImportRouteControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'phoneImportRouteControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$phoneImportRouteControllerHash();

  @$internal
  @override
  PhoneImportRouteController create() => PhoneImportRouteController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$phoneImportRouteControllerHash() =>
    r'd494dcff50b07dab96fbddd37ed607fb717d7c1e';

/// Canonical entry composition and fresh access checks. Route widgets own
/// subscriptions, navigation and Flutter lifetime mechanics, not repositories.

abstract class _$PhoneImportRouteController extends $Notifier<void> {
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
