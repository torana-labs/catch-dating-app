// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_runtime_senders.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EventAssistanceRuntimeSenders)
final eventAssistanceRuntimeSendersProvider =
    EventAssistanceRuntimeSendersFamily._();

final class EventAssistanceRuntimeSendersProvider
    extends
        $NotifierProvider<
          EventAssistanceRuntimeSenders,
          AssistanceRuntimeSenderDirectory
        > {
  EventAssistanceRuntimeSendersProvider._({
    required EventAssistanceRuntimeSendersFamily super.from,
    required AssistanceRuntimeSession super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceRuntimeSendersProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceRuntimeSendersHash();

  @override
  String toString() {
    return r'eventAssistanceRuntimeSendersProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceRuntimeSenders create() => EventAssistanceRuntimeSenders();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AssistanceRuntimeSenderDirectory value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AssistanceRuntimeSenderDirectory>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceRuntimeSendersProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceRuntimeSendersHash() =>
    r'bb7de18d8bd70361cd5317d1f196a5ab24521375';

final class EventAssistanceRuntimeSendersFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceRuntimeSenders,
          AssistanceRuntimeSenderDirectory,
          AssistanceRuntimeSenderDirectory,
          AssistanceRuntimeSenderDirectory,
          AssistanceRuntimeSession
        > {
  EventAssistanceRuntimeSendersFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceRuntimeSendersProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAssistanceRuntimeSendersProvider call(AssistanceRuntimeSession review) =>
      EventAssistanceRuntimeSendersProvider._(argument: review, from: this);

  @override
  String toString() => r'eventAssistanceRuntimeSendersProvider';
}

abstract class _$EventAssistanceRuntimeSenders
    extends $Notifier<AssistanceRuntimeSenderDirectory> {
  late final _$args = ref.$arg as AssistanceRuntimeSession;
  AssistanceRuntimeSession get review => _$args;

  AssistanceRuntimeSenderDirectory build(AssistanceRuntimeSession review);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AssistanceRuntimeSenderDirectory,
              AssistanceRuntimeSenderDirectory
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AssistanceRuntimeSenderDirectory,
                AssistanceRuntimeSenderDirectory
              >,
              AssistanceRuntimeSenderDirectory,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
