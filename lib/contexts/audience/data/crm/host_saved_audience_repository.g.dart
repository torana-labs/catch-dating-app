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

/// A selected group's definition, as a listener on `hostGroupDetails`.

@ProviderFor(hostSavedAudienceDetail)
final hostSavedAudienceDetailProvider = HostSavedAudienceDetailFamily._();

/// A selected group's definition, as a listener on `hostGroupDetails`.

final class HostSavedAudienceDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostSavedAudience>,
          HostSavedAudience,
          Stream<HostSavedAudience>
        >
    with
        $FutureModifier<HostSavedAudience>,
        $StreamProvider<HostSavedAudience> {
  /// A selected group's definition, as a listener on `hostGroupDetails`.
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
  $StreamProviderElement<HostSavedAudience> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostSavedAudience> create(Ref ref) {
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
    r'dfe0ff00c8c75a7bf102f2d70196f226812a0013';

/// A selected group's definition, as a listener on `hostGroupDetails`.

final class HostSavedAudienceDetailFamily extends $Family
    with
        $FunctionalFamilyOverride<Stream<HostSavedAudience>, (String, String)> {
  HostSavedAudienceDetailFamily._()
    : super(
        retry: null,
        name: r'hostSavedAudienceDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A selected group's definition, as a listener on `hostGroupDetails`.

  HostSavedAudienceDetailProvider call(String organizerId, String audienceId) =>
      HostSavedAudienceDetailProvider._(
        argument: (organizerId, audienceId),
        from: this,
      );

  @override
  String toString() => r'hostSavedAudienceDetailProvider';
}

/// Every active group's metadata from `hostGroupSummaries`, by name, as a
/// listener: the Audience workspace's exhaustive local name search and the
/// campaign editor's group picker. Full selected-member lists load only when
/// a group opens.

@ProviderFor(hostAllSavedAudienceSummaries)
final hostAllSavedAudienceSummariesProvider =
    HostAllSavedAudienceSummariesFamily._();

/// Every active group's metadata from `hostGroupSummaries`, by name, as a
/// listener: the Audience workspace's exhaustive local name search and the
/// campaign editor's group picker. Full selected-member lists load only when
/// a group opens.

final class HostAllSavedAudienceSummariesProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostSavedAudienceSummaryPage>,
          HostSavedAudienceSummaryPage,
          Stream<HostSavedAudienceSummaryPage>
        >
    with
        $FutureModifier<HostSavedAudienceSummaryPage>,
        $StreamProvider<HostSavedAudienceSummaryPage> {
  /// Every active group's metadata from `hostGroupSummaries`, by name, as a
  /// listener: the Audience workspace's exhaustive local name search and the
  /// campaign editor's group picker. Full selected-member lists load only when
  /// a group opens.
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
  $StreamProviderElement<HostSavedAudienceSummaryPage> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostSavedAudienceSummaryPage> create(Ref ref) {
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
    r'7ed24e1a87086d12d1131205d99ff1c397b4b1a1';

/// Every active group's metadata from `hostGroupSummaries`, by name, as a
/// listener: the Audience workspace's exhaustive local name search and the
/// campaign editor's group picker. Full selected-member lists load only when
/// a group opens.

final class HostAllSavedAudienceSummariesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostSavedAudienceSummaryPage>,
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

  /// Every active group's metadata from `hostGroupSummaries`, by name, as a
  /// listener: the Audience workspace's exhaustive local name search and the
  /// campaign editor's group picker. Full selected-member lists load only when
  /// a group opens.

  HostAllSavedAudienceSummariesProvider call(String organizerId) =>
      HostAllSavedAudienceSummariesProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'hostAllSavedAudienceSummariesProvider';
}
