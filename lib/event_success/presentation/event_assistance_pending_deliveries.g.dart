// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_pending_deliveries.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Discovery references only. Each delivery controller owns its command and retry.
/// A server page may omit a message whose handoff succeeded without confirmation.
/// Session lifetime: pending delivery discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.

@ProviderFor(EventAssistancePendingDeliveries)
final eventAssistancePendingDeliveriesProvider =
    EventAssistancePendingDeliveriesProvider._();

/// Discovery references only. Each delivery controller owns its command and retry.
/// A server page may omit a message whose handoff succeeded without confirmation.
/// Session lifetime: pending delivery discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.
final class EventAssistancePendingDeliveriesProvider
    extends
        $NotifierProvider<
          EventAssistancePendingDeliveries,
          Set<EventAssistanceDeliveryScope>
        > {
  /// Discovery references only. Each delivery controller owns its command and retry.
  /// A server page may omit a message whose handoff succeeded without confirmation.
  /// Session lifetime: pending delivery discovery survives closed sheets until
  /// confirmation, and ends with the signed-in period.
  EventAssistancePendingDeliveriesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistancePendingDeliveriesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAssistancePendingDeliveriesHash();

  @$internal
  @override
  EventAssistancePendingDeliveries create() =>
      EventAssistancePendingDeliveries();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Set<EventAssistanceDeliveryScope> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Set<EventAssistanceDeliveryScope>>(
        value,
      ),
    );
  }
}

String _$eventAssistancePendingDeliveriesHash() =>
    r'973da8d122e5321a15c0229e2beda113d77c9820';

/// Discovery references only. Each delivery controller owns its command and retry.
/// A server page may omit a message whose handoff succeeded without confirmation.
/// Session lifetime: pending delivery discovery survives closed sheets until
/// confirmation, and ends with the signed-in period.

abstract class _$EventAssistancePendingDeliveries
    extends $Notifier<Set<EventAssistanceDeliveryScope>> {
  Set<EventAssistanceDeliveryScope> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              Set<EventAssistanceDeliveryScope>,
              Set<EventAssistanceDeliveryScope>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                Set<EventAssistanceDeliveryScope>,
                Set<EventAssistanceDeliveryScope>
              >,
              Set<EventAssistanceDeliveryScope>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
