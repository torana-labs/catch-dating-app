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

/// The request's contacts, a page at a time, every row shown live. Each
/// page is its own listener, so asking for more reads only the new page.

@ProviderFor(HostPeopleContactPages)
final hostPeopleContactPagesProvider = HostPeopleContactPagesFamily._();

/// The request's contacts, a page at a time, every row shown live. Each
/// page is its own listener, so asking for more reads only the new page.
final class HostPeopleContactPagesProvider
    extends
        $StreamNotifierProvider<
          HostPeopleContactPages,
          LivePages<HostAudienceContact>
        > {
  /// The request's contacts, a page at a time, every row shown live. Each
  /// page is its own listener, so asking for more reads only the new page.
  HostPeopleContactPagesProvider._({
    required HostPeopleContactPagesFamily super.from,
    required HostPeopleRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostPeopleContactPagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleContactPagesHash();

  @override
  String toString() {
    return r'hostPeopleContactPagesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostPeopleContactPages create() => HostPeopleContactPages();

  @override
  bool operator ==(Object other) {
    return other is HostPeopleContactPagesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPeopleContactPagesHash() =>
    r'6554e0348b165084d09c5a93a541a8def275f39d';

/// The request's contacts, a page at a time, every row shown live. Each
/// page is its own listener, so asking for more reads only the new page.

final class HostPeopleContactPagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostPeopleContactPages,
          AsyncValue<LivePages<HostAudienceContact>>,
          LivePages<HostAudienceContact>,
          Stream<LivePages<HostAudienceContact>>,
          HostPeopleRequest
        > {
  HostPeopleContactPagesFamily._()
    : super(
        retry: null,
        name: r'hostPeopleContactPagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The request's contacts, a page at a time, every row shown live. Each
  /// page is its own listener, so asking for more reads only the new page.

  HostPeopleContactPagesProvider call(HostPeopleRequest request) =>
      HostPeopleContactPagesProvider._(argument: request, from: this);

  @override
  String toString() => r'hostPeopleContactPagesProvider';
}

/// The request's contacts, a page at a time, every row shown live. Each
/// page is its own listener, so asking for more reads only the new page.

abstract class _$HostPeopleContactPages
    extends $StreamNotifier<LivePages<HostAudienceContact>> {
  late final _$args = ref.$arg as HostPeopleRequest;
  HostPeopleRequest get request => _$args;

  Stream<LivePages<HostAudienceContact>> build(HostPeopleRequest request);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<LivePages<HostAudienceContact>>,
              LivePages<HostAudienceContact>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<LivePages<HostAudienceContact>>,
                LivePages<HostAudienceContact>
              >,
              AsyncValue<LivePages<HostAudienceContact>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
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
    r'5b2918a8469b93a6508e593807736f2f2463bac1';

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
    r'fa208ac39cbb408ab242a30acb43bac1aa87f546';

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
