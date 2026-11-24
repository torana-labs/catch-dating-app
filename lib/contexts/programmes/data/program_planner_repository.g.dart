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
    r'cbecaca63511aeb9c08b86a331943e93b68c2217';

/// The programme's planned messages, live.

@ProviderFor(programPlannedMessages)
final programPlannedMessagesProvider = ProgramPlannedMessagesFamily._();

/// The programme's planned messages, live.

final class ProgramPlannedMessagesProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramPlannedMessages>,
          ProgramPlannedMessages,
          Stream<ProgramPlannedMessages>
        >
    with
        $FutureModifier<ProgramPlannedMessages>,
        $StreamProvider<ProgramPlannedMessages> {
  /// The programme's planned messages, live.
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
  $StreamProviderElement<ProgramPlannedMessages> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramPlannedMessages> create(Ref ref) {
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
    r'0ecf1a7d0a95e7a6eccf1101b87126df4504a00d';

/// The programme's planned messages, live.

final class ProgramPlannedMessagesFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ProgramPlannedMessages>, String> {
  ProgramPlannedMessagesFamily._()
    : super(
        retry: null,
        name: r'programPlannedMessagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The programme's planned messages, live.

  ProgramPlannedMessagesProvider call(String programId) =>
      ProgramPlannedMessagesProvider._(argument: programId, from: this);

  @override
  String toString() => r'programPlannedMessagesProvider';
}

/// The WhatsApp sender new planned messages send through, or null: the
/// organiser's first active sender, as `listOrganizerMoments` offered it.

@ProviderFor(programMessageSender)
final programMessageSenderProvider = ProgramMessageSenderFamily._();

/// The WhatsApp sender new planned messages send through, or null: the
/// organiser's first active sender, as `listOrganizerMoments` offered it.

final class ProgramMessageSenderProvider
    extends $FunctionalProvider<AsyncValue<String?>, String?, FutureOr<String?>>
    with $FutureModifier<String?>, $FutureProvider<String?> {
  /// The WhatsApp sender new planned messages send through, or null: the
  /// organiser's first active sender, as `listOrganizerMoments` offered it.
  ProgramMessageSenderProvider._({
    required ProgramMessageSenderFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programMessageSenderProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programMessageSenderHash();

  @override
  String toString() {
    return r'programMessageSenderProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<String?> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<String?> create(Ref ref) {
    final argument = this.argument as String;
    return programMessageSender(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramMessageSenderProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programMessageSenderHash() =>
    r'3ee66afb40760c550c409c826f1278cf89250ec8';

/// The WhatsApp sender new planned messages send through, or null: the
/// organiser's first active sender, as `listOrganizerMoments` offered it.

final class ProgramMessageSenderFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<String?>, String> {
  ProgramMessageSenderFamily._()
    : super(
        retry: null,
        name: r'programMessageSenderProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The WhatsApp sender new planned messages send through, or null: the
  /// organiser's first active sender, as `listOrganizerMoments` offered it.

  ProgramMessageSenderProvider call(String programId) =>
      ProgramMessageSenderProvider._(argument: programId, from: this);

  @override
  String toString() => r'programMessageSenderProvider';
}
