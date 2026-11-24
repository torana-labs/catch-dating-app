// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_pending_help.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Discovery references only. Each case editor owns its command and retry.
/// A server page may omit a case whose save succeeded without confirmation.
/// Session lifetime: pending case discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.

@ProviderFor(EventRehearsalPendingHelp)
final eventRehearsalPendingHelpProvider = EventRehearsalPendingHelpProvider._();

/// Discovery references only. Each case editor owns its command and retry.
/// A server page may omit a case whose save succeeded without confirmation.
/// Session lifetime: pending case discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.
final class EventRehearsalPendingHelpProvider
    extends
        $NotifierProvider<EventRehearsalPendingHelp, Set<RehearsalHelpScope>> {
  /// Discovery references only. Each case editor owns its command and retry.
  /// A server page may omit a case whose save succeeded without confirmation.
  /// Session lifetime: pending case discovery survives closed sheets until
  /// confirmation, and ends with the signed-in period.
  EventRehearsalPendingHelpProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventRehearsalPendingHelpProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalPendingHelpHash();

  @$internal
  @override
  EventRehearsalPendingHelp create() => EventRehearsalPendingHelp();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Set<RehearsalHelpScope> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Set<RehearsalHelpScope>>(value),
    );
  }
}

String _$eventRehearsalPendingHelpHash() =>
    r'13d9e0ed52b7fd45ef4dcec22a460d000a94734d';

/// Discovery references only. Each case editor owns its command and retry.
/// A server page may omit a case whose save succeeded without confirmation.
/// Session lifetime: pending case discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.

abstract class _$EventRehearsalPendingHelp
    extends $Notifier<Set<RehearsalHelpScope>> {
  Set<RehearsalHelpScope> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<Set<RehearsalHelpScope>, Set<RehearsalHelpScope>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<Set<RehearsalHelpScope>, Set<RehearsalHelpScope>>,
              Set<RehearsalHelpScope>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
