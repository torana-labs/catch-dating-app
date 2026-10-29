// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'profile_location_initializer.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ProfileLocationInitializer)
final profileLocationInitializerProvider =
    ProfileLocationInitializerProvider._();

final class ProfileLocationInitializerProvider
    extends $AsyncNotifierProvider<ProfileLocationInitializer, void> {
  ProfileLocationInitializerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'profileLocationInitializerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$profileLocationInitializerHash();

  @$internal
  @override
  ProfileLocationInitializer create() => ProfileLocationInitializer();
}

String _$profileLocationInitializerHash() =>
    r'12558da3fcb91055730213f80f3d429799249cba';

abstract class _$ProfileLocationInitializer extends $AsyncNotifier<void> {
  FutureOr<void> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<void>, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<void>, void>,
              AsyncValue<void>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
