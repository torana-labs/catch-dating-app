// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'messages_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Messages, composed from the Catch conversations listener, the WhatsApp
/// threads read, the organizer's events (for Tonight) and Automatic
/// messages (for its row).

@ProviderFor(hostMessagesController)
final hostMessagesControllerProvider = HostMessagesControllerFamily._();

/// Messages, composed from the Catch conversations listener, the WhatsApp
/// threads read, the organizer's events (for Tonight) and Automatic
/// messages (for its row).

final class HostMessagesControllerProvider
    extends
        $FunctionalProvider<
          HostMessagesState,
          HostMessagesState,
          HostMessagesState
        >
    with $Provider<HostMessagesState> {
  /// Messages, composed from the Catch conversations listener, the WhatsApp
  /// threads read, the organizer's events (for Tonight) and Automatic
  /// messages (for its row).
  HostMessagesControllerProvider._({
    required HostMessagesControllerFamily super.from,
    required HostMessagesRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostMessagesControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostMessagesControllerHash();

  @override
  String toString() {
    return r'hostMessagesControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostMessagesState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostMessagesState create(Ref ref) {
    final argument = this.argument as HostMessagesRequest;
    return hostMessagesController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostMessagesState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostMessagesState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostMessagesControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostMessagesControllerHash() =>
    r'6add31fda66ee44e3795d474484dac3119067a34';

/// Messages, composed from the Catch conversations listener, the WhatsApp
/// threads read, the organizer's events (for Tonight) and Automatic
/// messages (for its row).

final class HostMessagesControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostMessagesState, HostMessagesRequest> {
  HostMessagesControllerFamily._()
    : super(
        retry: null,
        name: r'hostMessagesControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Messages, composed from the Catch conversations listener, the WhatsApp
  /// threads read, the organizer's events (for Tonight) and Automatic
  /// messages (for its row).

  HostMessagesControllerProvider call(HostMessagesRequest request) =>
      HostMessagesControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostMessagesControllerProvider';
}
