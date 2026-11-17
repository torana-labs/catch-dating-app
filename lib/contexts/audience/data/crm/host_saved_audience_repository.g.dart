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

/// How many groups one directory query listens to; it grows by a page each
/// time the list asks for more.

@ProviderFor(HostGroupDirectoryWindow)
final hostGroupDirectoryWindowProvider = HostGroupDirectoryWindowFamily._();

/// How many groups one directory query listens to; it grows by a page each
/// time the list asks for more.
final class HostGroupDirectoryWindowProvider
    extends $NotifierProvider<HostGroupDirectoryWindow, int> {
  /// How many groups one directory query listens to; it grows by a page each
  /// time the list asks for more.
  HostGroupDirectoryWindowProvider._({
    required HostGroupDirectoryWindowFamily super.from,
    required (String, {bool byName, bool? isStatic}) super.argument,
  }) : super(
         retry: null,
         name: r'hostGroupDirectoryWindowProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostGroupDirectoryWindowHash();

  @override
  String toString() {
    return r'hostGroupDirectoryWindowProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  HostGroupDirectoryWindow create() => HostGroupDirectoryWindow();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostGroupDirectoryWindowProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostGroupDirectoryWindowHash() =>
    r'84e7264efbb4c5419fd15e590c7d59e29c46a601';

/// How many groups one directory query listens to; it grows by a page each
/// time the list asks for more.

final class HostGroupDirectoryWindowFamily extends $Family
    with
        $ClassFamilyOverride<
          HostGroupDirectoryWindow,
          int,
          int,
          int,
          (String, {bool byName, bool? isStatic})
        > {
  HostGroupDirectoryWindowFamily._()
    : super(
        retry: null,
        name: r'hostGroupDirectoryWindowProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// How many groups one directory query listens to; it grows by a page each
  /// time the list asks for more.

  HostGroupDirectoryWindowProvider call(
    String organizerId, {
    bool byName = true,
    bool? isStatic,
  }) => HostGroupDirectoryWindowProvider._(
    argument: (organizerId, byName: byName, isStatic: isStatic),
    from: this,
  );

  @override
  String toString() => r'hostGroupDirectoryWindowProvider';
}

/// How many groups one directory query listens to; it grows by a page each
/// time the list asks for more.

abstract class _$HostGroupDirectoryWindow extends $Notifier<int> {
  late final _$args = ref.$arg as (String, {bool byName, bool? isStatic});
  String get organizerId => _$args.$1;
  bool get byName => _$args.byName;
  bool? get isStatic => _$args.isStatic;

  int build(String organizerId, {bool byName = true, bool? isStatic});
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<int, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<int, int>,
              int,
              Object?,
              Object?
            >;
    return element.handleCreate(
      ref,
      () => build(_$args.$1, byName: _$args.byName, isStatic: _$args.isStatic),
    );
  }
}

/// The first rows of one group directory query, as a listener.

@ProviderFor(hostGroupDirectoryListener)
final hostGroupDirectoryListenerProvider = HostGroupDirectoryListenerFamily._();

/// The first rows of one group directory query, as a listener.

final class HostGroupDirectoryListenerProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostGroupSummaryWindow>,
          HostGroupSummaryWindow,
          Stream<HostGroupSummaryWindow>
        >
    with
        $FutureModifier<HostGroupSummaryWindow>,
        $StreamProvider<HostGroupSummaryWindow> {
  /// The first rows of one group directory query, as a listener.
  HostGroupDirectoryListenerProvider._({
    required HostGroupDirectoryListenerFamily super.from,
    required (String, {int limit, bool byName, bool? isStatic}) super.argument,
  }) : super(
         retry: null,
         name: r'hostGroupDirectoryListenerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostGroupDirectoryListenerHash();

  @override
  String toString() {
    return r'hostGroupDirectoryListenerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostGroupSummaryWindow> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostGroupSummaryWindow> create(Ref ref) {
    final argument =
        this.argument as (String, {int limit, bool byName, bool? isStatic});
    return hostGroupDirectoryListener(
      ref,
      argument.$1,
      limit: argument.limit,
      byName: argument.byName,
      isStatic: argument.isStatic,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostGroupDirectoryListenerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostGroupDirectoryListenerHash() =>
    r'd1f4c82d861d2971c29f2499dbd499394f9d8096';

/// The first rows of one group directory query, as a listener.

final class HostGroupDirectoryListenerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostGroupSummaryWindow>,
          (String, {int limit, bool byName, bool? isStatic})
        > {
  HostGroupDirectoryListenerFamily._()
    : super(
        retry: null,
        name: r'hostGroupDirectoryListenerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The first rows of one group directory query, as a listener.

  HostGroupDirectoryListenerProvider call(
    String organizerId, {
    required int limit,
    bool byName = true,
    bool? isStatic,
  }) => HostGroupDirectoryListenerProvider._(
    argument: (organizerId, limit: limit, byName: byName, isStatic: isStatic),
    from: this,
  );

  @override
  String toString() => r'hostGroupDirectoryListenerProvider';
}

/// The paginated group directory, live: the first page, then a larger
/// listener each time the list asks for more. A larger listener that fails
/// keeps the rows already shown and reports the failure under them.

@ProviderFor(HostGroupDirectoryController)
final hostGroupDirectoryControllerProvider =
    HostGroupDirectoryControllerFamily._();

/// The paginated group directory, live: the first page, then a larger
/// listener each time the list asks for more. A larger listener that fails
/// keeps the rows already shown and reports the failure under them.
final class HostGroupDirectoryControllerProvider
    extends
        $AsyncNotifierProvider<
          HostGroupDirectoryController,
          HostGroupDirectoryState
        > {
  /// The paginated group directory, live: the first page, then a larger
  /// listener each time the list asks for more. A larger listener that fails
  /// keeps the rows already shown and reports the failure under them.
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
    r'f141d07f8e188cd28601956a74be00f70506d64e';

/// The paginated group directory, live: the first page, then a larger
/// listener each time the list asks for more. A larger listener that fails
/// keeps the rows already shown and reports the failure under them.

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

  /// The paginated group directory, live: the first page, then a larger
  /// listener each time the list asks for more. A larger listener that fails
  /// keeps the rows already shown and reports the failure under them.

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

/// The paginated group directory, live: the first page, then a larger
/// listener each time the list asks for more. A larger listener that fails
/// keeps the rows already shown and reports the failure under them.

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
