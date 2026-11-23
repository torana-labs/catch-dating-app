// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_assistant_views_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programAssistantViewsRepository)
final programAssistantViewsRepositoryProvider =
    ProgramAssistantViewsRepositoryProvider._();

final class ProgramAssistantViewsRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramAssistantViewsRepository,
          ProgramAssistantViewsRepository,
          ProgramAssistantViewsRepository
        >
    with $Provider<ProgramAssistantViewsRepository> {
  ProgramAssistantViewsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programAssistantViewsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programAssistantViewsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramAssistantViewsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramAssistantViewsRepository create(Ref ref) {
    return programAssistantViewsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramAssistantViewsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramAssistantViewsRepository>(
        value,
      ),
    );
  }
}

String _$programAssistantViewsRepositoryHash() =>
    r'a01af76447260339abc3322cbf5101fde7205c12';

/// The programme's sender view, live.

@ProviderFor(programSenderViewStream)
final programSenderViewStreamProvider = ProgramSenderViewStreamFamily._();

/// The programme's sender view, live.

final class ProgramSenderViewStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<Object?, Object?>?>,
          Map<Object?, Object?>?,
          Stream<Map<Object?, Object?>?>
        >
    with
        $FutureModifier<Map<Object?, Object?>?>,
        $StreamProvider<Map<Object?, Object?>?> {
  /// The programme's sender view, live.
  ProgramSenderViewStreamProvider._({
    required ProgramSenderViewStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programSenderViewStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programSenderViewStreamHash();

  @override
  String toString() {
    return r'programSenderViewStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Map<Object?, Object?>?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<Map<Object?, Object?>?> create(Ref ref) {
    final argument = this.argument as String;
    return programSenderViewStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramSenderViewStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programSenderViewStreamHash() =>
    r'b15c906987d0816929c4f629ce4fa3ed459da0d6';

/// The programme's sender view, live.

final class ProgramSenderViewStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<Map<Object?, Object?>?>, String> {
  ProgramSenderViewStreamFamily._()
    : super(
        retry: null,
        name: r'programSenderViewStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The programme's sender view, live.

  ProgramSenderViewStreamProvider call(String programId) =>
      ProgramSenderViewStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programSenderViewStreamProvider';
}

/// The assistant settings and the wedding's number, live.

@ProviderFor(programAssistantSettingsStream)
final programAssistantSettingsStreamProvider =
    ProgramAssistantSettingsStreamFamily._();

/// The assistant settings and the wedding's number, live.

final class ProgramAssistantSettingsStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramAssistantSettings>,
          ProgramAssistantSettings,
          Stream<ProgramAssistantSettings>
        >
    with
        $FutureModifier<ProgramAssistantSettings>,
        $StreamProvider<ProgramAssistantSettings> {
  /// The assistant settings and the wedding's number, live.
  ProgramAssistantSettingsStreamProvider._({
    required ProgramAssistantSettingsStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programAssistantSettingsStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programAssistantSettingsStreamHash();

  @override
  String toString() {
    return r'programAssistantSettingsStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramAssistantSettings> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramAssistantSettings> create(Ref ref) {
    final argument = this.argument as String;
    return programAssistantSettingsStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramAssistantSettingsStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programAssistantSettingsStreamHash() =>
    r'953fd0df4ae8a06542c7ff8cb10050a33d4ef889';

/// The assistant settings and the wedding's number, live.

final class ProgramAssistantSettingsStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ProgramAssistantSettings>, String> {
  ProgramAssistantSettingsStreamFamily._()
    : super(
        retry: null,
        name: r'programAssistantSettingsStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The assistant settings and the wedding's number, live.

  ProgramAssistantSettingsStreamProvider call(String programId) =>
      ProgramAssistantSettingsStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programAssistantSettingsStreamProvider';
}
