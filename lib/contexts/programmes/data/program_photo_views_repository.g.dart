// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_photo_views_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programPhotoViewsRepository)
final programPhotoViewsRepositoryProvider =
    ProgramPhotoViewsRepositoryProvider._();

final class ProgramPhotoViewsRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramPhotoViewsRepository,
          ProgramPhotoViewsRepository,
          ProgramPhotoViewsRepository
        >
    with $Provider<ProgramPhotoViewsRepository> {
  ProgramPhotoViewsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programPhotoViewsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programPhotoViewsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramPhotoViewsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramPhotoViewsRepository create(Ref ref) {
    return programPhotoViewsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramPhotoViewsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramPhotoViewsRepository>(value),
    );
  }
}

String _$programPhotoViewsRepositoryHash() =>
    r'97606c0ce26e3cfe7b87bf16823d000bd494264b';

/// The programme's photo records, newest first, live.

@ProviderFor(programPhotoRowsStream)
final programPhotoRowsStreamProvider = ProgramPhotoRowsStreamFamily._();

/// The programme's photo records, newest first, live.

final class ProgramPhotoRowsStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Map<Object?, Object?>>>,
          List<Map<Object?, Object?>>,
          Stream<List<Map<Object?, Object?>>>
        >
    with
        $FutureModifier<List<Map<Object?, Object?>>>,
        $StreamProvider<List<Map<Object?, Object?>>> {
  /// The programme's photo records, newest first, live.
  ProgramPhotoRowsStreamProvider._({
    required ProgramPhotoRowsStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programPhotoRowsStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programPhotoRowsStreamHash();

  @override
  String toString() {
    return r'programPhotoRowsStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Map<Object?, Object?>>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Map<Object?, Object?>>> create(Ref ref) {
    final argument = this.argument as String;
    return programPhotoRowsStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramPhotoRowsStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programPhotoRowsStreamHash() =>
    r'b27d97eb0791c9069bd9e87b31b6798f44e824a2';

/// The programme's photo records, newest first, live.

final class ProgramPhotoRowsStreamFamily extends $Family
    with
        $FunctionalFamilyOverride<Stream<List<Map<Object?, Object?>>>, String> {
  ProgramPhotoRowsStreamFamily._()
    : super(
        retry: null,
        name: r'programPhotoRowsStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The programme's photo records, newest first, live.

  ProgramPhotoRowsStreamProvider call(String programId) =>
      ProgramPhotoRowsStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programPhotoRowsStreamProvider';
}
