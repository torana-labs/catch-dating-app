// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventSuccessRepository)
final eventSuccessRepositoryProvider = EventSuccessRepositoryProvider._();

final class EventSuccessRepositoryProvider
    extends
        $FunctionalProvider<
          EventSuccessRepository,
          EventSuccessRepository,
          EventSuccessRepository
        >
    with $Provider<EventSuccessRepository> {
  EventSuccessRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventSuccessRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventSuccessRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventSuccessRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventSuccessRepository create(Ref ref) {
    return eventSuccessRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventSuccessRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventSuccessRepository>(value),
    );
  }
}

String _$eventSuccessRepositoryHash() =>
    r'320f5d378a5edcea9a75361c0cb0b8bc9b4b0c77';

@ProviderFor(maintainEventSuccessPresence)
final maintainEventSuccessPresenceProvider =
    MaintainEventSuccessPresenceFamily._();

final class MaintainEventSuccessPresenceProvider
    extends $FunctionalProvider<AsyncValue<void>, void, Stream<void>>
    with $FutureModifier<void>, $StreamProvider<void> {
  MaintainEventSuccessPresenceProvider._({
    required MaintainEventSuccessPresenceFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'maintainEventSuccessPresenceProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$maintainEventSuccessPresenceHash();

  @override
  String toString() {
    return r'maintainEventSuccessPresenceProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<void> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<void> create(Ref ref) {
    final argument = this.argument as String;
    return maintainEventSuccessPresence(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is MaintainEventSuccessPresenceProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$maintainEventSuccessPresenceHash() =>
    r'5f9abbe798d3bb994f8b48f33c4dd4f6b2bfbaff';

final class MaintainEventSuccessPresenceFamily extends $Family
    with $FunctionalFamilyOverride<Stream<void>, String> {
  MaintainEventSuccessPresenceFamily._()
    : super(
        retry: null,
        name: r'maintainEventSuccessPresenceProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  MaintainEventSuccessPresenceProvider call(String eventId) =>
      MaintainEventSuccessPresenceProvider._(argument: eventId, from: this);

  @override
  String toString() => r'maintainEventSuccessPresenceProvider';
}

@ProviderFor(watchEventSuccessPresenceSummary)
final watchEventSuccessPresenceSummaryProvider =
    WatchEventSuccessPresenceSummaryFamily._();

final class WatchEventSuccessPresenceSummaryProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessPresenceSummary>,
          EventSuccessPresenceSummary,
          Stream<EventSuccessPresenceSummary>
        >
    with
        $FutureModifier<EventSuccessPresenceSummary>,
        $StreamProvider<EventSuccessPresenceSummary> {
  WatchEventSuccessPresenceSummaryProvider._({
    required WatchEventSuccessPresenceSummaryFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessPresenceSummaryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventSuccessPresenceSummaryHash();

  @override
  String toString() {
    return r'watchEventSuccessPresenceSummaryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessPresenceSummary> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessPresenceSummary> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessPresenceSummary(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessPresenceSummaryProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessPresenceSummaryHash() =>
    r'265235b5e3b1c000a2079d8b519df4ceef05e28e';

final class WatchEventSuccessPresenceSummaryFamily extends $Family
    with
        $FunctionalFamilyOverride<Stream<EventSuccessPresenceSummary>, String> {
  WatchEventSuccessPresenceSummaryFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessPresenceSummaryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessPresenceSummaryProvider call(String eventId) =>
      WatchEventSuccessPresenceSummaryProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventSuccessPresenceSummaryProvider';
}

@ProviderFor(watchUserEventSuccessLateArrivalResolution)
final watchUserEventSuccessLateArrivalResolutionProvider =
    WatchUserEventSuccessLateArrivalResolutionFamily._();

final class WatchUserEventSuccessLateArrivalResolutionProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessLateArrivalResolution?>,
          EventSuccessLateArrivalResolution?,
          Stream<EventSuccessLateArrivalResolution?>
        >
    with
        $FutureModifier<EventSuccessLateArrivalResolution?>,
        $StreamProvider<EventSuccessLateArrivalResolution?> {
  WatchUserEventSuccessLateArrivalResolutionProvider._({
    required WatchUserEventSuccessLateArrivalResolutionFamily super.from,
    required ({String eventId, String uid}) super.argument,
  }) : super(
         retry: null,
         name: r'watchUserEventSuccessLateArrivalResolutionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchUserEventSuccessLateArrivalResolutionHash();

  @override
  String toString() {
    return r'watchUserEventSuccessLateArrivalResolutionProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessLateArrivalResolution?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessLateArrivalResolution?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String uid});
    return watchUserEventSuccessLateArrivalResolution(
      ref,
      eventId: argument.eventId,
      uid: argument.uid,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUserEventSuccessLateArrivalResolutionProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUserEventSuccessLateArrivalResolutionHash() =>
    r'0205e89ca3ab7703da62463c1df3910956d25768';

final class WatchUserEventSuccessLateArrivalResolutionFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventSuccessLateArrivalResolution?>,
          ({String eventId, String uid})
        > {
  WatchUserEventSuccessLateArrivalResolutionFamily._()
    : super(
        retry: null,
        name: r'watchUserEventSuccessLateArrivalResolutionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUserEventSuccessLateArrivalResolutionProvider call({
    required String eventId,
    required String uid,
  }) => WatchUserEventSuccessLateArrivalResolutionProvider._(
    argument: (eventId: eventId, uid: uid),
    from: this,
  );

  @override
  String toString() => r'watchUserEventSuccessLateArrivalResolutionProvider';
}

@ProviderFor(watchEventSuccessPlan)
final watchEventSuccessPlanProvider = WatchEventSuccessPlanFamily._();

final class WatchEventSuccessPlanProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessPlan?>,
          EventSuccessPlan?,
          Stream<EventSuccessPlan?>
        >
    with
        $FutureModifier<EventSuccessPlan?>,
        $StreamProvider<EventSuccessPlan?> {
  WatchEventSuccessPlanProvider._({
    required WatchEventSuccessPlanFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessPlanProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventSuccessPlanHash();

  @override
  String toString() {
    return r'watchEventSuccessPlanProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessPlan?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessPlan?> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessPlan(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessPlanProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessPlanHash() =>
    r'f88d9855b7c8eb3de4832db44225fbb615414032';

final class WatchEventSuccessPlanFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventSuccessPlan?>, String> {
  WatchEventSuccessPlanFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessPlanProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessPlanProvider call(String eventId) =>
      WatchEventSuccessPlanProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventSuccessPlanProvider';
}

@ProviderFor(watchEventSuccessStandings)
final watchEventSuccessStandingsProvider = WatchEventSuccessStandingsFamily._();

final class WatchEventSuccessStandingsProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessStandings?>,
          EventSuccessStandings?,
          Stream<EventSuccessStandings?>
        >
    with
        $FutureModifier<EventSuccessStandings?>,
        $StreamProvider<EventSuccessStandings?> {
  WatchEventSuccessStandingsProvider._({
    required WatchEventSuccessStandingsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessStandingsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventSuccessStandingsHash();

  @override
  String toString() {
    return r'watchEventSuccessStandingsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessStandings?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessStandings?> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessStandings(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessStandingsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessStandingsHash() =>
    r'e4194f21f6c77f9a3b4f17bac6d84941c04ae231';

final class WatchEventSuccessStandingsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventSuccessStandings?>, String> {
  WatchEventSuccessStandingsFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessStandingsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessStandingsProvider call(String eventId) =>
      WatchEventSuccessStandingsProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventSuccessStandingsProvider';
}

@ProviderFor(watchOrganizerEventSuccessLayouts)
final watchOrganizerEventSuccessLayoutsProvider =
    WatchOrganizerEventSuccessLayoutsFamily._();

final class WatchOrganizerEventSuccessLayoutsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventSuccessLayout>>,
          List<EventSuccessLayout>,
          Stream<List<EventSuccessLayout>>
        >
    with
        $FutureModifier<List<EventSuccessLayout>>,
        $StreamProvider<List<EventSuccessLayout>> {
  WatchOrganizerEventSuccessLayoutsProvider._({
    required WatchOrganizerEventSuccessLayoutsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchOrganizerEventSuccessLayoutsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchOrganizerEventSuccessLayoutsHash();

  @override
  String toString() {
    return r'watchOrganizerEventSuccessLayoutsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventSuccessLayout>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventSuccessLayout>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizerEventSuccessLayouts(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizerEventSuccessLayoutsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizerEventSuccessLayoutsHash() =>
    r'a9071789dcfec1b4958acca1ff266457190bb608';

final class WatchOrganizerEventSuccessLayoutsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<EventSuccessLayout>>, String> {
  WatchOrganizerEventSuccessLayoutsFamily._()
    : super(
        retry: null,
        name: r'watchOrganizerEventSuccessLayoutsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizerEventSuccessLayoutsProvider call(String organizerId) =>
      WatchOrganizerEventSuccessLayoutsProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'watchOrganizerEventSuccessLayoutsProvider';
}

@ProviderFor(eventSuccessSpatialLayout)
final eventSuccessSpatialLayoutProvider = EventSuccessSpatialLayoutFamily._();

final class EventSuccessSpatialLayoutProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessLayout?>,
          EventSuccessLayout?,
          FutureOr<EventSuccessLayout?>
        >
    with
        $FutureModifier<EventSuccessLayout?>,
        $FutureProvider<EventSuccessLayout?> {
  EventSuccessSpatialLayoutProvider._({
    required EventSuccessSpatialLayoutFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventSuccessSpatialLayoutProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventSuccessSpatialLayoutHash();

  @override
  String toString() {
    return r'eventSuccessSpatialLayoutProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<EventSuccessLayout?> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventSuccessLayout?> create(Ref ref) {
    final argument = this.argument as String;
    return eventSuccessSpatialLayout(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is EventSuccessSpatialLayoutProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventSuccessSpatialLayoutHash() =>
    r'eb7e2c95206f8173823738680fa9821bc8331ae5';

final class EventSuccessSpatialLayoutFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<EventSuccessLayout?>, String> {
  EventSuccessSpatialLayoutFamily._()
    : super(
        retry: null,
        name: r'eventSuccessSpatialLayoutProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventSuccessSpatialLayoutProvider call(String eventId) =>
      EventSuccessSpatialLayoutProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventSuccessSpatialLayoutProvider';
}

@ProviderFor(watchEventSuccessFeedback)
final watchEventSuccessFeedbackProvider = WatchEventSuccessFeedbackFamily._();

final class WatchEventSuccessFeedbackProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventSuccessFeedback>>,
          List<EventSuccessFeedback>,
          Stream<List<EventSuccessFeedback>>
        >
    with
        $FutureModifier<List<EventSuccessFeedback>>,
        $StreamProvider<List<EventSuccessFeedback>> {
  WatchEventSuccessFeedbackProvider._({
    required WatchEventSuccessFeedbackFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessFeedbackProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventSuccessFeedbackHash();

  @override
  String toString() {
    return r'watchEventSuccessFeedbackProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventSuccessFeedback>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventSuccessFeedback>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessFeedback(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessFeedbackProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessFeedbackHash() =>
    r'01eb0280dd93905ed9ba301008108a1f1ef9b399';

final class WatchEventSuccessFeedbackFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<EventSuccessFeedback>>, String> {
  WatchEventSuccessFeedbackFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessFeedbackProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessFeedbackProvider call(String eventId) =>
      WatchEventSuccessFeedbackProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventSuccessFeedbackProvider';
}

@ProviderFor(watchEventSuccessScorecard)
final watchEventSuccessScorecardProvider = WatchEventSuccessScorecardFamily._();

final class WatchEventSuccessScorecardProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessScorecard?>,
          EventSuccessScorecard?,
          Stream<EventSuccessScorecard?>
        >
    with
        $FutureModifier<EventSuccessScorecard?>,
        $StreamProvider<EventSuccessScorecard?> {
  WatchEventSuccessScorecardProvider._({
    required WatchEventSuccessScorecardFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessScorecardProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventSuccessScorecardHash();

  @override
  String toString() {
    return r'watchEventSuccessScorecardProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessScorecard?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessScorecard?> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessScorecard(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessScorecardProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessScorecardHash() =>
    r'5e5a9fed07de7e8e40d18df096e38e4e021010d1';

final class WatchEventSuccessScorecardFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventSuccessScorecard?>, String> {
  WatchEventSuccessScorecardFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessScorecardProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessScorecardProvider call(String eventId) =>
      WatchEventSuccessScorecardProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventSuccessScorecardProvider';
}

@ProviderFor(watchUserEventSuccessFeedback)
final watchUserEventSuccessFeedbackProvider =
    WatchUserEventSuccessFeedbackFamily._();

final class WatchUserEventSuccessFeedbackProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessFeedback?>,
          EventSuccessFeedback?,
          Stream<EventSuccessFeedback?>
        >
    with
        $FutureModifier<EventSuccessFeedback?>,
        $StreamProvider<EventSuccessFeedback?> {
  WatchUserEventSuccessFeedbackProvider._({
    required WatchUserEventSuccessFeedbackFamily super.from,
    required ({String eventId, String uid}) super.argument,
  }) : super(
         retry: null,
         name: r'watchUserEventSuccessFeedbackProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchUserEventSuccessFeedbackHash();

  @override
  String toString() {
    return r'watchUserEventSuccessFeedbackProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessFeedback?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessFeedback?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String uid});
    return watchUserEventSuccessFeedback(
      ref,
      eventId: argument.eventId,
      uid: argument.uid,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUserEventSuccessFeedbackProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUserEventSuccessFeedbackHash() =>
    r'd198f249f98d4335a425eeaa0c63de7c4d6114b4';

final class WatchUserEventSuccessFeedbackFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventSuccessFeedback?>,
          ({String eventId, String uid})
        > {
  WatchUserEventSuccessFeedbackFamily._()
    : super(
        retry: null,
        name: r'watchUserEventSuccessFeedbackProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUserEventSuccessFeedbackProvider call({
    required String eventId,
    required String uid,
  }) => WatchUserEventSuccessFeedbackProvider._(
    argument: (eventId: eventId, uid: uid),
    from: this,
  );

  @override
  String toString() => r'watchUserEventSuccessFeedbackProvider';
}

@ProviderFor(watchUserEventSuccessAssignment)
final watchUserEventSuccessAssignmentProvider =
    WatchUserEventSuccessAssignmentFamily._();

final class WatchUserEventSuccessAssignmentProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessAssignment?>,
          EventSuccessAssignment?,
          Stream<EventSuccessAssignment?>
        >
    with
        $FutureModifier<EventSuccessAssignment?>,
        $StreamProvider<EventSuccessAssignment?> {
  WatchUserEventSuccessAssignmentProvider._({
    required WatchUserEventSuccessAssignmentFamily super.from,
    required ({String eventId, String uid}) super.argument,
  }) : super(
         retry: null,
         name: r'watchUserEventSuccessAssignmentProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchUserEventSuccessAssignmentHash();

  @override
  String toString() {
    return r'watchUserEventSuccessAssignmentProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessAssignment?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessAssignment?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String uid});
    return watchUserEventSuccessAssignment(
      ref,
      eventId: argument.eventId,
      uid: argument.uid,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUserEventSuccessAssignmentProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUserEventSuccessAssignmentHash() =>
    r'13bb10e80d6342eea14d91d016b93a7f48c3322e';

final class WatchUserEventSuccessAssignmentFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventSuccessAssignment?>,
          ({String eventId, String uid})
        > {
  WatchUserEventSuccessAssignmentFamily._()
    : super(
        retry: null,
        name: r'watchUserEventSuccessAssignmentProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUserEventSuccessAssignmentProvider call({
    required String eventId,
    required String uid,
  }) => WatchUserEventSuccessAssignmentProvider._(
    argument: (eventId: eventId, uid: uid),
    from: this,
  );

  @override
  String toString() => r'watchUserEventSuccessAssignmentProvider';
}

@ProviderFor(watchUserEventSuccessRotationAssignment)
final watchUserEventSuccessRotationAssignmentProvider =
    WatchUserEventSuccessRotationAssignmentFamily._();

final class WatchUserEventSuccessRotationAssignmentProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessAssignment?>,
          EventSuccessAssignment?,
          Stream<EventSuccessAssignment?>
        >
    with
        $FutureModifier<EventSuccessAssignment?>,
        $StreamProvider<EventSuccessAssignment?> {
  WatchUserEventSuccessRotationAssignmentProvider._({
    required WatchUserEventSuccessRotationAssignmentFamily super.from,
    required ({String eventId, String uid}) super.argument,
  }) : super(
         retry: null,
         name: r'watchUserEventSuccessRotationAssignmentProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchUserEventSuccessRotationAssignmentHash();

  @override
  String toString() {
    return r'watchUserEventSuccessRotationAssignmentProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessAssignment?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessAssignment?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String uid});
    return watchUserEventSuccessRotationAssignment(
      ref,
      eventId: argument.eventId,
      uid: argument.uid,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUserEventSuccessRotationAssignmentProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUserEventSuccessRotationAssignmentHash() =>
    r'80272a24bd7324851bba40464eaf236db4706ad7';

final class WatchUserEventSuccessRotationAssignmentFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventSuccessAssignment?>,
          ({String eventId, String uid})
        > {
  WatchUserEventSuccessRotationAssignmentFamily._()
    : super(
        retry: null,
        name: r'watchUserEventSuccessRotationAssignmentProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUserEventSuccessRotationAssignmentProvider call({
    required String eventId,
    required String uid,
  }) => WatchUserEventSuccessRotationAssignmentProvider._(
    argument: (eventId: eventId, uid: uid),
    from: this,
  );

  @override
  String toString() => r'watchUserEventSuccessRotationAssignmentProvider';
}

@ProviderFor(watchEventSuccessAssignments)
final watchEventSuccessAssignmentsProvider =
    WatchEventSuccessAssignmentsFamily._();

final class WatchEventSuccessAssignmentsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventSuccessAssignment>>,
          List<EventSuccessAssignment>,
          Stream<List<EventSuccessAssignment>>
        >
    with
        $FutureModifier<List<EventSuccessAssignment>>,
        $StreamProvider<List<EventSuccessAssignment>> {
  WatchEventSuccessAssignmentsProvider._({
    required WatchEventSuccessAssignmentsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessAssignmentsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventSuccessAssignmentsHash();

  @override
  String toString() {
    return r'watchEventSuccessAssignmentsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventSuccessAssignment>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventSuccessAssignment>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessAssignments(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessAssignmentsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessAssignmentsHash() =>
    r'd43f105ec108f930b755c219eb18c05fdb79fe0b';

final class WatchEventSuccessAssignmentsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<EventSuccessAssignment>>,
          String
        > {
  WatchEventSuccessAssignmentsFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessAssignmentsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessAssignmentsProvider call(String eventId) =>
      WatchEventSuccessAssignmentsProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventSuccessAssignmentsProvider';
}

@ProviderFor(watchEventSuccessRotationAssignments)
final watchEventSuccessRotationAssignmentsProvider =
    WatchEventSuccessRotationAssignmentsFamily._();

final class WatchEventSuccessRotationAssignmentsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventSuccessAssignment>>,
          List<EventSuccessAssignment>,
          Stream<List<EventSuccessAssignment>>
        >
    with
        $FutureModifier<List<EventSuccessAssignment>>,
        $StreamProvider<List<EventSuccessAssignment>> {
  WatchEventSuccessRotationAssignmentsProvider._({
    required WatchEventSuccessRotationAssignmentsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessRotationAssignmentsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchEventSuccessRotationAssignmentsHash();

  @override
  String toString() {
    return r'watchEventSuccessRotationAssignmentsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventSuccessAssignment>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventSuccessAssignment>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessRotationAssignments(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessRotationAssignmentsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessRotationAssignmentsHash() =>
    r'60778d027371dbf2e7dde7c5d865f857abec88a3';

final class WatchEventSuccessRotationAssignmentsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<EventSuccessAssignment>>,
          String
        > {
  WatchEventSuccessRotationAssignmentsFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessRotationAssignmentsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessRotationAssignmentsProvider call(String eventId) =>
      WatchEventSuccessRotationAssignmentsProvider._(
        argument: eventId,
        from: this,
      );

  @override
  String toString() => r'watchEventSuccessRotationAssignmentsProvider';
}

@ProviderFor(watchEventSuccessRotationDrafts)
final watchEventSuccessRotationDraftsProvider =
    WatchEventSuccessRotationDraftsFamily._();

final class WatchEventSuccessRotationDraftsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventSuccessAssignmentDraft>>,
          List<EventSuccessAssignmentDraft>,
          Stream<List<EventSuccessAssignmentDraft>>
        >
    with
        $FutureModifier<List<EventSuccessAssignmentDraft>>,
        $StreamProvider<List<EventSuccessAssignmentDraft>> {
  WatchEventSuccessRotationDraftsProvider._({
    required WatchEventSuccessRotationDraftsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessRotationDraftsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventSuccessRotationDraftsHash();

  @override
  String toString() {
    return r'watchEventSuccessRotationDraftsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventSuccessAssignmentDraft>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventSuccessAssignmentDraft>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessRotationDrafts(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessRotationDraftsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessRotationDraftsHash() =>
    r'2065ae868b8051f08abea70046ee8ba80dc2f9e0';

final class WatchEventSuccessRotationDraftsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<EventSuccessAssignmentDraft>>,
          String
        > {
  WatchEventSuccessRotationDraftsFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessRotationDraftsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessRotationDraftsProvider call(String eventId) =>
      WatchEventSuccessRotationDraftsProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventSuccessRotationDraftsProvider';
}

@ProviderFor(watchUserEventSuccessPreference)
final watchUserEventSuccessPreferenceProvider =
    WatchUserEventSuccessPreferenceFamily._();

final class WatchUserEventSuccessPreferenceProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessPreference?>,
          EventSuccessPreference?,
          Stream<EventSuccessPreference?>
        >
    with
        $FutureModifier<EventSuccessPreference?>,
        $StreamProvider<EventSuccessPreference?> {
  WatchUserEventSuccessPreferenceProvider._({
    required WatchUserEventSuccessPreferenceFamily super.from,
    required ({String eventId, String uid}) super.argument,
  }) : super(
         retry: null,
         name: r'watchUserEventSuccessPreferenceProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchUserEventSuccessPreferenceHash();

  @override
  String toString() {
    return r'watchUserEventSuccessPreferenceProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessPreference?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessPreference?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String uid});
    return watchUserEventSuccessPreference(
      ref,
      eventId: argument.eventId,
      uid: argument.uid,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUserEventSuccessPreferenceProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUserEventSuccessPreferenceHash() =>
    r'1aab50c628c956b5819865a446a64607f422a766';

final class WatchUserEventSuccessPreferenceFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventSuccessPreference?>,
          ({String eventId, String uid})
        > {
  WatchUserEventSuccessPreferenceFamily._()
    : super(
        retry: null,
        name: r'watchUserEventSuccessPreferenceProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUserEventSuccessPreferenceProvider call({
    required String eventId,
    required String uid,
  }) => WatchUserEventSuccessPreferenceProvider._(
    argument: (eventId: eventId, uid: uid),
    from: this,
  );

  @override
  String toString() => r'watchUserEventSuccessPreferenceProvider';
}

@ProviderFor(watchEventSuccessPreferences)
final watchEventSuccessPreferencesProvider =
    WatchEventSuccessPreferencesFamily._();

final class WatchEventSuccessPreferencesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventSuccessPreference>>,
          List<EventSuccessPreference>,
          Stream<List<EventSuccessPreference>>
        >
    with
        $FutureModifier<List<EventSuccessPreference>>,
        $StreamProvider<List<EventSuccessPreference>> {
  WatchEventSuccessPreferencesProvider._({
    required WatchEventSuccessPreferencesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessPreferencesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventSuccessPreferencesHash();

  @override
  String toString() {
    return r'watchEventSuccessPreferencesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventSuccessPreference>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventSuccessPreference>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessPreferences(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessPreferencesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessPreferencesHash() =>
    r'350e915f2cd1f774cb2e23c9e7d935aafb1ea847';

final class WatchEventSuccessPreferencesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<EventSuccessPreference>>,
          String
        > {
  WatchEventSuccessPreferencesFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessPreferencesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessPreferencesProvider call(String eventId) =>
      WatchEventSuccessPreferencesProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventSuccessPreferencesProvider';
}

@ProviderFor(watchUserEventSuccessWingmanRequest)
final watchUserEventSuccessWingmanRequestProvider =
    WatchUserEventSuccessWingmanRequestFamily._();

final class WatchUserEventSuccessWingmanRequestProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessWingmanRequest?>,
          EventSuccessWingmanRequest?,
          Stream<EventSuccessWingmanRequest?>
        >
    with
        $FutureModifier<EventSuccessWingmanRequest?>,
        $StreamProvider<EventSuccessWingmanRequest?> {
  WatchUserEventSuccessWingmanRequestProvider._({
    required WatchUserEventSuccessWingmanRequestFamily super.from,
    required ({String eventId, String uid}) super.argument,
  }) : super(
         retry: null,
         name: r'watchUserEventSuccessWingmanRequestProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchUserEventSuccessWingmanRequestHash();

  @override
  String toString() {
    return r'watchUserEventSuccessWingmanRequestProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessWingmanRequest?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessWingmanRequest?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String uid});
    return watchUserEventSuccessWingmanRequest(
      ref,
      eventId: argument.eventId,
      uid: argument.uid,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUserEventSuccessWingmanRequestProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUserEventSuccessWingmanRequestHash() =>
    r'35e5589971af8b4b7e8cdf2577d4b46ffc330f3d';

final class WatchUserEventSuccessWingmanRequestFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventSuccessWingmanRequest?>,
          ({String eventId, String uid})
        > {
  WatchUserEventSuccessWingmanRequestFamily._()
    : super(
        retry: null,
        name: r'watchUserEventSuccessWingmanRequestProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUserEventSuccessWingmanRequestProvider call({
    required String eventId,
    required String uid,
  }) => WatchUserEventSuccessWingmanRequestProvider._(
    argument: (eventId: eventId, uid: uid),
    from: this,
  );

  @override
  String toString() => r'watchUserEventSuccessWingmanRequestProvider';
}

@ProviderFor(watchUserEventSuccessArrivalMission)
final watchUserEventSuccessArrivalMissionProvider =
    WatchUserEventSuccessArrivalMissionFamily._();

final class WatchUserEventSuccessArrivalMissionProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessArrivalMission?>,
          EventSuccessArrivalMission?,
          Stream<EventSuccessArrivalMission?>
        >
    with
        $FutureModifier<EventSuccessArrivalMission?>,
        $StreamProvider<EventSuccessArrivalMission?> {
  WatchUserEventSuccessArrivalMissionProvider._({
    required WatchUserEventSuccessArrivalMissionFamily super.from,
    required ({String eventId, String uid}) super.argument,
  }) : super(
         retry: null,
         name: r'watchUserEventSuccessArrivalMissionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchUserEventSuccessArrivalMissionHash();

  @override
  String toString() {
    return r'watchUserEventSuccessArrivalMissionProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessArrivalMission?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessArrivalMission?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String uid});
    return watchUserEventSuccessArrivalMission(
      ref,
      eventId: argument.eventId,
      uid: argument.uid,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUserEventSuccessArrivalMissionProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUserEventSuccessArrivalMissionHash() =>
    r'ade0b65de027989ac68a5728ca22416d12499d90';

final class WatchUserEventSuccessArrivalMissionFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventSuccessArrivalMission?>,
          ({String eventId, String uid})
        > {
  WatchUserEventSuccessArrivalMissionFamily._()
    : super(
        retry: null,
        name: r'watchUserEventSuccessArrivalMissionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUserEventSuccessArrivalMissionProvider call({
    required String eventId,
    required String uid,
  }) => WatchUserEventSuccessArrivalMissionProvider._(
    argument: (eventId: eventId, uid: uid),
    from: this,
  );

  @override
  String toString() => r'watchUserEventSuccessArrivalMissionProvider';
}

@ProviderFor(watchEventSuccessWingmanRequests)
final watchEventSuccessWingmanRequestsProvider =
    WatchEventSuccessWingmanRequestsFamily._();

final class WatchEventSuccessWingmanRequestsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventSuccessWingmanRequest>>,
          List<EventSuccessWingmanRequest>,
          Stream<List<EventSuccessWingmanRequest>>
        >
    with
        $FutureModifier<List<EventSuccessWingmanRequest>>,
        $StreamProvider<List<EventSuccessWingmanRequest>> {
  WatchEventSuccessWingmanRequestsProvider._({
    required WatchEventSuccessWingmanRequestsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventSuccessWingmanRequestsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventSuccessWingmanRequestsHash();

  @override
  String toString() {
    return r'watchEventSuccessWingmanRequestsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventSuccessWingmanRequest>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventSuccessWingmanRequest>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventSuccessWingmanRequests(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventSuccessWingmanRequestsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventSuccessWingmanRequestsHash() =>
    r'71655a2c6f412220c6cf1c7569578646bf7ff243';

final class WatchEventSuccessWingmanRequestsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<EventSuccessWingmanRequest>>,
          String
        > {
  WatchEventSuccessWingmanRequestsFamily._()
    : super(
        retry: null,
        name: r'watchEventSuccessWingmanRequestsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventSuccessWingmanRequestsProvider call(String eventId) =>
      WatchEventSuccessWingmanRequestsProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventSuccessWingmanRequestsProvider';
}

@ProviderFor(watchUserEventSuccessCompatibilityResponse)
final watchUserEventSuccessCompatibilityResponseProvider =
    WatchUserEventSuccessCompatibilityResponseFamily._();

final class WatchUserEventSuccessCompatibilityResponseProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessCompatibilityResponse?>,
          EventSuccessCompatibilityResponse?,
          Stream<EventSuccessCompatibilityResponse?>
        >
    with
        $FutureModifier<EventSuccessCompatibilityResponse?>,
        $StreamProvider<EventSuccessCompatibilityResponse?> {
  WatchUserEventSuccessCompatibilityResponseProvider._({
    required WatchUserEventSuccessCompatibilityResponseFamily super.from,
    required ({String eventId, String uid}) super.argument,
  }) : super(
         retry: null,
         name: r'watchUserEventSuccessCompatibilityResponseProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchUserEventSuccessCompatibilityResponseHash();

  @override
  String toString() {
    return r'watchUserEventSuccessCompatibilityResponseProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventSuccessCompatibilityResponse?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventSuccessCompatibilityResponse?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String uid});
    return watchUserEventSuccessCompatibilityResponse(
      ref,
      eventId: argument.eventId,
      uid: argument.uid,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUserEventSuccessCompatibilityResponseProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUserEventSuccessCompatibilityResponseHash() =>
    r'36de4e6b8a03904748c8901fdcabbaf2c399f756';

final class WatchUserEventSuccessCompatibilityResponseFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventSuccessCompatibilityResponse?>,
          ({String eventId, String uid})
        > {
  WatchUserEventSuccessCompatibilityResponseFamily._()
    : super(
        retry: null,
        name: r'watchUserEventSuccessCompatibilityResponseProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUserEventSuccessCompatibilityResponseProvider call({
    required String eventId,
    required String uid,
  }) => WatchUserEventSuccessCompatibilityResponseProvider._(
    argument: (eventId: eventId, uid: uid),
    from: this,
  );

  @override
  String toString() => r'watchUserEventSuccessCompatibilityResponseProvider';
}

@ProviderFor(wingmanRequestCandidates)
final wingmanRequestCandidatesProvider = WingmanRequestCandidatesFamily._();

final class WingmanRequestCandidatesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<PublicProfile>>,
          List<PublicProfile>,
          FutureOr<List<PublicProfile>>
        >
    with
        $FutureModifier<List<PublicProfile>>,
        $FutureProvider<List<PublicProfile>> {
  WingmanRequestCandidatesProvider._({
    required WingmanRequestCandidatesFamily super.from,
    required ({String eventId, UserProfile currentUser}) super.argument,
  }) : super(
         retry: null,
         name: r'wingmanRequestCandidatesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$wingmanRequestCandidatesHash();

  @override
  String toString() {
    return r'wingmanRequestCandidatesProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<List<PublicProfile>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<PublicProfile>> create(Ref ref) {
    final argument =
        this.argument as ({String eventId, UserProfile currentUser});
    return wingmanRequestCandidates(
      ref,
      eventId: argument.eventId,
      currentUser: argument.currentUser,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WingmanRequestCandidatesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$wingmanRequestCandidatesHash() =>
    r'5ae3c17005d8d49242a0832f61ee3f5dfa6e0ca1';

final class WingmanRequestCandidatesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<PublicProfile>>,
          ({String eventId, UserProfile currentUser})
        > {
  WingmanRequestCandidatesFamily._()
    : super(
        retry: null,
        name: r'wingmanRequestCandidatesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WingmanRequestCandidatesProvider call({
    required String eventId,
    required UserProfile currentUser,
  }) => WingmanRequestCandidatesProvider._(
    argument: (eventId: eventId, currentUser: currentUser),
    from: this,
  );

  @override
  String toString() => r'wingmanRequestCandidatesProvider';
}

@ProviderFor(eventSuccessAssignmentPeerProfiles)
final eventSuccessAssignmentPeerProfilesProvider =
    EventSuccessAssignmentPeerProfilesFamily._();

final class EventSuccessAssignmentPeerProfilesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<PublicProfile>>,
          List<PublicProfile>,
          FutureOr<List<PublicProfile>>
        >
    with
        $FutureModifier<List<PublicProfile>>,
        $FutureProvider<List<PublicProfile>> {
  EventSuccessAssignmentPeerProfilesProvider._({
    required EventSuccessAssignmentPeerProfilesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventSuccessAssignmentPeerProfilesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventSuccessAssignmentPeerProfilesHash();

  @override
  String toString() {
    return r'eventSuccessAssignmentPeerProfilesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<PublicProfile>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<PublicProfile>> create(Ref ref) {
    final argument = this.argument as String;
    return eventSuccessAssignmentPeerProfiles(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is EventSuccessAssignmentPeerProfilesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventSuccessAssignmentPeerProfilesHash() =>
    r'ab8811424c2f883a46cb4f7af1dad9198892a635';

final class EventSuccessAssignmentPeerProfilesFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<PublicProfile>>, String> {
  EventSuccessAssignmentPeerProfilesFamily._()
    : super(
        retry: null,
        name: r'eventSuccessAssignmentPeerProfilesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventSuccessAssignmentPeerProfilesProvider call(String peerUidsKey) =>
      EventSuccessAssignmentPeerProfilesProvider._(
        argument: peerUidsKey,
        from: this,
      );

  @override
  String toString() => r'eventSuccessAssignmentPeerProfilesProvider';
}
