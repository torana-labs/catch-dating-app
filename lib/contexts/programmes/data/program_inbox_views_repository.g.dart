// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_inbox_views_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programInboxViewsRepository)
final programInboxViewsRepositoryProvider =
    ProgramInboxViewsRepositoryProvider._();

final class ProgramInboxViewsRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramInboxViewsRepository,
          ProgramInboxViewsRepository,
          ProgramInboxViewsRepository
        >
    with $Provider<ProgramInboxViewsRepository> {
  ProgramInboxViewsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programInboxViewsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programInboxViewsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramInboxViewsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramInboxViewsRepository create(Ref ref) {
    return programInboxViewsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramInboxViewsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramInboxViewsRepository>(value),
    );
  }
}

String _$programInboxViewsRepositoryHash() =>
    r'63a5e5d8cbaf7abb63ad5660011e097a60860486';

/// Every thread row of the programme, live.

@ProviderFor(programWhatsappThreadRowsStream)
final programWhatsappThreadRowsStreamProvider =
    ProgramWhatsappThreadRowsStreamFamily._();

/// Every thread row of the programme, live.

final class ProgramWhatsappThreadRowsStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Map<Object?, Object?>>>,
          List<Map<Object?, Object?>>,
          Stream<List<Map<Object?, Object?>>>
        >
    with
        $FutureModifier<List<Map<Object?, Object?>>>,
        $StreamProvider<List<Map<Object?, Object?>>> {
  /// Every thread row of the programme, live.
  ProgramWhatsappThreadRowsStreamProvider._({
    required ProgramWhatsappThreadRowsStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programWhatsappThreadRowsStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programWhatsappThreadRowsStreamHash();

  @override
  String toString() {
    return r'programWhatsappThreadRowsStreamProvider'
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
    return programWhatsappThreadRowsStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramWhatsappThreadRowsStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programWhatsappThreadRowsStreamHash() =>
    r'75213b9f597c22a6dfecfe11d571826d543573f6';

/// Every thread row of the programme, live.

final class ProgramWhatsappThreadRowsStreamFamily extends $Family
    with
        $FunctionalFamilyOverride<Stream<List<Map<Object?, Object?>>>, String> {
  ProgramWhatsappThreadRowsStreamFamily._()
    : super(
        retry: null,
        name: r'programWhatsappThreadRowsStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Every thread row of the programme, live.

  ProgramWhatsappThreadRowsStreamProvider call(String programId) =>
      ProgramWhatsappThreadRowsStreamProvider._(
        argument: programId,
        from: this,
      );

  @override
  String toString() => r'programWhatsappThreadRowsStreamProvider';
}

/// One conversation, live.

@ProviderFor(programWhatsappThreadStream)
final programWhatsappThreadStreamProvider =
    ProgramWhatsappThreadStreamFamily._();

/// One conversation, live.

final class ProgramWhatsappThreadStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramWhatsappThread>,
          ProgramWhatsappThread,
          Stream<ProgramWhatsappThread>
        >
    with
        $FutureModifier<ProgramWhatsappThread>,
        $StreamProvider<ProgramWhatsappThread> {
  /// One conversation, live.
  ProgramWhatsappThreadStreamProvider._({
    required ProgramWhatsappThreadStreamFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programWhatsappThreadStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programWhatsappThreadStreamHash();

  @override
  String toString() {
    return r'programWhatsappThreadStreamProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramWhatsappThread> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramWhatsappThread> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programWhatsappThreadStream(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramWhatsappThreadStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programWhatsappThreadStreamHash() =>
    r'ca52cccc53baec46bdd8d2baf1defa43dcf304f3';

/// One conversation, live.

final class ProgramWhatsappThreadStreamFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<ProgramWhatsappThread>,
          (String, String)
        > {
  ProgramWhatsappThreadStreamFamily._()
    : super(
        retry: null,
        name: r'programWhatsappThreadStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One conversation, live.

  ProgramWhatsappThreadStreamProvider call(String programId, String threadId) =>
      ProgramWhatsappThreadStreamProvider._(
        argument: (programId, threadId),
        from: this,
      );

  @override
  String toString() => r'programWhatsappThreadStreamProvider';
}

/// The programme's saved replies, live.

@ProviderFor(programCannedRepliesStream)
final programCannedRepliesStreamProvider = ProgramCannedRepliesStreamFamily._();

/// The programme's saved replies, live.

final class ProgramCannedRepliesStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ProgramCannedReply>>,
          List<ProgramCannedReply>,
          Stream<List<ProgramCannedReply>>
        >
    with
        $FutureModifier<List<ProgramCannedReply>>,
        $StreamProvider<List<ProgramCannedReply>> {
  /// The programme's saved replies, live.
  ProgramCannedRepliesStreamProvider._({
    required ProgramCannedRepliesStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programCannedRepliesStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programCannedRepliesStreamHash();

  @override
  String toString() {
    return r'programCannedRepliesStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<ProgramCannedReply>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<ProgramCannedReply>> create(Ref ref) {
    final argument = this.argument as String;
    return programCannedRepliesStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramCannedRepliesStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programCannedRepliesStreamHash() =>
    r'793fed2780541fdea5ce409827a4d9377d70a308';

/// The programme's saved replies, live.

final class ProgramCannedRepliesStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<ProgramCannedReply>>, String> {
  ProgramCannedRepliesStreamFamily._()
    : super(
        retry: null,
        name: r'programCannedRepliesStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The programme's saved replies, live.

  ProgramCannedRepliesStreamProvider call(String programId) =>
      ProgramCannedRepliesStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programCannedRepliesStreamProvider';
}
