// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_guest_safety_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerGuestSafetyRepository)
final organizerGuestSafetyRepositoryProvider =
    OrganizerGuestSafetyRepositoryProvider._();

final class OrganizerGuestSafetyRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerGuestSafetyRepository,
          OrganizerGuestSafetyRepository,
          OrganizerGuestSafetyRepository
        >
    with $Provider<OrganizerGuestSafetyRepository> {
  OrganizerGuestSafetyRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerGuestSafetyRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerGuestSafetyRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerGuestSafetyRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerGuestSafetyRepository create(Ref ref) {
    return organizerGuestSafetyRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerGuestSafetyRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerGuestSafetyRepository>(
        value,
      ),
    );
  }
}

String _$organizerGuestSafetyRepositoryHash() =>
    r'f54446fb338036fabacd9e92eaa77ec825e8e779';

/// Who the organiser has stopped booking their events, newest first.

@ProviderFor(organizerGuestBlocks)
final organizerGuestBlocksProvider = OrganizerGuestBlocksFamily._();

/// Who the organiser has stopped booking their events, newest first.

final class OrganizerGuestBlocksProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerGuestBlock>>,
          List<OrganizerGuestBlock>,
          FutureOr<List<OrganizerGuestBlock>>
        >
    with
        $FutureModifier<List<OrganizerGuestBlock>>,
        $FutureProvider<List<OrganizerGuestBlock>> {
  /// Who the organiser has stopped booking their events, newest first.
  OrganizerGuestBlocksProvider._({
    required OrganizerGuestBlocksFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'organizerGuestBlocksProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerGuestBlocksHash();

  @override
  String toString() {
    return r'organizerGuestBlocksProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<OrganizerGuestBlock>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<OrganizerGuestBlock>> create(Ref ref) {
    final argument = this.argument as String;
    return organizerGuestBlocks(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerGuestBlocksProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerGuestBlocksHash() =>
    r'cc1fc0b8ea351adff4ecddee0dff42ebb893a115';

/// Who the organiser has stopped booking their events, newest first.

final class OrganizerGuestBlocksFamily extends $Family
    with
        $FunctionalFamilyOverride<FutureOr<List<OrganizerGuestBlock>>, String> {
  OrganizerGuestBlocksFamily._()
    : super(
        retry: null,
        name: r'organizerGuestBlocksProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Who the organiser has stopped booking their events, newest first.

  OrganizerGuestBlocksProvider call(String organizerId) =>
      OrganizerGuestBlocksProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'organizerGuestBlocksProvider';
}
