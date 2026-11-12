// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_publish_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The publication screen, read through the event's setup view listener:
/// its name, whether it is published and listed, whether it can be, its
/// guest settings, its saved booking choice and its setup revision.

@ProviderFor(hostEventPublishController)
final hostEventPublishControllerProvider = HostEventPublishControllerFamily._();

/// The publication screen, read through the event's setup view listener:
/// its name, whether it is published and listed, whether it can be, its
/// guest settings, its saved booking choice and its setup revision.

final class HostEventPublishControllerProvider
    extends
        $FunctionalProvider<
          HostEventPublishState,
          HostEventPublishState,
          HostEventPublishState
        >
    with $Provider<HostEventPublishState> {
  /// The publication screen, read through the event's setup view listener:
  /// its name, whether it is published and listed, whether it can be, its
  /// guest settings, its saved booking choice and its setup revision.
  HostEventPublishControllerProvider._({
    required HostEventPublishControllerFamily super.from,
    required HostEventRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostEventPublishControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventPublishControllerHash();

  @override
  String toString() {
    return r'hostEventPublishControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostEventPublishState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventPublishState create(Ref ref) {
    final argument = this.argument as HostEventRequest;
    return hostEventPublishController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventPublishState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventPublishState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventPublishControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventPublishControllerHash() =>
    r'ac811ed8ecb42227c0796089f2da2fcb88d12297';

/// The publication screen, read through the event's setup view listener:
/// its name, whether it is published and listed, whether it can be, its
/// guest settings, its saved booking choice and its setup revision.

final class HostEventPublishControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostEventPublishState, HostEventRequest> {
  HostEventPublishControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventPublishControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The publication screen, read through the event's setup view listener:
  /// its name, whether it is published and listed, whether it can be, its
  /// guest settings, its saved booking choice and its setup revision.

  HostEventPublishControllerProvider call(HostEventRequest request) =>
      HostEventPublishControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventPublishControllerProvider';
}

/// The commands the publication screen commits beyond publishing: who can
/// find the event, its guest settings, and who can book. None invalidates a
/// read; the setup view listener delivers each result.

@ProviderFor(HostEventPublishCommands)
final hostEventPublishCommandsProvider = HostEventPublishCommandsProvider._();

/// The commands the publication screen commits beyond publishing: who can
/// find the event, its guest settings, and who can book. None invalidates a
/// read; the setup view listener delivers each result.
final class HostEventPublishCommandsProvider
    extends $NotifierProvider<HostEventPublishCommands, void> {
  /// The commands the publication screen commits beyond publishing: who can
  /// find the event, its guest settings, and who can book. None invalidates a
  /// read; the setup view listener delivers each result.
  HostEventPublishCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventPublishCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventPublishCommandsHash();

  @$internal
  @override
  HostEventPublishCommands create() => HostEventPublishCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostEventPublishCommandsHash() =>
    r'4bff5c5eab27eb751edd6b39a76fd578ac881711';

/// The commands the publication screen commits beyond publishing: who can
/// find the event, its guest settings, and who can book. None invalidates a
/// read; the setup view listener delivers each result.

abstract class _$HostEventPublishCommands extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
