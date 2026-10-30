// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_host_contact_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(OrganizerHostContactController)
final organizerHostContactControllerProvider =
    OrganizerHostContactControllerProvider._();

final class OrganizerHostContactControllerProvider
    extends $NotifierProvider<OrganizerHostContactController, void> {
  OrganizerHostContactControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerHostContactControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerHostContactControllerHash();

  @$internal
  @override
  OrganizerHostContactController create() => OrganizerHostContactController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$organizerHostContactControllerHash() =>
    r'9ee9e2d57c9628fbff0d12e56c51adee68b47f8d';

abstract class _$OrganizerHostContactController extends $Notifier<void> {
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
