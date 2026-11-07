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

/// The existing contact directory read, one page at a time, most recent
/// first.

@ProviderFor(HostPeopleDirectory)
final hostPeopleDirectoryProvider = HostPeopleDirectoryFamily._();

/// The existing contact directory read, one page at a time, most recent
/// first.
final class HostPeopleDirectoryProvider
    extends
        $AsyncNotifierProvider<HostPeopleDirectory, HostPeopleDirectoryPage> {
  /// The existing contact directory read, one page at a time, most recent
  /// first.
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
    r'948937f79106268d1aff20b530fd1460940dd7e1';

/// The existing contact directory read, one page at a time, most recent
/// first.

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

  /// The existing contact directory read, one page at a time, most recent
  /// first.

  HostPeopleDirectoryProvider call(HostPeopleRequest request) =>
      HostPeopleDirectoryProvider._(argument: request, from: this);

  @override
  String toString() => r'hostPeopleDirectoryProvider';
}

/// The existing contact directory read, one page at a time, most recent
/// first.

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

/// How many people one projection segment holds.

@ProviderFor(hostPeopleSegmentCount)
final hostPeopleSegmentCountProvider = HostPeopleSegmentCountFamily._();

/// How many people one projection segment holds.

final class HostPeopleSegmentCountProvider
    extends $FunctionalProvider<AsyncValue<int>, int, FutureOr<int>>
    with $FutureModifier<int>, $FutureProvider<int> {
  /// How many people one projection segment holds.
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
    r'2bb86503c4a8d543305ca230edd3c7976a999a6a';

/// How many people one projection segment holds.

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

  /// How many people one projection segment holds.

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
    r'eacaf2e3e6a14325eda01b16341b3d71d025e1bc';

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
