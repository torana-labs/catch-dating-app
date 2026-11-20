// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_contacts_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostContactsRepository)
final hostContactsRepositoryProvider = HostContactsRepositoryProvider._();

final class HostContactsRepositoryProvider
    extends
        $FunctionalProvider<
          HostContactsRepository,
          HostContactsRepository,
          HostContactsRepository
        >
    with $Provider<HostContactsRepository> {
  HostContactsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostContactsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostContactsRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostContactsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostContactsRepository create(Ref ref) {
    return hostContactsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostContactsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostContactsRepository>(value),
    );
  }
}

String _$hostContactsRepositoryHash() =>
    r'2086cff638353a888e1fdf75f2c06a14aecc6deb';

/// The organizer's contact directory document, as a listener.

@ProviderFor(hostContactDirectory)
final hostContactDirectoryProvider = HostContactDirectoryFamily._();

/// The organizer's contact directory document, as a listener.

final class HostContactDirectoryProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostContactDirectory>,
          HostContactDirectory,
          Stream<HostContactDirectory>
        >
    with
        $FutureModifier<HostContactDirectory>,
        $StreamProvider<HostContactDirectory> {
  /// The organizer's contact directory document, as a listener.
  HostContactDirectoryProvider._({
    required HostContactDirectoryFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostContactDirectoryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostContactDirectoryHash();

  @override
  String toString() {
    return r'hostContactDirectoryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<HostContactDirectory> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostContactDirectory> create(Ref ref) {
    final argument = this.argument as String;
    return hostContactDirectory(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostContactDirectoryProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostContactDirectoryHash() =>
    r'6a73de7a831d7ff8e7be21d9a4c6802b942169cf';

/// The organizer's contact directory document, as a listener.

final class HostContactDirectoryFamily extends $Family
    with $FunctionalFamilyOverride<Stream<HostContactDirectory>, String> {
  HostContactDirectoryFamily._()
    : super(
        retry: null,
        name: r'hostContactDirectoryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's contact directory document, as a listener.

  HostContactDirectoryProvider call(String organizerId) =>
      HostContactDirectoryProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostContactDirectoryProvider';
}

/// Everyone's summary, kept current by the directory listener.

@ProviderFor(hostCrmSummary)
final hostCrmSummaryProvider = HostCrmSummaryFamily._();

/// Everyone's summary, kept current by the directory listener.

final class HostCrmSummaryProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostCrmSummary>,
          HostCrmSummary,
          FutureOr<HostCrmSummary>
        >
    with $FutureModifier<HostCrmSummary>, $FutureProvider<HostCrmSummary> {
  /// Everyone's summary, kept current by the directory listener.
  HostCrmSummaryProvider._({
    required HostCrmSummaryFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostCrmSummaryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostCrmSummaryHash();

  @override
  String toString() {
    return r'hostCrmSummaryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostCrmSummary> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostCrmSummary> create(Ref ref) {
    final argument = this.argument as String;
    return hostCrmSummary(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostCrmSummaryProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostCrmSummaryHash() => r'c816b090d512c742234b7623a62eedec194291e5';

/// Everyone's summary, kept current by the directory listener.

final class HostCrmSummaryFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostCrmSummary>, String> {
  HostCrmSummaryFamily._()
    : super(
        retry: null,
        name: r'hostCrmSummaryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Everyone's summary, kept current by the directory listener.

  HostCrmSummaryProvider call(String organizerId) =>
      HostCrmSummaryProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostCrmSummaryProvider';
}

/// The door's roster label read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it; the
/// attendee writes the door makes reach it through the server's triggers.

@ProviderFor(hostEventRosterInsights)
final hostEventRosterInsightsProvider = HostEventRosterInsightsFamily._();

/// The door's roster label read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it; the
/// attendee writes the door makes reach it through the server's triggers.

final class HostEventRosterInsightsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostEventRosterInsights>,
          HostEventRosterInsights,
          Stream<HostEventRosterInsights>
        >
    with
        $FutureModifier<HostEventRosterInsights>,
        $StreamProvider<HostEventRosterInsights> {
  /// The door's roster label read owner. It is a Firestore listener: it
  /// declares no cache tags or lifetime, and writes never invalidate it; the
  /// attendee writes the door makes reach it through the server's triggers.
  HostEventRosterInsightsProvider._({
    required HostEventRosterInsightsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostEventRosterInsightsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventRosterInsightsHash();

  @override
  String toString() {
    return r'hostEventRosterInsightsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<HostEventRosterInsights> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostEventRosterInsights> create(Ref ref) {
    final argument = this.argument as String;
    return hostEventRosterInsights(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventRosterInsightsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventRosterInsightsHash() =>
    r'3c26d5fd3bae89424278d1b8dfb41d1dc91140ac';

/// The door's roster label read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it; the
/// attendee writes the door makes reach it through the server's triggers.

final class HostEventRosterInsightsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<HostEventRosterInsights>, String> {
  HostEventRosterInsightsFamily._()
    : super(
        retry: null,
        name: r'hostEventRosterInsightsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The door's roster label read owner. It is a Firestore listener: it
  /// declares no cache tags or lifetime, and writes never invalidate it; the
  /// attendee writes the door makes reach it through the server's triggers.

  HostEventRosterInsightsProvider call(String eventId) =>
      HostEventRosterInsightsProvider._(argument: eventId, from: this);

  @override
  String toString() => r'hostEventRosterInsightsProvider';
}

@ProviderFor(hostAudience)
final hostAudienceProvider = HostAudienceFamily._();

final class HostAudienceProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostAudiencePage>,
          HostAudiencePage,
          FutureOr<HostAudiencePage>
        >
    with $FutureModifier<HostAudiencePage>, $FutureProvider<HostAudiencePage> {
  HostAudienceProvider._({
    required HostAudienceFamily super.from,
    required (String, HostAudienceQuery) super.argument,
  }) : super(
         retry: null,
         name: r'hostAudienceProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostAudienceHash();

  @override
  String toString() {
    return r'hostAudienceProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostAudiencePage> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostAudiencePage> create(Ref ref) {
    final argument = this.argument as (String, HostAudienceQuery);
    return hostAudience(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostAudienceProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostAudienceHash() => r'2f0fe5ec04e5ef6ddd0f588c95694b2a7b302b28';

final class HostAudienceFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostAudiencePage>,
          (String, HostAudienceQuery)
        > {
  HostAudienceFamily._()
    : super(
        retry: null,
        name: r'hostAudienceProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostAudienceProvider call(String organizerId, HostAudienceQuery query) =>
      HostAudienceProvider._(argument: (organizerId, query), from: this);

  @override
  String toString() => r'hostAudienceProvider';
}

/// One person's directory row: name, endpoints, tags and revision. It is a
/// Firestore listener: writes never invalidate it, the server's projector
/// delivers them.

@ProviderFor(hostContactSummaryRow)
final hostContactSummaryRowProvider = HostContactSummaryRowFamily._();

/// One person's directory row: name, endpoints, tags and revision. It is a
/// Firestore listener: writes never invalidate it, the server's projector
/// delivers them.

final class HostContactSummaryRowProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostContactSummaryRow>,
          HostContactSummaryRow,
          Stream<HostContactSummaryRow>
        >
    with
        $FutureModifier<HostContactSummaryRow>,
        $StreamProvider<HostContactSummaryRow> {
  /// One person's directory row: name, endpoints, tags and revision. It is a
  /// Firestore listener: writes never invalidate it, the server's projector
  /// delivers them.
  HostContactSummaryRowProvider._({
    required HostContactSummaryRowFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostContactSummaryRowProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostContactSummaryRowHash();

  @override
  String toString() {
    return r'hostContactSummaryRowProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostContactSummaryRow> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostContactSummaryRow> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostContactSummaryRow(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostContactSummaryRowProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostContactSummaryRowHash() =>
    r'631ce02ec5ef319e464571b28f59d78ed076d786';

/// One person's directory row: name, endpoints, tags and revision. It is a
/// Firestore listener: writes never invalidate it, the server's projector
/// delivers them.

final class HostContactSummaryRowFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostContactSummaryRow>,
          (String, String)
        > {
  HostContactSummaryRowFamily._()
    : super(
        retry: null,
        name: r'hostContactSummaryRowProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One person's directory row: name, endpoints, tags and revision. It is a
  /// Firestore listener: writes never invalidate it, the server's projector
  /// delivers them.

  HostContactSummaryRowProvider call(String organizerId, String contactId) =>
      HostContactSummaryRowProvider._(
        argument: (organizerId, contactId),
        from: this,
      );

  @override
  String toString() => r'hostContactSummaryRowProvider';
}

/// One person's traits, revenue and newest event rows, as a listener on
/// the contact detail read model.

@ProviderFor(hostContactDetailFacts)
final hostContactDetailFactsProvider = HostContactDetailFactsFamily._();

/// One person's traits, revenue and newest event rows, as a listener on
/// the contact detail read model.

final class HostContactDetailFactsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostContactDetailFacts>,
          HostContactDetailFacts,
          Stream<HostContactDetailFacts>
        >
    with
        $FutureModifier<HostContactDetailFacts>,
        $StreamProvider<HostContactDetailFacts> {
  /// One person's traits, revenue and newest event rows, as a listener on
  /// the contact detail read model.
  HostContactDetailFactsProvider._({
    required HostContactDetailFactsFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostContactDetailFactsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostContactDetailFactsHash();

  @override
  String toString() {
    return r'hostContactDetailFactsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostContactDetailFacts> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostContactDetailFacts> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostContactDetailFacts(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostContactDetailFactsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostContactDetailFactsHash() =>
    r'9ddce7d08b74994f69faa6a837eec5a61ee56dab';

/// One person's traits, revenue and newest event rows, as a listener on
/// the contact detail read model.

final class HostContactDetailFactsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostContactDetailFacts>,
          (String, String)
        > {
  HostContactDetailFactsFamily._()
    : super(
        retry: null,
        name: r'hostContactDetailFactsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One person's traits, revenue and newest event rows, as a listener on
  /// the contact detail read model.

  HostContactDetailFactsProvider call(String organizerId, String contactId) =>
      HostContactDetailFactsProvider._(
        argument: (organizerId, contactId),
        from: this,
      );

  @override
  String toString() => r'hostContactDetailFactsProvider';
}

/// The team's newest note on one person, as a listener.

@ProviderFor(hostContactNotes)
final hostContactNotesProvider = HostContactNotesFamily._();

/// The team's newest note on one person, as a listener.

final class HostContactNotesProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostContactNotes>,
          HostContactNotes,
          Stream<HostContactNotes>
        >
    with $FutureModifier<HostContactNotes>, $StreamProvider<HostContactNotes> {
  /// The team's newest note on one person, as a listener.
  HostContactNotesProvider._({
    required HostContactNotesFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostContactNotesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostContactNotesHash();

  @override
  String toString() {
    return r'hostContactNotesProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostContactNotes> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostContactNotes> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostContactNotes(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostContactNotesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostContactNotesHash() => r'89c21620e8d4b1fe461a556dba556fded8f82faf';

/// The team's newest note on one person, as a listener.

final class HostContactNotesFamily extends $Family
    with $FunctionalFamilyOverride<Stream<HostContactNotes>, (String, String)> {
  HostContactNotesFamily._()
    : super(
        retry: null,
        name: r'hostContactNotesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The team's newest note on one person, as a listener.

  HostContactNotesProvider call(String organizerId, String contactId) =>
      HostContactNotesProvider._(
        argument: (organizerId, contactId),
        from: this,
      );

  @override
  String toString() => r'hostContactNotesProvider';
}
