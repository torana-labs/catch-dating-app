// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_publish_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The publication screen, read through the event's setup view listener:
/// its name, whether it is published, whether it can be, and its setup
/// revision.

@ProviderFor(hostEventPublishController)
final hostEventPublishControllerProvider = HostEventPublishControllerFamily._();

/// The publication screen, read through the event's setup view listener:
/// its name, whether it is published, whether it can be, and its setup
/// revision.

final class HostEventPublishControllerProvider
    extends
        $FunctionalProvider<
          HostEventPublishState,
          HostEventPublishState,
          HostEventPublishState
        >
    with $Provider<HostEventPublishState> {
  /// The publication screen, read through the event's setup view listener:
  /// its name, whether it is published, whether it can be, and its setup
  /// revision.
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
    r'30b69d9d6a41525257f71f0814a1a3c4c2901a38';

/// The publication screen, read through the event's setup view listener:
/// its name, whether it is published, whether it can be, and its setup
/// revision.

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
  /// its name, whether it is published, whether it can be, and its setup
  /// revision.

  HostEventPublishControllerProvider call(HostEventRequest request) =>
      HostEventPublishControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventPublishControllerProvider';
}
