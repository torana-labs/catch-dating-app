// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'conversation_history_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(HostConversationHistory)
final hostConversationHistoryProvider = HostConversationHistoryFamily._();

final class HostConversationHistoryProvider
    extends
        $NotifierProvider<
          HostConversationHistory,
          HostConversationHistoryState
        > {
  HostConversationHistoryProvider._({
    required HostConversationHistoryFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostConversationHistoryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostConversationHistoryHash();

  @override
  String toString() {
    return r'hostConversationHistoryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostConversationHistory create() => HostConversationHistory();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostConversationHistoryState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostConversationHistoryState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostConversationHistoryProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostConversationHistoryHash() =>
    r'b5b3f69d64bb00786d9af2c4a0761b58fd94aa20';

final class HostConversationHistoryFamily extends $Family
    with
        $ClassFamilyOverride<
          HostConversationHistory,
          HostConversationHistoryState,
          HostConversationHistoryState,
          HostConversationHistoryState,
          String
        > {
  HostConversationHistoryFamily._()
    : super(
        retry: null,
        name: r'hostConversationHistoryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostConversationHistoryProvider call(String conversationId) =>
      HostConversationHistoryProvider._(argument: conversationId, from: this);

  @override
  String toString() => r'hostConversationHistoryProvider';
}

abstract class _$HostConversationHistory
    extends $Notifier<HostConversationHistoryState> {
  late final _$args = ref.$arg as String;
  String get conversationId => _$args;

  HostConversationHistoryState build(String conversationId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<HostConversationHistoryState, HostConversationHistoryState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                HostConversationHistoryState,
                HostConversationHistoryState
              >,
              HostConversationHistoryState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
