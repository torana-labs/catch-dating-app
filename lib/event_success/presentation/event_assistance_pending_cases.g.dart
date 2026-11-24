// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_pending_cases.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Discovery references only. Each case editor owns its command and retry.
/// A server page may omit a case whose save succeeded without confirmation.
/// Session lifetime: pending case discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.

@ProviderFor(EventAssistancePendingCases)
final eventAssistancePendingCasesProvider =
    EventAssistancePendingCasesProvider._();

/// Discovery references only. Each case editor owns its command and retry.
/// A server page may omit a case whose save succeeded without confirmation.
/// Session lifetime: pending case discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.
final class EventAssistancePendingCasesProvider
    extends
        $NotifierProvider<
          EventAssistancePendingCases,
          Set<EventAssistanceCaseScope>
        > {
  /// Discovery references only. Each case editor owns its command and retry.
  /// A server page may omit a case whose save succeeded without confirmation.
  /// Session lifetime: pending case discovery survives closed sheets until
  /// confirmation, and ends with the signed-in period.
  EventAssistancePendingCasesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistancePendingCasesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAssistancePendingCasesHash();

  @$internal
  @override
  EventAssistancePendingCases create() => EventAssistancePendingCases();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Set<EventAssistanceCaseScope> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Set<EventAssistanceCaseScope>>(
        value,
      ),
    );
  }
}

String _$eventAssistancePendingCasesHash() =>
    r'537b23474e4b5e0c3bb9c27e5773c777b5da90ea';

/// Discovery references only. Each case editor owns its command and retry.
/// A server page may omit a case whose save succeeded without confirmation.
/// Session lifetime: pending case discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.

abstract class _$EventAssistancePendingCases
    extends $Notifier<Set<EventAssistanceCaseScope>> {
  Set<EventAssistanceCaseScope> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              Set<EventAssistanceCaseScope>,
              Set<EventAssistanceCaseScope>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                Set<EventAssistanceCaseScope>,
                Set<EventAssistanceCaseScope>
              >,
              Set<EventAssistanceCaseScope>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
