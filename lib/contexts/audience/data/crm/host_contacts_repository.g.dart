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
    r'8e2caba6ee48733cd6b923371b620dadc5a9f56c';

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

@ProviderFor(hostAudienceContactDetail)
final hostAudienceContactDetailProvider = HostAudienceContactDetailFamily._();

final class HostAudienceContactDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostAudienceContactDetail>,
          HostAudienceContactDetail,
          FutureOr<HostAudienceContactDetail>
        >
    with
        $FutureModifier<HostAudienceContactDetail>,
        $FutureProvider<HostAudienceContactDetail> {
  HostAudienceContactDetailProvider._({
    required HostAudienceContactDetailFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostAudienceContactDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostAudienceContactDetailHash();

  @override
  String toString() {
    return r'hostAudienceContactDetailProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostAudienceContactDetail> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostAudienceContactDetail> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostAudienceContactDetail(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostAudienceContactDetailProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostAudienceContactDetailHash() =>
    r'528ff06e5ba8a801b99b89e4672fb3d1e8edd437';

final class HostAudienceContactDetailFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostAudienceContactDetail>,
          (String, String)
        > {
  HostAudienceContactDetailFamily._()
    : super(
        retry: null,
        name: r'hostAudienceContactDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostAudienceContactDetailProvider call(
    String organizerId,
    String contactId,
  ) => HostAudienceContactDetailProvider._(
    argument: (organizerId, contactId),
    from: this,
  );

  @override
  String toString() => r'hostAudienceContactDetailProvider';
}

@ProviderFor(hostAudienceContactHistory)
final hostAudienceContactHistoryProvider = HostAudienceContactHistoryFamily._();

final class HostAudienceContactHistoryProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostAudienceContactDetail>,
          HostAudienceContactDetail,
          FutureOr<HostAudienceContactDetail>
        >
    with
        $FutureModifier<HostAudienceContactDetail>,
        $FutureProvider<HostAudienceContactDetail> {
  HostAudienceContactHistoryProvider._({
    required HostAudienceContactHistoryFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostAudienceContactHistoryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostAudienceContactHistoryHash();

  @override
  String toString() {
    return r'hostAudienceContactHistoryProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostAudienceContactDetail> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostAudienceContactDetail> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostAudienceContactHistory(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostAudienceContactHistoryProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostAudienceContactHistoryHash() =>
    r'830333676526fd666dbabd3f5982b295d5e12177';

final class HostAudienceContactHistoryFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostAudienceContactDetail>,
          (String, String)
        > {
  HostAudienceContactHistoryFamily._()
    : super(
        retry: null,
        name: r'hostAudienceContactHistoryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostAudienceContactHistoryProvider call(
    String organizerId,
    String contactId,
  ) => HostAudienceContactHistoryProvider._(
    argument: (organizerId, contactId),
    from: this,
  );

  @override
  String toString() => r'hostAudienceContactHistoryProvider';
}
