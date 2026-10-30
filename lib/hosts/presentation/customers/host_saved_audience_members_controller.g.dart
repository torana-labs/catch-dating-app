// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_saved_audience_members_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(HostSavedAudienceMembersController)
final hostSavedAudienceMembersControllerProvider =
    HostSavedAudienceMembersControllerFamily._();

final class HostSavedAudienceMembersControllerProvider
    extends
        $AsyncNotifierProvider<
          HostSavedAudienceMembersController,
          HostSavedAudienceMembersState
        > {
  HostSavedAudienceMembersControllerProvider._({
    required HostSavedAudienceMembersControllerFamily super.from,
    required HostSavedAudience super.argument,
  }) : super(
         retry: null,
         name: r'hostSavedAudienceMembersControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$hostSavedAudienceMembersControllerHash();

  @override
  String toString() {
    return r'hostSavedAudienceMembersControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostSavedAudienceMembersController create() =>
      HostSavedAudienceMembersController();

  @override
  bool operator ==(Object other) {
    return other is HostSavedAudienceMembersControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSavedAudienceMembersControllerHash() =>
    r'4c1868c0009010fa9f168fee16fcba6a586c83b6';

final class HostSavedAudienceMembersControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostSavedAudienceMembersController,
          AsyncValue<HostSavedAudienceMembersState>,
          HostSavedAudienceMembersState,
          FutureOr<HostSavedAudienceMembersState>,
          HostSavedAudience
        > {
  HostSavedAudienceMembersControllerFamily._()
    : super(
        retry: null,
        name: r'hostSavedAudienceMembersControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostSavedAudienceMembersControllerProvider call(HostSavedAudience audience) =>
      HostSavedAudienceMembersControllerProvider._(
        argument: audience,
        from: this,
      );

  @override
  String toString() => r'hostSavedAudienceMembersControllerProvider';
}

abstract class _$HostSavedAudienceMembersController
    extends $AsyncNotifier<HostSavedAudienceMembersState> {
  late final _$args = ref.$arg as HostSavedAudience;
  HostSavedAudience get audience => _$args;

  FutureOr<HostSavedAudienceMembersState> build(HostSavedAudience audience);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostSavedAudienceMembersState>,
              HostSavedAudienceMembersState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostSavedAudienceMembersState>,
                HostSavedAudienceMembersState
              >,
              AsyncValue<HostSavedAudienceMembersState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
