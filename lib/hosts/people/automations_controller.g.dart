// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'automations_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The organizer's automation rules and their newest page of runs across
/// every form, from the automation listeners.

@ProviderFor(hostPeopleAutomations)
final hostPeopleAutomationsProvider = HostPeopleAutomationsFamily._();

/// The organizer's automation rules and their newest page of runs across
/// every form, from the automation listeners.

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
  /// The organizer's automation rules and their newest page of runs across
  /// every form, from the automation listeners.
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
    r'a1791eb1e57237e5e737829ac283c7b7ae5d6a78';

/// The organizer's automation rules and their newest page of runs across
/// every form, from the automation listeners.

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

  /// The organizer's automation rules and their newest page of runs across
  /// every form, from the automation listeners.

  HostPeopleAutomationsProvider call(String organizerId) =>
      HostPeopleAutomationsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostPeopleAutomationsProvider';
}

/// Rules this screen just switched, shown until the rule listener reaches
/// their revision, so a switch does not flick back while the view catches
/// up with the command.

@ProviderFor(HostSavedAutomationRules)
final hostSavedAutomationRulesProvider = HostSavedAutomationRulesFamily._();

/// Rules this screen just switched, shown until the rule listener reaches
/// their revision, so a switch does not flick back while the view catches
/// up with the command.
final class HostSavedAutomationRulesProvider
    extends
        $NotifierProvider<
          HostSavedAutomationRules,
          Map<String, HostFormAutomationRule>
        > {
  /// Rules this screen just switched, shown until the rule listener reaches
  /// their revision, so a switch does not flick back while the view catches
  /// up with the command.
  HostSavedAutomationRulesProvider._({
    required HostSavedAutomationRulesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostSavedAutomationRulesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostSavedAutomationRulesHash();

  @override
  String toString() {
    return r'hostSavedAutomationRulesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostSavedAutomationRules create() => HostSavedAutomationRules();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Map<String, HostFormAutomationRule> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Map<String, HostFormAutomationRule>>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostSavedAutomationRulesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSavedAutomationRulesHash() =>
    r'86276e39aa19ad16899f8998b2f7de286897d96c';

/// Rules this screen just switched, shown until the rule listener reaches
/// their revision, so a switch does not flick back while the view catches
/// up with the command.

final class HostSavedAutomationRulesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostSavedAutomationRules,
          Map<String, HostFormAutomationRule>,
          Map<String, HostFormAutomationRule>,
          Map<String, HostFormAutomationRule>,
          String
        > {
  HostSavedAutomationRulesFamily._()
    : super(
        retry: null,
        name: r'hostSavedAutomationRulesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Rules this screen just switched, shown until the rule listener reaches
  /// their revision, so a switch does not flick back while the view catches
  /// up with the command.

  HostSavedAutomationRulesProvider call(String organizerId) =>
      HostSavedAutomationRulesProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostSavedAutomationRulesProvider';
}

/// Rules this screen just switched, shown until the rule listener reaches
/// their revision, so a switch does not flick back while the view catches
/// up with the command.

abstract class _$HostSavedAutomationRules
    extends $Notifier<Map<String, HostFormAutomationRule>> {
  late final _$args = ref.$arg as String;
  String get organizerId => _$args;

  Map<String, HostFormAutomationRule> build(String organizerId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              Map<String, HostFormAutomationRule>,
              Map<String, HostFormAutomationRule>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                Map<String, HostFormAutomationRule>,
                Map<String, HostFormAutomationRule>
              >,
              Map<String, HostFormAutomationRule>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
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
    r'11cc20b3c71f00c1a12216bd0614feeb660830e3';

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
    r'db71baba677350ff453e54d59ddcc55e394654cd';
