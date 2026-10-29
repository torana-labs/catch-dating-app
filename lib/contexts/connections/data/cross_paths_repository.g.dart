// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cross_paths_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(crossPathsRepository)
final crossPathsRepositoryProvider = CrossPathsRepositoryProvider._();

final class CrossPathsRepositoryProvider
    extends
        $FunctionalProvider<
          CrossPathsRepository,
          CrossPathsRepository,
          CrossPathsRepository
        >
    with $Provider<CrossPathsRepository> {
  CrossPathsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'crossPathsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$crossPathsRepositoryHash();

  @$internal
  @override
  $ProviderElement<CrossPathsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  CrossPathsRepository create(Ref ref) {
    return crossPathsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CrossPathsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CrossPathsRepository>(value),
    );
  }
}

String _$crossPathsRepositoryHash() =>
    r'551e8ce1b7e0965301a673ba36ca48badadba4a8';

@ProviderFor(watchCrossPathsEventConsent)
final watchCrossPathsEventConsentProvider =
    WatchCrossPathsEventConsentFamily._();

final class WatchCrossPathsEventConsentProvider
    extends
        $FunctionalProvider<
          AsyncValue<CrossPathsEventConsent?>,
          CrossPathsEventConsent?,
          Stream<CrossPathsEventConsent?>
        >
    with
        $FutureModifier<CrossPathsEventConsent?>,
        $StreamProvider<CrossPathsEventConsent?> {
  WatchCrossPathsEventConsentProvider._({
    required WatchCrossPathsEventConsentFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'watchCrossPathsEventConsentProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchCrossPathsEventConsentHash();

  @override
  String toString() {
    return r'watchCrossPathsEventConsentProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<CrossPathsEventConsent?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<CrossPathsEventConsent?> create(Ref ref) {
    final argument = this.argument as (String, String);
    return watchCrossPathsEventConsent(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchCrossPathsEventConsentProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchCrossPathsEventConsentHash() =>
    r'2d053504b038f8294cc95dadb6d156a625ec0a7e';

final class WatchCrossPathsEventConsentFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<CrossPathsEventConsent?>,
          (String, String)
        > {
  WatchCrossPathsEventConsentFamily._()
    : super(
        retry: null,
        name: r'watchCrossPathsEventConsentProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchCrossPathsEventConsentProvider call(String eventId, String uid) =>
      WatchCrossPathsEventConsentProvider._(
        argument: (eventId, uid),
        from: this,
      );

  @override
  String toString() => r'watchCrossPathsEventConsentProvider';
}

@ProviderFor(watchCrossPathsInvitation)
final watchCrossPathsInvitationProvider = WatchCrossPathsInvitationFamily._();

final class WatchCrossPathsInvitationProvider
    extends
        $FunctionalProvider<
          AsyncValue<CrossPathsInvitation?>,
          CrossPathsInvitation?,
          Stream<CrossPathsInvitation?>
        >
    with
        $FutureModifier<CrossPathsInvitation?>,
        $StreamProvider<CrossPathsInvitation?> {
  WatchCrossPathsInvitationProvider._({
    required WatchCrossPathsInvitationFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchCrossPathsInvitationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchCrossPathsInvitationHash();

  @override
  String toString() {
    return r'watchCrossPathsInvitationProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<CrossPathsInvitation?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<CrossPathsInvitation?> create(Ref ref) {
    final argument = this.argument as String;
    return watchCrossPathsInvitation(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchCrossPathsInvitationProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchCrossPathsInvitationHash() =>
    r'e10f3c6438d49d859c6f8a56f80e4bc2c40c83fb';

final class WatchCrossPathsInvitationFamily extends $Family
    with $FunctionalFamilyOverride<Stream<CrossPathsInvitation?>, String> {
  WatchCrossPathsInvitationFamily._()
    : super(
        retry: null,
        name: r'watchCrossPathsInvitationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchCrossPathsInvitationProvider call(String invitationId) =>
      WatchCrossPathsInvitationProvider._(argument: invitationId, from: this);

  @override
  String toString() => r'watchCrossPathsInvitationProvider';
}

@ProviderFor(watchCrossPathsPairHold)
final watchCrossPathsPairHoldProvider = WatchCrossPathsPairHoldFamily._();

final class WatchCrossPathsPairHoldProvider
    extends
        $FunctionalProvider<
          AsyncValue<CrossPathsPairHold?>,
          CrossPathsPairHold?,
          Stream<CrossPathsPairHold?>
        >
    with
        $FutureModifier<CrossPathsPairHold?>,
        $StreamProvider<CrossPathsPairHold?> {
  WatchCrossPathsPairHoldProvider._({
    required WatchCrossPathsPairHoldFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchCrossPathsPairHoldProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchCrossPathsPairHoldHash();

  @override
  String toString() {
    return r'watchCrossPathsPairHoldProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<CrossPathsPairHold?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<CrossPathsPairHold?> create(Ref ref) {
    final argument = this.argument as String;
    return watchCrossPathsPairHold(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchCrossPathsPairHoldProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchCrossPathsPairHoldHash() =>
    r'646e03545891c5488e75b477929fb73448030744';

final class WatchCrossPathsPairHoldFamily extends $Family
    with $FunctionalFamilyOverride<Stream<CrossPathsPairHold?>, String> {
  WatchCrossPathsPairHoldFamily._()
    : super(
        retry: null,
        name: r'watchCrossPathsPairHoldProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchCrossPathsPairHoldProvider call(String holdId) =>
      WatchCrossPathsPairHoldProvider._(argument: holdId, from: this);

  @override
  String toString() => r'watchCrossPathsPairHoldProvider';
}

@ProviderFor(watchIncomingCrossPathsInvitations)
final watchIncomingCrossPathsInvitationsProvider =
    WatchIncomingCrossPathsInvitationsFamily._();

final class WatchIncomingCrossPathsInvitationsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<CrossPathsInvitation>>,
          List<CrossPathsInvitation>,
          Stream<List<CrossPathsInvitation>>
        >
    with
        $FutureModifier<List<CrossPathsInvitation>>,
        $StreamProvider<List<CrossPathsInvitation>> {
  WatchIncomingCrossPathsInvitationsProvider._({
    required WatchIncomingCrossPathsInvitationsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchIncomingCrossPathsInvitationsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchIncomingCrossPathsInvitationsHash();

  @override
  String toString() {
    return r'watchIncomingCrossPathsInvitationsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<CrossPathsInvitation>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<CrossPathsInvitation>> create(Ref ref) {
    final argument = this.argument as String;
    return watchIncomingCrossPathsInvitations(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchIncomingCrossPathsInvitationsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchIncomingCrossPathsInvitationsHash() =>
    r'559c39ac1cc0114b82a57d8bdfbd8d851f9ffbc6';

final class WatchIncomingCrossPathsInvitationsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<CrossPathsInvitation>>, String> {
  WatchIncomingCrossPathsInvitationsFamily._()
    : super(
        retry: null,
        name: r'watchIncomingCrossPathsInvitationsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchIncomingCrossPathsInvitationsProvider call(String uid) =>
      WatchIncomingCrossPathsInvitationsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchIncomingCrossPathsInvitationsProvider';
}

@ProviderFor(watchOutgoingCrossPathsInvitation)
final watchOutgoingCrossPathsInvitationProvider =
    WatchOutgoingCrossPathsInvitationFamily._();

final class WatchOutgoingCrossPathsInvitationProvider
    extends
        $FunctionalProvider<
          AsyncValue<CrossPathsInvitation?>,
          CrossPathsInvitation?,
          Stream<CrossPathsInvitation?>
        >
    with
        $FutureModifier<CrossPathsInvitation?>,
        $StreamProvider<CrossPathsInvitation?> {
  WatchOutgoingCrossPathsInvitationProvider._({
    required WatchOutgoingCrossPathsInvitationFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'watchOutgoingCrossPathsInvitationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchOutgoingCrossPathsInvitationHash();

  @override
  String toString() {
    return r'watchOutgoingCrossPathsInvitationProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<CrossPathsInvitation?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<CrossPathsInvitation?> create(Ref ref) {
    final argument = this.argument as (String, String);
    return watchOutgoingCrossPathsInvitation(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOutgoingCrossPathsInvitationProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOutgoingCrossPathsInvitationHash() =>
    r'123a7d3e61a0f2dfc9d983a9aca232e5eac51fce';

final class WatchOutgoingCrossPathsInvitationFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<CrossPathsInvitation?>,
          (String, String)
        > {
  WatchOutgoingCrossPathsInvitationFamily._()
    : super(
        retry: null,
        name: r'watchOutgoingCrossPathsInvitationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOutgoingCrossPathsInvitationProvider call(String uid, String eventId) =>
      WatchOutgoingCrossPathsInvitationProvider._(
        argument: (uid, eventId),
        from: this,
      );

  @override
  String toString() => r'watchOutgoingCrossPathsInvitationProvider';
}
