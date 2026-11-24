// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_form_automation_reads.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostFormAutomationReads)
final hostFormAutomationReadsProvider = HostFormAutomationReadsProvider._();

final class HostFormAutomationReadsProvider
    extends
        $FunctionalProvider<
          HostFormAutomationReads,
          HostFormAutomationReads,
          HostFormAutomationReads
        >
    with $Provider<HostFormAutomationReads> {
  HostFormAutomationReadsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostFormAutomationReadsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostFormAutomationReadsHash();

  @$internal
  @override
  $ProviderElement<HostFormAutomationReads> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormAutomationReads create(Ref ref) {
    return hostFormAutomationReads(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormAutomationReads value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormAutomationReads>(value),
    );
  }
}

String _$hostFormAutomationReadsHash() =>
    r'94bfd56e0466bc4386cbfcc6cdc6fd7cdfd6d1d6';

/// The organizer's automation rules, or one form's, kept live.

@ProviderFor(hostFormAutomationRules)
final hostFormAutomationRulesProvider = HostFormAutomationRulesFamily._();

/// The organizer's automation rules, or one form's, kept live.

final class HostFormAutomationRulesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostFormAutomationRule>>,
          List<HostFormAutomationRule>,
          Stream<List<HostFormAutomationRule>>
        >
    with
        $FutureModifier<List<HostFormAutomationRule>>,
        $StreamProvider<List<HostFormAutomationRule>> {
  /// The organizer's automation rules, or one form's, kept live.
  HostFormAutomationRulesProvider._({
    required HostFormAutomationRulesFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormAutomationRulesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormAutomationRulesHash();

  @override
  String toString() {
    return r'hostFormAutomationRulesProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<List<HostFormAutomationRule>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<HostFormAutomationRule>> create(Ref ref) {
    final argument = this.argument as (String, String?);
    return hostFormAutomationRules(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormAutomationRulesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormAutomationRulesHash() =>
    r'c4fe7ccd81a673fd80feb50741a7515f8278ba11';

/// The organizer's automation rules, or one form's, kept live.

final class HostFormAutomationRulesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<HostFormAutomationRule>>,
          (String, String?)
        > {
  HostFormAutomationRulesFamily._()
    : super(
        retry: null,
        name: r'hostFormAutomationRulesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's automation rules, or one form's, kept live.

  HostFormAutomationRulesProvider call(String organizerId, String? formId) =>
      HostFormAutomationRulesProvider._(
        argument: (organizerId, formId),
        from: this,
      );

  @override
  String toString() => r'hostFormAutomationRulesProvider';
}

/// The organizer's automation runs, or one form's, a page at a time, every
/// row shown live.

@ProviderFor(HostFormAutomationRunPages)
final hostFormAutomationRunPagesProvider = HostFormAutomationRunPagesFamily._();

/// The organizer's automation runs, or one form's, a page at a time, every
/// row shown live.
final class HostFormAutomationRunPagesProvider
    extends
        $StreamNotifierProvider<
          HostFormAutomationRunPages,
          LivePages<HostFormAutomationRun>
        > {
  /// The organizer's automation runs, or one form's, a page at a time, every
  /// row shown live.
  HostFormAutomationRunPagesProvider._({
    required HostFormAutomationRunPagesFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormAutomationRunPagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormAutomationRunPagesHash();

  @override
  String toString() {
    return r'hostFormAutomationRunPagesProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  HostFormAutomationRunPages create() => HostFormAutomationRunPages();

  @override
  bool operator ==(Object other) {
    return other is HostFormAutomationRunPagesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormAutomationRunPagesHash() =>
    r'bf113e1068cbd458d42ecf8cab7ad7dfc58857b7';

/// The organizer's automation runs, or one form's, a page at a time, every
/// row shown live.

final class HostFormAutomationRunPagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormAutomationRunPages,
          AsyncValue<LivePages<HostFormAutomationRun>>,
          LivePages<HostFormAutomationRun>,
          Stream<LivePages<HostFormAutomationRun>>,
          (String, String?)
        > {
  HostFormAutomationRunPagesFamily._()
    : super(
        retry: null,
        name: r'hostFormAutomationRunPagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's automation runs, or one form's, a page at a time, every
  /// row shown live.

  HostFormAutomationRunPagesProvider call(String organizerId, String? formId) =>
      HostFormAutomationRunPagesProvider._(
        argument: (organizerId, formId),
        from: this,
      );

  @override
  String toString() => r'hostFormAutomationRunPagesProvider';
}

/// The organizer's automation runs, or one form's, a page at a time, every
/// row shown live.

abstract class _$HostFormAutomationRunPages
    extends $StreamNotifier<LivePages<HostFormAutomationRun>> {
  late final _$args = ref.$arg as (String, String?);
  String get organizerId => _$args.$1;
  String? get formId => _$args.$2;

  Stream<LivePages<HostFormAutomationRun>> build(
    String organizerId,
    String? formId,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<LivePages<HostFormAutomationRun>>,
              LivePages<HostFormAutomationRun>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<LivePages<HostFormAutomationRun>>,
                LivePages<HostFormAutomationRun>
              >,
              AsyncValue<LivePages<HostFormAutomationRun>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args.$1, _$args.$2));
  }
}
