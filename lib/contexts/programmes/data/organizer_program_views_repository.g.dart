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
    r'46ceed7fc04f2510234d2480a59d6172c12d2efd';

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
    r'f84a282b0e4362e23cf5850ab465cecab3408a59';

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
    r'44ebbed8959bc4d113672114e9487d0d2e73806a';

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
