// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_pending_deliveries.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Discovery references only. Each delivery controller owns its command and retry.
/// A server page may omit a message whose handoff succeeded without confirmation.
/// Session lifetime: pending delivery discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.

@ProviderFor(EventRehearsalPendingDeliveries)
final eventRehearsalPendingDeliveriesProvider =
    EventRehearsalPendingDeliveriesProvider._();

/// Discovery references only. Each delivery controller owns its command and retry.
/// A server page may omit a message whose handoff succeeded without confirmation.
/// Session lifetime: pending delivery discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.
final class EventRehearsalPendingDeliveriesProvider
    extends
        $NotifierProvider<
          EventRehearsalPendingDeliveries,
          Set<RehearsalDeliveryScope>
        > {
  /// Discovery references only. Each delivery controller owns its command and retry.
  /// A server page may omit a message whose handoff succeeded without confirmation.
  /// Session lifetime: pending delivery discovery survives closed sheets until
  /// confirmation, and ends with the signed-in period.
  EventRehearsalPendingDeliveriesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventRehearsalPendingDeliveriesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalPendingDeliveriesHash();

  @$internal
  @override
  EventRehearsalPendingDeliveries create() => EventRehearsalPendingDeliveries();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Set<RehearsalDeliveryScope> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Set<RehearsalDeliveryScope>>(value),
    );
  }
}

String _$eventRehearsalPendingDeliveriesHash() =>
    r'9560512d52e673bb79cb7babba3494ddc79ef584';

/// Discovery references only. Each delivery controller owns its command and retry.
/// A server page may omit a message whose handoff succeeded without confirmation.
/// Session lifetime: pending delivery discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.

abstract class _$EventRehearsalPendingDeliveries
    extends $Notifier<Set<RehearsalDeliveryScope>> {
  Set<RehearsalDeliveryScope> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<Set<RehearsalDeliveryScope>, Set<RehearsalDeliveryScope>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                Set<RehearsalDeliveryScope>,
                Set<RehearsalDeliveryScope>
              >,
              Set<RehearsalDeliveryScope>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
