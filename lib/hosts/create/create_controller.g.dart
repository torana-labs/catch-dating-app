// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The create flow: the draft as the form, the create command once the
/// basics and the date are in, and the details, preferences and publication
/// commands after it. The event's setup view reaches it through the three
/// setup controllers, which follow their listeners; nothing here polls.
// provider-graph: high-fan-out:createControllerProvider accepted -- The nine dependencies form one create flow: the local draft and the organizer's saved drafts, the setup defaults and their view, the details, preferences and publication step controllers it drives, Firebase Functions for the series callable and the error logger.

@ProviderFor(CreateController)
final createControllerProvider = CreateControllerFamily._();

/// The create flow: the draft as the form, the create command once the
/// basics and the date are in, and the details, preferences and publication
/// commands after it. The event's setup view reaches it through the three
/// setup controllers, which follow their listeners; nothing here polls.
// provider-graph: high-fan-out:createControllerProvider accepted -- The nine dependencies form one create flow: the local draft and the organizer's saved drafts, the setup defaults and their view, the details, preferences and publication step controllers it drives, Firebase Functions for the series callable and the error logger.
final class CreateControllerProvider
    extends $NotifierProvider<CreateController, CreateFlowState> {
  /// The create flow: the draft as the form, the create command once the
  /// basics and the date are in, and the details, preferences and publication
  /// commands after it. The event's setup view reaches it through the three
  /// setup controllers, which follow their listeners; nothing here polls.
  // provider-graph: high-fan-out:createControllerProvider accepted -- The nine dependencies form one create flow: the local draft and the organizer's saved drafts, the setup defaults and their view, the details, preferences and publication step controllers it drives, Firebase Functions for the series callable and the error logger.
  CreateControllerProvider._({
    required CreateControllerFamily super.from,
    required CreateFlowArgs super.argument,
  }) : super(
         retry: null,
         name: r'createControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$createControllerHash();

  @override
  String toString() {
    return r'createControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  CreateController create() => CreateController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CreateFlowState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CreateFlowState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is CreateControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$createControllerHash() => r'5931d78e59554438424dbffe84dceff48c5709b5';

/// The create flow: the draft as the form, the create command once the
/// basics and the date are in, and the details, preferences and publication
/// commands after it. The event's setup view reaches it through the three
/// setup controllers, which follow their listeners; nothing here polls.
// provider-graph: high-fan-out:createControllerProvider accepted -- The nine dependencies form one create flow: the local draft and the organizer's saved drafts, the setup defaults and their view, the details, preferences and publication step controllers it drives, Firebase Functions for the series callable and the error logger.

final class CreateControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          CreateController,
          CreateFlowState,
          CreateFlowState,
          CreateFlowState,
          CreateFlowArgs
        > {
  CreateControllerFamily._()
    : super(
        retry: null,
        name: r'createControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The create flow: the draft as the form, the create command once the
  /// basics and the date are in, and the details, preferences and publication
  /// commands after it. The event's setup view reaches it through the three
  /// setup controllers, which follow their listeners; nothing here polls.
  // provider-graph: high-fan-out:createControllerProvider accepted -- The nine dependencies form one create flow: the local draft and the organizer's saved drafts, the setup defaults and their view, the details, preferences and publication step controllers it drives, Firebase Functions for the series callable and the error logger.

  CreateControllerProvider call(CreateFlowArgs args) =>
      CreateControllerProvider._(argument: args, from: this);

  @override
  String toString() => r'createControllerProvider';
}

/// The create flow: the draft as the form, the create command once the
/// basics and the date are in, and the details, preferences and publication
/// commands after it. The event's setup view reaches it through the three
/// setup controllers, which follow their listeners; nothing here polls.
// provider-graph: high-fan-out:createControllerProvider accepted -- The nine dependencies form one create flow: the local draft and the organizer's saved drafts, the setup defaults and their view, the details, preferences and publication step controllers it drives, Firebase Functions for the series callable and the error logger.

abstract class _$CreateController extends $Notifier<CreateFlowState> {
  late final _$args = ref.$arg as CreateFlowArgs;
  CreateFlowArgs get args => _$args;

  CreateFlowState build(CreateFlowArgs args);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<CreateFlowState, CreateFlowState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<CreateFlowState, CreateFlowState>,
              CreateFlowState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
