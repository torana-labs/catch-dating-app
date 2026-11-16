// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_saved_audience_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostSavedAudienceRepository)
final hostSavedAudienceRepositoryProvider =
    HostSavedAudienceRepositoryProvider._();

final class HostSavedAudienceRepositoryProvider
    extends
        $FunctionalProvider<
          HostSavedAudienceRepository,
          HostSavedAudienceRepository,
          HostSavedAudienceRepository
        >
    with $Provider<HostSavedAudienceRepository> {
  HostSavedAudienceRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostSavedAudienceRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostSavedAudienceRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostSavedAudienceRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostSavedAudienceRepository create(Ref ref) {
    return hostSavedAudienceRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostSavedAudienceRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostSavedAudienceRepository>(value),
    );
  }
}

String _$hostSavedAudienceRepositoryHash() =>
    r'd69b37678b73001ef421171624f0db53088607e4';

@ProviderFor(hostStaticAudienceMembers)
final hostStaticAudienceMembersProvider = HostStaticAudienceMembersFamily._();

final class HostStaticAudienceMembersProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostStaticAudienceMember>>,
          List<HostStaticAudienceMember>,
          FutureOr<List<HostStaticAudienceMember>>
        >
    with
        $FutureModifier<List<HostStaticAudienceMember>>,
        $FutureProvider<List<HostStaticAudienceMember>> {
  HostStaticAudienceMembersProvider._({
    required HostStaticAudienceMembersFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostStaticAudienceMembersProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostStaticAudienceMembersHash();

  @override
  String toString() {
    return r'hostStaticAudienceMembersProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<List<HostStaticAudienceMember>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<HostStaticAudienceMember>> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostStaticAudienceMembers(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostStaticAudienceMembersProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostStaticAudienceMembersHash() =>
    r'eeefe9a4b553116019b9dcb90e12128300f67972';

final class HostStaticAudienceMembersFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<HostStaticAudienceMember>>,
          (String, String)
        > {
  HostStaticAudienceMembersFamily._()
    : super(
        retry: null,
        name: r'hostStaticAudienceMembersProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostStaticAudienceMembersProvider call(
    String organizerId,
    String selectionKey,
  ) => HostStaticAudienceMembersProvider._(
    argument: (organizerId, selectionKey),
    from: this,
  );

  @override
  String toString() => r'hostStaticAudienceMembersProvider';
}

@ProviderFor(hostSavedAudienceFilterOptions)
final hostSavedAudienceFilterOptionsProvider =
    HostSavedAudienceFilterOptionsFamily._();

final class HostSavedAudienceFilterOptionsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostSavedAudienceFilterOptions>,
          HostSavedAudienceFilterOptions,
          FutureOr<HostSavedAudienceFilterOptions>
        >
    with
        $FutureModifier<HostSavedAudienceFilterOptions>,
        $FutureProvider<HostSavedAudienceFilterOptions> {
  HostSavedAudienceFilterOptionsProvider._({
    required HostSavedAudienceFilterOptionsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostSavedAudienceFilterOptionsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostSavedAudienceFilterOptionsHash();

  @override
  String toString() {
    return r'hostSavedAudienceFilterOptionsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostSavedAudienceFilterOptions> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostSavedAudienceFilterOptions> create(Ref ref) {
    final argument = this.argument as String;
    return hostSavedAudienceFilterOptions(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostSavedAudienceFilterOptionsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSavedAudienceFilterOptionsHash() =>
    r'5e59d7d1d1b84c5bb3a99bd2fe1d21905fc01992';

final class HostSavedAudienceFilterOptionsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostSavedAudienceFilterOptions>,
          String
        > {
  HostSavedAudienceFilterOptionsFamily._()
    : super(
        retry: null,
        name: r'hostSavedAudienceFilterOptionsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostSavedAudienceFilterOptionsProvider call(String organizerId) =>
      HostSavedAudienceFilterOptionsProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'hostSavedAudienceFilterOptionsProvider';
}

/// Fresh selected Group details stay alive only while the requested read runs.
/// Session changes still dispose the provider and fence the repository result.

@ProviderFor(hostSavedAudienceDetail)
final hostSavedAudienceDetailProvider = HostSavedAudienceDetailFamily._();

/// Fresh selected Group details stay alive only while the requested read runs.
/// Session changes still dispose the provider and fence the repository result.

final class HostSavedAudienceDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostSavedAudience>,
          HostSavedAudience,
          FutureOr<HostSavedAudience>
        >
    with
        $FutureModifier<HostSavedAudience>,
        $FutureProvider<HostSavedAudience> {
  /// Fresh selected Group details stay alive only while the requested read runs.
  /// Session changes still dispose the provider and fence the repository result.
  HostSavedAudienceDetailProvider._({
    required HostSavedAudienceDetailFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostSavedAudienceDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostSavedAudienceDetailHash();

  @override
  String toString() {
    return r'hostSavedAudienceDetailProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostSavedAudience> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostSavedAudience> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostSavedAudienceDetail(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostSavedAudienceDetailProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSavedAudienceDetailHash() =>
    r'82040e9e316e0fb547fb6aff52d1368a49e9d44b';

/// Fresh selected Group details stay alive only while the requested read runs.
/// Session changes still dispose the provider and fence the repository result.

final class HostSavedAudienceDetailFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostSavedAudience>,
          (String, String)
        > {
  HostSavedAudienceDetailFamily._()
    : super(
        retry: null,
        name: r'hostSavedAudienceDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Fresh selected Group details stay alive only while the requested read runs.
  /// Session changes still dispose the provider and fence the repository result.

  HostSavedAudienceDetailProvider call(String organizerId, String audienceId) =>
      HostSavedAudienceDetailProvider._(
        argument: (organizerId, audienceId),
        from: this,
      );

  @override
  String toString() => r'hostSavedAudienceDetailProvider';
}

/// Every active group's metadata from `hostGroupSummaries`: the Audience
/// workspace's exhaustive local name search and the campaign editor's group
/// picker. Full selected-member lists load only when a group opens.

@ProviderFor(hostAllSavedAudienceSummaries)
final hostAllSavedAudienceSummariesProvider =
    HostAllSavedAudienceSummariesFamily._();

/// Every active group's metadata from `hostGroupSummaries`: the Audience
/// workspace's exhaustive local name search and the campaign editor's group
/// picker. Full selected-member lists load only when a group opens.

final class HostAllSavedAudienceSummariesProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostSavedAudienceSummaryPage>,
          HostSavedAudienceSummaryPage,
          FutureOr<HostSavedAudienceSummaryPage>
        >
    with
        $FutureModifier<HostSavedAudienceSummaryPage>,
        $FutureProvider<HostSavedAudienceSummaryPage> {
  /// Every active group's metadata from `hostGroupSummaries`: the Audience
  /// workspace's exhaustive local name search and the campaign editor's group
  /// picker. Full selected-member lists load only when a group opens.
  HostAllSavedAudienceSummariesProvider._({
    required HostAllSavedAudienceSummariesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostAllSavedAudienceSummariesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostAllSavedAudienceSummariesHash();

  @override
  String toString() {
    return r'hostAllSavedAudienceSummariesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostSavedAudienceSummaryPage> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostSavedAudienceSummaryPage> create(Ref ref) {
    final argument = this.argument as String;
    return hostAllSavedAudienceSummaries(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostAllSavedAudienceSummariesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostAllSavedAudienceSummariesHash() =>
    r'e6264ad0f0413534bacff53319ec65bcebf4f0cb';

/// Every active group's metadata from `hostGroupSummaries`: the Audience
/// workspace's exhaustive local name search and the campaign editor's group
/// picker. Full selected-member lists load only when a group opens.

final class HostAllSavedAudienceSummariesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostSavedAudienceSummaryPage>,
          String
        > {
  HostAllSavedAudienceSummariesFamily._()
    : super(
        retry: null,
        name: r'hostAllSavedAudienceSummariesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Every active group's metadata from `hostGroupSummaries`: the Audience
  /// workspace's exhaustive local name search and the campaign editor's group
  /// picker. Full selected-member lists load only when a group opens.

  HostAllSavedAudienceSummariesProvider call(String organizerId) =>
      HostAllSavedAudienceSummariesProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'hostAllSavedAudienceSummariesProvider';
}

/// First-page publication and continuation belong to one authenticated scope.

@ProviderFor(HostGroupDirectoryController)
final hostGroupDirectoryControllerProvider =
    HostGroupDirectoryControllerFamily._();

/// First-page publication and continuation belong to one authenticated scope.
final class HostGroupDirectoryControllerProvider
    extends
        $AsyncNotifierProvider<
          HostGroupDirectoryController,
          HostGroupDirectoryState
        > {
  /// First-page publication and continuation belong to one authenticated scope.
  HostGroupDirectoryControllerProvider._({
    required HostGroupDirectoryControllerFamily super.from,
    required (String, {bool byName, bool? isStatic}) super.argument,
  }) : super(
         retry: null,
         name: r'hostGroupDirectoryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostGroupDirectoryControllerHash();

  @override
  String toString() {
    return r'hostGroupDirectoryControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  HostGroupDirectoryController create() => HostGroupDirectoryController();

  @override
  bool operator ==(Object other) {
    return other is HostGroupDirectoryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostGroupDirectoryControllerHash() =>
    r'd383c92aa88487b753c361a88edfcb38abc9653d';

/// First-page publication and continuation belong to one authenticated scope.

final class HostGroupDirectoryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostGroupDirectoryController,
          AsyncValue<HostGroupDirectoryState>,
          HostGroupDirectoryState,
          FutureOr<HostGroupDirectoryState>,
          (String, {bool byName, bool? isStatic})
        > {
  HostGroupDirectoryControllerFamily._()
    : super(
        retry: null,
        name: r'hostGroupDirectoryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// First-page publication and continuation belong to one authenticated scope.

  HostGroupDirectoryControllerProvider call(
    String organizerId, {
    bool byName = true,
    bool? isStatic,
  }) => HostGroupDirectoryControllerProvider._(
    argument: (organizerId, byName: byName, isStatic: isStatic),
    from: this,
  );

  @override
  String toString() => r'hostGroupDirectoryControllerProvider';
}

/// First-page publication and continuation belong to one authenticated scope.

abstract class _$HostGroupDirectoryController
    extends $AsyncNotifier<HostGroupDirectoryState> {
  late final _$args = ref.$arg as (String, {bool byName, bool? isStatic});
  String get organizerId => _$args.$1;
  bool get byName => _$args.byName;
  bool? get isStatic => _$args.isStatic;

  FutureOr<HostGroupDirectoryState> build(
    String organizerId, {
    bool byName = true,
    bool? isStatic,
  });
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostGroupDirectoryState>,
              HostGroupDirectoryState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostGroupDirectoryState>,
                HostGroupDirectoryState
              >,
              AsyncValue<HostGroupDirectoryState>,
              Object?,
              Object?
            >;
    return element.handleCreate(
      ref,
      () => build(_$args.$1, byName: _$args.byName, isStatic: _$args.isStatic),
    );
  }
}
