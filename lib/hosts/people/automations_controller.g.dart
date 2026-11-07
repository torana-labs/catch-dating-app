// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'automations_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The organizer's automation rules and their latest runs, from the
/// existing automations read across every form.

@ProviderFor(hostPeopleAutomations)
final hostPeopleAutomationsProvider = HostPeopleAutomationsFamily._();

/// The organizer's automation rules and their latest runs, from the
/// existing automations read across every form.

final class HostPeopleAutomationsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostFormAutomationPage>,
          HostFormAutomationPage,
          FutureOr<HostFormAutomationPage>
        >
    with
        $FutureModifier<HostFormAutomationPage>,
        $FutureProvider<HostFormAutomationPage> {
  /// The organizer's automation rules and their latest runs, from the
  /// existing automations read across every form.
  HostPeopleAutomationsProvider._({
    required HostPeopleAutomationsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostPeopleAutomationsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleAutomationsHash();

  @override
  String toString() {
    return r'hostPeopleAutomationsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostFormAutomationPage> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostFormAutomationPage> create(Ref ref) {
    final argument = this.argument as String;
    return hostPeopleAutomations(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostPeopleAutomationsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPeopleAutomationsHash() =>
    r'4814825ee089e1fba444cec29651c9d6fd78f5a3';

/// The organizer's automation rules and their latest runs, from the
/// existing automations read across every form.

final class HostPeopleAutomationsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostFormAutomationPage>, String> {
  HostPeopleAutomationsFamily._()
    : super(
        retry: null,
        name: r'hostPeopleAutomationsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's automation rules and their latest runs, from the
  /// existing automations read across every form.

  HostPeopleAutomationsProvider call(String organizerId) =>
      HostPeopleAutomationsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostPeopleAutomationsProvider';
}

/// Automatic messages, composed from the WhatsApp setup read and the
/// automation rules; [month] is the first day of the month runs count in.

@ProviderFor(hostAutomationsController)
final hostAutomationsControllerProvider = HostAutomationsControllerFamily._();

/// Automatic messages, composed from the WhatsApp setup read and the
/// automation rules; [month] is the first day of the month runs count in.

final class HostAutomationsControllerProvider
    extends
        $FunctionalProvider<
          HostAutomationsState,
          HostAutomationsState,
          HostAutomationsState
        >
    with $Provider<HostAutomationsState> {
  /// Automatic messages, composed from the WhatsApp setup read and the
  /// automation rules; [month] is the first day of the month runs count in.
  HostAutomationsControllerProvider._({
    required HostAutomationsControllerFamily super.from,
    required (String, DateTime) super.argument,
  }) : super(
         retry: null,
         name: r'hostAutomationsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostAutomationsControllerHash();

  @override
  String toString() {
    return r'hostAutomationsControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<HostAutomationsState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostAutomationsState create(Ref ref) {
    final argument = this.argument as (String, DateTime);
    return hostAutomationsController(ref, argument.$1, argument.$2);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostAutomationsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostAutomationsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostAutomationsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostAutomationsControllerHash() =>
    r'345dd0780530dc744dcd687d0bf272e1f1a2ab29';

/// Automatic messages, composed from the WhatsApp setup read and the
/// automation rules; [month] is the first day of the month runs count in.

final class HostAutomationsControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostAutomationsState, (String, DateTime)> {
  HostAutomationsControllerFamily._()
    : super(
        retry: null,
        name: r'hostAutomationsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Automatic messages, composed from the WhatsApp setup read and the
  /// automation rules; [month] is the first day of the month runs count in.

  HostAutomationsControllerProvider call(String organizerId, DateTime month) =>
      HostAutomationsControllerProvider._(
        argument: (organizerId, month),
        from: this,
      );

  @override
  String toString() => r'hostAutomationsControllerProvider';
}

/// The existing automation command: turn one rule on or off, fenced by its
/// revision.

@ProviderFor(hostAutomationsCommands)
final hostAutomationsCommandsProvider = HostAutomationsCommandsProvider._();

/// The existing automation command: turn one rule on or off, fenced by its
/// revision.

final class HostAutomationsCommandsProvider
    extends
        $FunctionalProvider<
          HostAutomationsCommands,
          HostAutomationsCommands,
          HostAutomationsCommands
        >
    with $Provider<HostAutomationsCommands> {
  /// The existing automation command: turn one rule on or off, fenced by its
  /// revision.
  HostAutomationsCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostAutomationsCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostAutomationsCommandsHash();

  @$internal
  @override
  $ProviderElement<HostAutomationsCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostAutomationsCommands create(Ref ref) {
    return hostAutomationsCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostAutomationsCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostAutomationsCommands>(value),
    );
  }
}

String _$hostAutomationsCommandsHash() =>
    r'f8b42f480ae44271157391c302912e528d6a1d87';
