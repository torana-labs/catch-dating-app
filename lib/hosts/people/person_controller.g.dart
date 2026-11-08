// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'person_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One person, from the existing contact record read with its history:
/// facts, revenue, nights, tags and notes.

@ProviderFor(hostPersonController)
final hostPersonControllerProvider = HostPersonControllerFamily._();

/// One person, from the existing contact record read with its history:
/// facts, revenue, nights, tags and notes.

final class HostPersonControllerProvider
    extends
        $FunctionalProvider<HostPersonState, HostPersonState, HostPersonState>
    with $Provider<HostPersonState> {
  /// One person, from the existing contact record read with its history:
  /// facts, revenue, nights, tags and notes.
  HostPersonControllerProvider._({
    required HostPersonControllerFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostPersonControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPersonControllerHash();

  @override
  String toString() {
    return r'hostPersonControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<HostPersonState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HostPersonState create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostPersonController(ref, argument.$1, argument.$2);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostPersonState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostPersonState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostPersonControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPersonControllerHash() =>
    r'192b392fae2f674bbbeb10cdf8ba6cde7db0e554';

/// One person, from the existing contact record read with its history:
/// facts, revenue, nights, tags and notes.

final class HostPersonControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostPersonState, (String, String)> {
  HostPersonControllerFamily._()
    : super(
        retry: null,
        name: r'hostPersonControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One person, from the existing contact record read with its history:
  /// facts, revenue, nights, tags and notes.

  HostPersonControllerProvider call(String organizerId, String contactId) =>
      HostPersonControllerProvider._(
        argument: (organizerId, contactId),
        from: this,
      );

  @override
  String toString() => r'hostPersonControllerProvider';
}

/// The existing contact commands the People pages use: add a note, set the
/// tags, and open a conversation with the person.

@ProviderFor(hostPeopleCommands)
final hostPeopleCommandsProvider = HostPeopleCommandsProvider._();

/// The existing contact commands the People pages use: add a note, set the
/// tags, and open a conversation with the person.

final class HostPeopleCommandsProvider
    extends
        $FunctionalProvider<
          HostPeopleCommands,
          HostPeopleCommands,
          HostPeopleCommands
        >
    with $Provider<HostPeopleCommands> {
  /// The existing contact commands the People pages use: add a note, set the
  /// tags, and open a conversation with the person.
  HostPeopleCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostPeopleCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleCommandsHash();

  @$internal
  @override
  $ProviderElement<HostPeopleCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostPeopleCommands create(Ref ref) {
    return hostPeopleCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostPeopleCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostPeopleCommands>(value),
    );
  }
}

String _$hostPeopleCommandsHash() =>
    r'742e4223e1bffe0d5e90539365cc6f130f3d449b';
