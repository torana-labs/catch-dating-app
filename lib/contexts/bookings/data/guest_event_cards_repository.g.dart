// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'guest_event_cards_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(guestEventCardsRepository)
final guestEventCardsRepositoryProvider = GuestEventCardsRepositoryProvider._();

final class GuestEventCardsRepositoryProvider
    extends
        $FunctionalProvider<
          GuestEventCardsRepository,
          GuestEventCardsRepository,
          GuestEventCardsRepository
        >
    with $Provider<GuestEventCardsRepository> {
  GuestEventCardsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'guestEventCardsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$guestEventCardsRepositoryHash();

  @$internal
  @override
  $ProviderElement<GuestEventCardsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  GuestEventCardsRepository create(Ref ref) {
    return guestEventCardsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(GuestEventCardsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<GuestEventCardsRepository>(value),
    );
  }
}

String _$guestEventCardsRepositoryHash() =>
    r'ae9844276e36bf1482b97cb01c5d16fbd219a41d';

/// Upcoming and past events the guest is booked at.

@ProviderFor(watchSignedUpEventCards)
final watchSignedUpEventCardsProvider = WatchSignedUpEventCardsFamily._();

/// Upcoming and past events the guest is booked at.

final class WatchSignedUpEventCardsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<GuestEventCard>>,
          List<GuestEventCard>,
          Stream<List<GuestEventCard>>
        >
    with
        $FutureModifier<List<GuestEventCard>>,
        $StreamProvider<List<GuestEventCard>> {
  /// Upcoming and past events the guest is booked at.
  WatchSignedUpEventCardsProvider._({
    required WatchSignedUpEventCardsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchSignedUpEventCardsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchSignedUpEventCardsHash();

  @override
  String toString() {
    return r'watchSignedUpEventCardsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<GuestEventCard>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<GuestEventCard>> create(Ref ref) {
    final argument = this.argument as String;
    return watchSignedUpEventCards(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchSignedUpEventCardsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchSignedUpEventCardsHash() =>
    r'bfdc04d988bcd3f11e310cb96ddb0667d28de225';

/// Upcoming and past events the guest is booked at.

final class WatchSignedUpEventCardsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<GuestEventCard>>, String> {
  WatchSignedUpEventCardsFamily._()
    : super(
        retry: null,
        name: r'watchSignedUpEventCardsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Upcoming and past events the guest is booked at.

  WatchSignedUpEventCardsProvider call(String uid) =>
      WatchSignedUpEventCardsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchSignedUpEventCardsProvider';
}

/// The guest's most recent attended events, newest first. Attendance only
/// grows, and its readers (the home's catch windows and review prompt, and
/// Explore's time-of-day signal) use recent events, so the listener reads
/// one history page instead of every event the guest ever attended.

@ProviderFor(watchAttendedEventCards)
final watchAttendedEventCardsProvider = WatchAttendedEventCardsFamily._();

/// The guest's most recent attended events, newest first. Attendance only
/// grows, and its readers (the home's catch windows and review prompt, and
/// Explore's time-of-day signal) use recent events, so the listener reads
/// one history page instead of every event the guest ever attended.

final class WatchAttendedEventCardsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<GuestEventCard>>,
          List<GuestEventCard>,
          Stream<List<GuestEventCard>>
        >
    with
        $FutureModifier<List<GuestEventCard>>,
        $StreamProvider<List<GuestEventCard>> {
  /// The guest's most recent attended events, newest first. Attendance only
  /// grows, and its readers (the home's catch windows and review prompt, and
  /// Explore's time-of-day signal) use recent events, so the listener reads
  /// one history page instead of every event the guest ever attended.
  WatchAttendedEventCardsProvider._({
    required WatchAttendedEventCardsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchAttendedEventCardsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchAttendedEventCardsHash();

  @override
  String toString() {
    return r'watchAttendedEventCardsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<GuestEventCard>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<GuestEventCard>> create(Ref ref) {
    final argument = this.argument as String;
    return watchAttendedEventCards(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchAttendedEventCardsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchAttendedEventCardsHash() =>
    r'0bf36d7c1589b2b0ca15c0f7975055b44fa55fb3';

/// The guest's most recent attended events, newest first. Attendance only
/// grows, and its readers (the home's catch windows and review prompt, and
/// Explore's time-of-day signal) use recent events, so the listener reads
/// one history page instead of every event the guest ever attended.

final class WatchAttendedEventCardsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<GuestEventCard>>, String> {
  WatchAttendedEventCardsFamily._()
    : super(
        retry: null,
        name: r'watchAttendedEventCardsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The guest's most recent attended events, newest first. Attendance only
  /// grows, and its readers (the home's catch windows and review prompt, and
  /// Explore's time-of-day signal) use recent events, so the listener reads
  /// one history page instead of every event the guest ever attended.

  WatchAttendedEventCardsProvider call(String uid) =>
      WatchAttendedEventCardsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchAttendedEventCardsProvider';
}

/// Events the guest is booked or waitlisted at, for schedule overlaps.

@ProviderFor(watchScheduledEventCards)
final watchScheduledEventCardsProvider = WatchScheduledEventCardsFamily._();

/// Events the guest is booked or waitlisted at, for schedule overlaps.

final class WatchScheduledEventCardsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<GuestEventCard>>,
          List<GuestEventCard>,
          Stream<List<GuestEventCard>>
        >
    with
        $FutureModifier<List<GuestEventCard>>,
        $StreamProvider<List<GuestEventCard>> {
  /// Events the guest is booked or waitlisted at, for schedule overlaps.
  WatchScheduledEventCardsProvider._({
    required WatchScheduledEventCardsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchScheduledEventCardsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchScheduledEventCardsHash();

  @override
  String toString() {
    return r'watchScheduledEventCardsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<GuestEventCard>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<GuestEventCard>> create(Ref ref) {
    final argument = this.argument as String;
    return watchScheduledEventCards(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchScheduledEventCardsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchScheduledEventCardsHash() =>
    r'618dbea0ec893d8f7744d671f37f820a0304997a';

/// Events the guest is booked or waitlisted at, for schedule overlaps.

final class WatchScheduledEventCardsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<GuestEventCard>>, String> {
  WatchScheduledEventCardsFamily._()
    : super(
        retry: null,
        name: r'watchScheduledEventCardsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Events the guest is booked or waitlisted at, for schedule overlaps.

  WatchScheduledEventCardsProvider call(String uid) =>
      WatchScheduledEventCardsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchScheduledEventCardsProvider';
}

/// Events the guest saved.

@ProviderFor(watchSavedEventCards)
final watchSavedEventCardsProvider = WatchSavedEventCardsFamily._();

/// Events the guest saved.

final class WatchSavedEventCardsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<GuestEventCard>>,
          List<GuestEventCard>,
          Stream<List<GuestEventCard>>
        >
    with
        $FutureModifier<List<GuestEventCard>>,
        $StreamProvider<List<GuestEventCard>> {
  /// Events the guest saved.
  WatchSavedEventCardsProvider._({
    required WatchSavedEventCardsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchSavedEventCardsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchSavedEventCardsHash();

  @override
  String toString() {
    return r'watchSavedEventCardsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<GuestEventCard>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<GuestEventCard>> create(Ref ref) {
    final argument = this.argument as String;
    return watchSavedEventCards(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchSavedEventCardsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchSavedEventCardsHash() =>
    r'83942bc513b87bc5300c1c35f42413f60e587b68';

/// Events the guest saved.

final class WatchSavedEventCardsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<GuestEventCard>>, String> {
  WatchSavedEventCardsFamily._()
    : super(
        retry: null,
        name: r'watchSavedEventCardsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Events the guest saved.

  WatchSavedEventCardsProvider call(String uid) =>
      WatchSavedEventCardsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchSavedEventCardsProvider';
}

/// The guest's event cards by event id, for payment and review history.

@ProviderFor(watchOwnEventCardsById)
final watchOwnEventCardsByIdProvider = WatchOwnEventCardsByIdFamily._();

/// The guest's event cards by event id, for payment and review history.

final class WatchOwnEventCardsByIdProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, GuestEventCard>>,
          Map<String, GuestEventCard>,
          Stream<Map<String, GuestEventCard>>
        >
    with
        $FutureModifier<Map<String, GuestEventCard>>,
        $StreamProvider<Map<String, GuestEventCard>> {
  /// The guest's event cards by event id, for payment and review history.
  WatchOwnEventCardsByIdProvider._({
    required WatchOwnEventCardsByIdFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchOwnEventCardsByIdProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOwnEventCardsByIdHash();

  @override
  String toString() {
    return r'watchOwnEventCardsByIdProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Map<String, GuestEventCard>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<Map<String, GuestEventCard>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOwnEventCardsById(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOwnEventCardsByIdProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOwnEventCardsByIdHash() =>
    r'ff632d5478499f104785c64f5e16544170d40903';

/// The guest's event cards by event id, for payment and review history.

final class WatchOwnEventCardsByIdFamily extends $Family
    with
        $FunctionalFamilyOverride<Stream<Map<String, GuestEventCard>>, String> {
  WatchOwnEventCardsByIdFamily._()
    : super(
        retry: null,
        name: r'watchOwnEventCardsByIdProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The guest's event cards by event id, for payment and review history.

  WatchOwnEventCardsByIdProvider call(String uid) =>
      WatchOwnEventCardsByIdProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchOwnEventCardsByIdProvider';
}
