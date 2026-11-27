// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_memberships_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Organizer program and plan administration for the Memberships spoke.

@ProviderFor(HostMembershipsController)
final hostMembershipsControllerProvider = HostMembershipsControllerFamily._();

/// Organizer program and plan administration for the Memberships spoke.
final class HostMembershipsControllerProvider
    extends
        $AsyncNotifierProvider<
          HostMembershipsController,
          HostMembershipsState
        > {
  /// Organizer program and plan administration for the Memberships spoke.
  HostMembershipsControllerProvider._({
    required HostMembershipsControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostMembershipsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostMembershipsControllerHash();

  @override
  String toString() {
    return r'hostMembershipsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostMembershipsController create() => HostMembershipsController();

  @override
  bool operator ==(Object other) {
    return other is HostMembershipsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostMembershipsControllerHash() =>
    r'db280dbc7acaec36108c9ab8981ceb750035ccc9';

/// Organizer program and plan administration for the Memberships spoke.

final class HostMembershipsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostMembershipsController,
          AsyncValue<HostMembershipsState>,
          HostMembershipsState,
          FutureOr<HostMembershipsState>,
          String
        > {
  HostMembershipsControllerFamily._()
    : super(
        retry: null,
        name: r'hostMembershipsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Organizer program and plan administration for the Memberships spoke.

  HostMembershipsControllerProvider call(String organizerId) =>
      HostMembershipsControllerProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostMembershipsControllerProvider';
}

/// Organizer program and plan administration for the Memberships spoke.

abstract class _$HostMembershipsController
    extends $AsyncNotifier<HostMembershipsState> {
  late final _$args = ref.$arg as String;
  String get organizerId => _$args;

  FutureOr<HostMembershipsState> build(String organizerId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<HostMembershipsState>, HostMembershipsState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostMembershipsState>,
                HostMembershipsState
              >,
              AsyncValue<HostMembershipsState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
