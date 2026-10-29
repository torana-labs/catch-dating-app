// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_roster_intake_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostRosterIntakeRepository)
final hostRosterIntakeRepositoryProvider =
    HostRosterIntakeRepositoryProvider._();

final class HostRosterIntakeRepositoryProvider
    extends
        $FunctionalProvider<
          HostRosterIntakeRepository,
          HostRosterIntakeRepository,
          HostRosterIntakeRepository
        >
    with $Provider<HostRosterIntakeRepository> {
  HostRosterIntakeRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostRosterIntakeRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostRosterIntakeRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostRosterIntakeRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostRosterIntakeRepository create(Ref ref) {
    return hostRosterIntakeRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostRosterIntakeRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostRosterIntakeRepository>(value),
    );
  }
}

String _$hostRosterIntakeRepositoryHash() =>
    r'863d25eb4e235f388ba1958ce24d4dcdb5d1733d';
