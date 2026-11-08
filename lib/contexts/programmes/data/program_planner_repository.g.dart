// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_planner_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programPlannerRepository)
final programPlannerRepositoryProvider = ProgramPlannerRepositoryProvider._();

final class ProgramPlannerRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramPlannerRepository,
          ProgramPlannerRepository,
          ProgramPlannerRepository
        >
    with $Provider<ProgramPlannerRepository> {
  ProgramPlannerRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programPlannerRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programPlannerRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramPlannerRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramPlannerRepository create(Ref ref) {
    return programPlannerRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramPlannerRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramPlannerRepository>(value),
    );
  }
}

String _$programPlannerRepositoryHash() =>
    r'f44edc2037fa514c14faa6982d8755b932cbbe7b';

@ProviderFor(programPlannedMessages)
final programPlannedMessagesProvider = ProgramPlannedMessagesFamily._();

final class ProgramPlannedMessagesProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramPlannedMessages>,
          ProgramPlannedMessages,
          FutureOr<ProgramPlannedMessages>
        >
    with
        $FutureModifier<ProgramPlannedMessages>,
        $FutureProvider<ProgramPlannedMessages> {
  ProgramPlannedMessagesProvider._({
    required ProgramPlannedMessagesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programPlannedMessagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programPlannedMessagesHash();

  @override
  String toString() {
    return r'programPlannedMessagesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramPlannedMessages> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramPlannedMessages> create(Ref ref) {
    final argument = this.argument as String;
    return programPlannedMessages(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramPlannedMessagesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programPlannedMessagesHash() =>
    r'99080c8808bb20bd9dcacc6bababbb9fef65b3f5';

final class ProgramPlannedMessagesFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<ProgramPlannedMessages>, String> {
  ProgramPlannedMessagesFamily._()
    : super(
        retry: null,
        name: r'programPlannedMessagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramPlannedMessagesProvider call(String programId) =>
      ProgramPlannedMessagesProvider._(argument: programId, from: this);

  @override
  String toString() => r'programPlannedMessagesProvider';
}
