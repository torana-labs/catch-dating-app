// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'conversation_programme_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(HostInboxProgramAudiencePages)
final hostInboxProgramAudiencePagesProvider =
    HostInboxProgramAudiencePagesFamily._();

final class HostInboxProgramAudiencePagesProvider
    extends
        $AsyncNotifierProvider<
          HostInboxProgramAudiencePages,
          HostInboxProgramAudiencePageState
        > {
  HostInboxProgramAudiencePagesProvider._({
    required HostInboxProgramAudiencePagesFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostInboxProgramAudiencePagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostInboxProgramAudiencePagesHash();

  @override
  String toString() {
    return r'hostInboxProgramAudiencePagesProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  HostInboxProgramAudiencePages create() => HostInboxProgramAudiencePages();

  @override
  bool operator ==(Object other) {
    return other is HostInboxProgramAudiencePagesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostInboxProgramAudiencePagesHash() =>
    r'f387dde0bbfaccee06125a37ae9be9626b0ee2e2';

final class HostInboxProgramAudiencePagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostInboxProgramAudiencePages,
          AsyncValue<HostInboxProgramAudiencePageState>,
          HostInboxProgramAudiencePageState,
          FutureOr<HostInboxProgramAudiencePageState>,
          (String, String)
        > {
  HostInboxProgramAudiencePagesFamily._()
    : super(
        retry: null,
        name: r'hostInboxProgramAudiencePagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostInboxProgramAudiencePagesProvider call(
    String organizerId,
    String programId,
  ) => HostInboxProgramAudiencePagesProvider._(
    argument: (organizerId, programId),
    from: this,
  );

  @override
  String toString() => r'hostInboxProgramAudiencePagesProvider';
}

abstract class _$HostInboxProgramAudiencePages
    extends $AsyncNotifier<HostInboxProgramAudiencePageState> {
  late final _$args = ref.$arg as (String, String);
  String get organizerId => _$args.$1;
  String get programId => _$args.$2;

  FutureOr<HostInboxProgramAudiencePageState> build(
    String organizerId,
    String programId,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostInboxProgramAudiencePageState>,
              HostInboxProgramAudiencePageState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostInboxProgramAudiencePageState>,
                HostInboxProgramAudiencePageState
              >,
              AsyncValue<HostInboxProgramAudiencePageState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args.$1, _$args.$2));
  }
}
