// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_program_views_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerProgramViewsRepository)
final organizerProgramViewsRepositoryProvider =
    OrganizerProgramViewsRepositoryProvider._();

final class OrganizerProgramViewsRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerProgramViewsRepository,
          OrganizerProgramViewsRepository,
          OrganizerProgramViewsRepository
        >
    with $Provider<OrganizerProgramViewsRepository> {
  OrganizerProgramViewsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerProgramViewsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerProgramViewsRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerProgramViewsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerProgramViewsRepository create(Ref ref) {
    return organizerProgramViewsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerProgramViewsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerProgramViewsRepository>(
        value,
      ),
    );
  }
}

String _$organizerProgramViewsRepositoryHash() =>
    r'f883fb3df1cbfe252cb7b863d6c11ec7576069a9';

/// One programme's setup view, live.

@ProviderFor(organizerProgramViewStream)
final organizerProgramViewStreamProvider = OrganizerProgramViewStreamFamily._();

/// One programme's setup view, live.

final class OrganizerProgramViewStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<Object?, Object?>>,
          Map<Object?, Object?>,
          Stream<Map<Object?, Object?>>
        >
    with
        $FutureModifier<Map<Object?, Object?>>,
        $StreamProvider<Map<Object?, Object?>> {
  /// One programme's setup view, live.
  OrganizerProgramViewStreamProvider._({
    required OrganizerProgramViewStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'organizerProgramViewStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerProgramViewStreamHash();

  @override
  String toString() {
    return r'organizerProgramViewStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Map<Object?, Object?>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<Map<Object?, Object?>> create(Ref ref) {
    final argument = this.argument as String;
    return organizerProgramViewStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerProgramViewStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerProgramViewStreamHash() =>
    r'3d848ad4535489d81b9e6c70a2349fbe68bdd426';

/// One programme's setup view, live.

final class OrganizerProgramViewStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<Map<Object?, Object?>>, String> {
  OrganizerProgramViewStreamFamily._()
    : super(
        retry: null,
        name: r'organizerProgramViewStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One programme's setup view, live.

  OrganizerProgramViewStreamProvider call(String programId) =>
      OrganizerProgramViewStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'organizerProgramViewStreamProvider';
}

/// The organiser's programmes as lifecycle summaries, live.

@ProviderFor(organizerProgramSummariesStream)
final organizerProgramSummariesStreamProvider =
    OrganizerProgramSummariesStreamFamily._();

/// The organiser's programmes as lifecycle summaries, live.

final class OrganizerProgramSummariesStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerProgramSummary>>,
          List<OrganizerProgramSummary>,
          Stream<List<OrganizerProgramSummary>>
        >
    with
        $FutureModifier<List<OrganizerProgramSummary>>,
        $StreamProvider<List<OrganizerProgramSummary>> {
  /// The organiser's programmes as lifecycle summaries, live.
  OrganizerProgramSummariesStreamProvider._({
    required OrganizerProgramSummariesStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'organizerProgramSummariesStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerProgramSummariesStreamHash();

  @override
  String toString() {
    return r'organizerProgramSummariesStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<OrganizerProgramSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<OrganizerProgramSummary>> create(Ref ref) {
    final argument = this.argument as String;
    return organizerProgramSummariesStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerProgramSummariesStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerProgramSummariesStreamHash() =>
    r'3ca8e41736a0b32c5844983cec8110c089a25681';

/// The organiser's programmes as lifecycle summaries, live.

final class OrganizerProgramSummariesStreamFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<OrganizerProgramSummary>>,
          String
        > {
  OrganizerProgramSummariesStreamFamily._()
    : super(
        retry: null,
        name: r'organizerProgramSummariesStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organiser's programmes as lifecycle summaries, live.

  OrganizerProgramSummariesStreamProvider call(String organizerId) =>
      OrganizerProgramSummariesStreamProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'organizerProgramSummariesStreamProvider';
}

/// The organiser's programmes as list rows with their counts, live: the
/// planner home and the Events tab.

@ProviderFor(organizerProgramRowsStream)
final organizerProgramRowsStreamProvider = OrganizerProgramRowsStreamFamily._();

/// The organiser's programmes as list rows with their counts, live: the
/// planner home and the Events tab.

final class OrganizerProgramRowsStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerProgramListRow>>,
          List<OrganizerProgramListRow>,
          Stream<List<OrganizerProgramListRow>>
        >
    with
        $FutureModifier<List<OrganizerProgramListRow>>,
        $StreamProvider<List<OrganizerProgramListRow>> {
  /// The organiser's programmes as list rows with their counts, live: the
  /// planner home and the Events tab.
  OrganizerProgramRowsStreamProvider._({
    required OrganizerProgramRowsStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'organizerProgramRowsStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerProgramRowsStreamHash();

  @override
  String toString() {
    return r'organizerProgramRowsStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<OrganizerProgramListRow>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<OrganizerProgramListRow>> create(Ref ref) {
    final argument = this.argument as String;
    return organizerProgramRowsStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerProgramRowsStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerProgramRowsStreamHash() =>
    r'1d00275dd357328aa3bd7cfd2b067551f2173be9';

/// The organiser's programmes as list rows with their counts, live: the
/// planner home and the Events tab.

final class OrganizerProgramRowsStreamFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<OrganizerProgramListRow>>,
          String
        > {
  OrganizerProgramRowsStreamFamily._()
    : super(
        retry: null,
        name: r'organizerProgramRowsStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organiser's programmes as list rows with their counts, live: the
  /// planner home and the Events tab.

  OrganizerProgramRowsStreamProvider call(String organizerId) =>
      OrganizerProgramRowsStreamProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'organizerProgramRowsStreamProvider';
}
