// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'people_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Who is signed in and which organizer the People tab shows: the selected
/// organizer, else [preferredOrganizerId] from the route, else the first.

@ProviderFor(hostPeopleOrganizer)
final hostPeopleOrganizerProvider = HostPeopleOrganizerFamily._();

/// Who is signed in and which organizer the People tab shows: the selected
/// organizer, else [preferredOrganizerId] from the route, else the first.

final class HostPeopleOrganizerProvider
    extends
        $FunctionalProvider<
          HostPeopleOrganizer,
          HostPeopleOrganizer,
          HostPeopleOrganizer
        >
    with $Provider<HostPeopleOrganizer> {
  /// Who is signed in and which organizer the People tab shows: the selected
  /// organizer, else [preferredOrganizerId] from the route, else the first.
  HostPeopleOrganizerProvider._({
    required HostPeopleOrganizerFamily super.from,
    required String? super.argument,
  }) : super(
         retry: null,
         name: r'hostPeopleOrganizerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleOrganizerHash();

  @override
  String toString() {
    return r'hostPeopleOrganizerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostPeopleOrganizer> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostPeopleOrganizer create(Ref ref) {
    final argument = this.argument as String?;
    return hostPeopleOrganizer(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostPeopleOrganizer value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostPeopleOrganizer>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostPeopleOrganizerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPeopleOrganizerHash() =>
    r'439891bbc70309ca074bc08a20a3338cd2014c75';

/// Who is signed in and which organizer the People tab shows: the selected
/// organizer, else [preferredOrganizerId] from the route, else the first.

final class HostPeopleOrganizerFamily extends $Family
    with $FunctionalFamilyOverride<HostPeopleOrganizer, String?> {
  HostPeopleOrganizerFamily._()
    : super(
        retry: null,
        name: r'hostPeopleOrganizerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Who is signed in and which organizer the People tab shows: the selected
  /// organizer, else [preferredOrganizerId] from the route, else the first.

  HostPeopleOrganizerProvider call(String? preferredOrganizerId) =>
      HostPeopleOrganizerProvider._(argument: preferredOrganizerId, from: this);

  @override
  String toString() => r'hostPeopleOrganizerProvider';
}

/// How many rows the People list listens to for one request; it grows by a
/// page each time the list asks for more.

@ProviderFor(HostPeopleWindow)
final hostPeopleWindowProvider = HostPeopleWindowFamily._();

/// How many rows the People list listens to for one request; it grows by a
/// page each time the list asks for more.
final class HostPeopleWindowProvider
    extends $NotifierProvider<HostPeopleWindow, int> {
  /// How many rows the People list listens to for one request; it grows by a
  /// page each time the list asks for more.
  HostPeopleWindowProvider._({
    required HostPeopleWindowFamily super.from,
    required HostPeopleRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostPeopleWindowProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleWindowHash();

  @override
  String toString() {
    return r'hostPeopleWindowProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostPeopleWindow create() => HostPeopleWindow();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostPeopleWindowProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPeopleWindowHash() => r'665ee1d6bf9aebd1a1140e31c1e6210f09f80439';

/// How many rows the People list listens to for one request; it grows by a
/// page each time the list asks for more.

final class HostPeopleWindowFamily extends $Family
    with
        $ClassFamilyOverride<
          HostPeopleWindow,
          int,
          int,
          int,
          HostPeopleRequest
        > {
  HostPeopleWindowFamily._()
    : super(
        retry: null,
        name: r'hostPeopleWindowProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// How many rows the People list listens to for one request; it grows by a
  /// page each time the list asks for more.

  HostPeopleWindowProvider call(HostPeopleRequest request) =>
      HostPeopleWindowProvider._(argument: request, from: this);

  @override
  String toString() => r'hostPeopleWindowProvider';
}

/// How many rows the People list listens to for one request; it grows by a
/// page each time the list asks for more.

abstract class _$HostPeopleWindow extends $Notifier<int> {
  late final _$args = ref.$arg as HostPeopleRequest;
  HostPeopleRequest get request => _$args;

  int build(HostPeopleRequest request);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<int, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<int, int>,
              int,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The first rows of the request's contact query, as a listener.

@ProviderFor(hostPeopleContacts)
final hostPeopleContactsProvider = HostPeopleContactsFamily._();

/// The first rows of the request's contact query, as a listener.

final class HostPeopleContactsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostContactWindow>,
          HostContactWindow,
          Stream<HostContactWindow>
        >
    with
        $FutureModifier<HostContactWindow>,
        $StreamProvider<HostContactWindow> {
  /// The first rows of the request's contact query, as a listener.
  HostPeopleContactsProvider._({
    required HostPeopleContactsFamily super.from,
    required (HostPeopleRequest, int) super.argument,
  }) : super(
         retry: null,
         name: r'hostPeopleContactsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleContactsHash();

  @override
  String toString() {
    return r'hostPeopleContactsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostContactWindow> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostContactWindow> create(Ref ref) {
    final argument = this.argument as (HostPeopleRequest, int);
    return hostPeopleContacts(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostPeopleContactsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPeopleContactsHash() =>
    r'810252e252285bd9a8ac8bd01403cf49f4250c74';

/// The first rows of the request's contact query, as a listener.

final class HostPeopleContactsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostContactWindow>,
          (HostPeopleRequest, int)
        > {
  HostPeopleContactsFamily._()
    : super(
        retry: null,
        name: r'hostPeopleContactsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The first rows of the request's contact query, as a listener.

  HostPeopleContactsProvider call(HostPeopleRequest request, int limit) =>
      HostPeopleContactsProvider._(argument: (request, limit), from: this);

  @override
  String toString() => r'hostPeopleContactsProvider';
}

/// The People list's contacts, most recent first (by name for a search),
/// live: a contact the server adds, changes or removes shows at once, and
/// the list opens offline from the device cache.

@ProviderFor(HostPeopleDirectory)
final hostPeopleDirectoryProvider = HostPeopleDirectoryFamily._();

/// The People list's contacts, most recent first (by name for a search),
/// live: a contact the server adds, changes or removes shows at once, and
/// the list opens offline from the device cache.
final class HostPeopleDirectoryProvider
    extends
        $AsyncNotifierProvider<HostPeopleDirectory, HostPeopleDirectoryPage> {
  /// The People list's contacts, most recent first (by name for a search),
  /// live: a contact the server adds, changes or removes shows at once, and
  /// the list opens offline from the device cache.
  HostPeopleDirectoryProvider._({
    required HostPeopleDirectoryFamily super.from,
    required HostPeopleRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostPeopleDirectoryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleDirectoryHash();

  @override
  String toString() {
    return r'hostPeopleDirectoryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostPeopleDirectory create() => HostPeopleDirectory();

  @override
  bool operator ==(Object other) {
    return other is HostPeopleDirectoryProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPeopleDirectoryHash() =>
    r'a476adff620d1f10f40c19ab5a4b0dab56a9f5aa';

/// The People list's contacts, most recent first (by name for a search),
/// live: a contact the server adds, changes or removes shows at once, and
/// the list opens offline from the device cache.

final class HostPeopleDirectoryFamily extends $Family
    with
        $ClassFamilyOverride<
          HostPeopleDirectory,
          AsyncValue<HostPeopleDirectoryPage>,
          HostPeopleDirectoryPage,
          FutureOr<HostPeopleDirectoryPage>,
          HostPeopleRequest
        > {
  HostPeopleDirectoryFamily._()
    : super(
        retry: null,
        name: r'hostPeopleDirectoryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The People list's contacts, most recent first (by name for a search),
  /// live: a contact the server adds, changes or removes shows at once, and
  /// the list opens offline from the device cache.

  HostPeopleDirectoryProvider call(HostPeopleRequest request) =>
      HostPeopleDirectoryProvider._(argument: request, from: this);

  @override
  String toString() => r'hostPeopleDirectoryProvider';
}

/// The People list's contacts, most recent first (by name for a search),
/// live: a contact the server adds, changes or removes shows at once, and
/// the list opens offline from the device cache.

abstract class _$HostPeopleDirectory
    extends $AsyncNotifier<HostPeopleDirectoryPage> {
  late final _$args = ref.$arg as HostPeopleRequest;
  HostPeopleRequest get request => _$args;

  FutureOr<HostPeopleDirectoryPage> build(HostPeopleRequest request);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostPeopleDirectoryPage>,
              HostPeopleDirectoryPage
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostPeopleDirectoryPage>,
                HostPeopleDirectoryPage
              >,
              AsyncValue<HostPeopleDirectoryPage>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// How many people one projection segment holds, from the live directory.

@ProviderFor(hostPeopleSegmentCount)
final hostPeopleSegmentCountProvider = HostPeopleSegmentCountFamily._();

/// How many people one projection segment holds, from the live directory.

final class HostPeopleSegmentCountProvider
    extends $FunctionalProvider<AsyncValue<int>, int, FutureOr<int>>
    with $FutureModifier<int>, $FutureProvider<int> {
  /// How many people one projection segment holds, from the live directory.
  HostPeopleSegmentCountProvider._({
    required HostPeopleSegmentCountFamily super.from,
    required (String, HostAudienceSegment) super.argument,
  }) : super(
         retry: null,
         name: r'hostPeopleSegmentCountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleSegmentCountHash();

  @override
  String toString() {
    return r'hostPeopleSegmentCountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<int> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<int> create(Ref ref) {
    final argument = this.argument as (String, HostAudienceSegment);
    return hostPeopleSegmentCount(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostPeopleSegmentCountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPeopleSegmentCountHash() =>
    r'3489bd553b5449edff4a1c8b7fdaba301cd58922';

/// How many people one projection segment holds, from the live directory.

final class HostPeopleSegmentCountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<int>,
          (String, HostAudienceSegment)
        > {
  HostPeopleSegmentCountFamily._()
    : super(
        retry: null,
        name: r'hostPeopleSegmentCountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// How many people one projection segment holds, from the live directory.

  HostPeopleSegmentCountProvider call(
    String organizerId,
    HostAudienceSegment segment,
  ) => HostPeopleSegmentCountProvider._(
    argument: (organizerId, segment),
    from: this,
  );

  @override
  String toString() => r'hostPeopleSegmentCountProvider';
}

/// The People list, composed from the CRM summary (everyone), the segment
/// counts, the saved group directory and the contact directory.

@ProviderFor(hostPeopleController)
final hostPeopleControllerProvider = HostPeopleControllerFamily._();

/// The People list, composed from the CRM summary (everyone), the segment
/// counts, the saved group directory and the contact directory.

final class HostPeopleControllerProvider
    extends
        $FunctionalProvider<HostPeopleState, HostPeopleState, HostPeopleState>
    with $Provider<HostPeopleState> {
  /// The People list, composed from the CRM summary (everyone), the segment
  /// counts, the saved group directory and the contact directory.
  HostPeopleControllerProvider._({
    required HostPeopleControllerFamily super.from,
    required HostPeopleRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostPeopleControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleControllerHash();

  @override
  String toString() {
    return r'hostPeopleControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostPeopleState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HostPeopleState create(Ref ref) {
    final argument = this.argument as HostPeopleRequest;
    return hostPeopleController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostPeopleState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostPeopleState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostPeopleControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPeopleControllerHash() =>
    r'7f876cd5cf05e1d3e3110b3bf677c63e518b7781';

/// The People list, composed from the CRM summary (everyone), the segment
/// counts, the saved group directory and the contact directory.

final class HostPeopleControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostPeopleState, HostPeopleRequest> {
  HostPeopleControllerFamily._()
    : super(
        retry: null,
        name: r'hostPeopleControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The People list, composed from the CRM summary (everyone), the segment
  /// counts, the saved group directory and the contact directory.

  HostPeopleControllerProvider call(HostPeopleRequest request) =>
      HostPeopleControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostPeopleControllerProvider';
}
