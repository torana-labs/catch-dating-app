// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_create_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programCreateJournal)
final programCreateJournalProvider = ProgramCreateJournalProvider._();

final class ProgramCreateJournalProvider
    extends
        $FunctionalProvider<
          ProgramCreateJournal,
          ProgramCreateJournal,
          ProgramCreateJournal
        >
    with $Provider<ProgramCreateJournal> {
  ProgramCreateJournalProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programCreateJournalProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programCreateJournalHash();

  @$internal
  @override
  $ProviderElement<ProgramCreateJournal> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramCreateJournal create(Ref ref) {
    return programCreateJournal(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramCreateJournal value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramCreateJournal>(value),
    );
  }
}

String _$programCreateJournalHash() =>
    r'4cf5b88c6546b1a82775569451deedda2431f969';

/// The programme create transaction for one account and organizer: the
/// draft, its validation, the request id and the journal that recovers a
/// lost response. Screens read the immutable [ProgramCreateView] and call
/// [edit] and [submit]; the [ProgramCreateController] it holds publishes each
/// change through this notifier.

@ProviderFor(ProgramCreate)
final programCreateProvider = ProgramCreateFamily._();

/// The programme create transaction for one account and organizer: the
/// draft, its validation, the request id and the journal that recovers a
/// lost response. Screens read the immutable [ProgramCreateView] and call
/// [edit] and [submit]; the [ProgramCreateController] it holds publishes each
/// change through this notifier.
final class ProgramCreateProvider
    extends $AsyncNotifierProvider<ProgramCreate, ProgramCreateView> {
  /// The programme create transaction for one account and organizer: the
  /// draft, its validation, the request id and the journal that recovers a
  /// lost response. Screens read the immutable [ProgramCreateView] and call
  /// [edit] and [submit]; the [ProgramCreateController] it holds publishes each
  /// change through this notifier.
  ProgramCreateProvider._({
    required ProgramCreateFamily super.from,
    required ProgramEventsScope super.argument,
  }) : super(
         retry: null,
         name: r'programCreateProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programCreateHash();

  @override
  String toString() {
    return r'programCreateProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  ProgramCreate create() => ProgramCreate();

  @override
  bool operator ==(Object other) {
    return other is ProgramCreateProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programCreateHash() => r'45d804ccf7577cd27c9c9b167d2f37887ffd2eaa';

/// The programme create transaction for one account and organizer: the
/// draft, its validation, the request id and the journal that recovers a
/// lost response. Screens read the immutable [ProgramCreateView] and call
/// [edit] and [submit]; the [ProgramCreateController] it holds publishes each
/// change through this notifier.

final class ProgramCreateFamily extends $Family
    with
        $ClassFamilyOverride<
          ProgramCreate,
          AsyncValue<ProgramCreateView>,
          ProgramCreateView,
          FutureOr<ProgramCreateView>,
          ProgramEventsScope
        > {
  ProgramCreateFamily._()
    : super(
        retry: null,
        name: r'programCreateProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The programme create transaction for one account and organizer: the
  /// draft, its validation, the request id and the journal that recovers a
  /// lost response. Screens read the immutable [ProgramCreateView] and call
  /// [edit] and [submit]; the [ProgramCreateController] it holds publishes each
  /// change through this notifier.

  ProgramCreateProvider call(ProgramEventsScope scope) =>
      ProgramCreateProvider._(argument: scope, from: this);

  @override
  String toString() => r'programCreateProvider';
}

/// The programme create transaction for one account and organizer: the
/// draft, its validation, the request id and the journal that recovers a
/// lost response. Screens read the immutable [ProgramCreateView] and call
/// [edit] and [submit]; the [ProgramCreateController] it holds publishes each
/// change through this notifier.

abstract class _$ProgramCreate extends $AsyncNotifier<ProgramCreateView> {
  late final _$args = ref.$arg as ProgramEventsScope;
  ProgramEventsScope get scope => _$args;

  FutureOr<ProgramCreateView> build(ProgramEventsScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<ProgramCreateView>, ProgramCreateView>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<ProgramCreateView>, ProgramCreateView>,
              AsyncValue<ProgramCreateView>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
