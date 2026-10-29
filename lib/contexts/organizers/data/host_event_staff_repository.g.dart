// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_staff_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostEventStaffRepository)
final hostEventStaffRepositoryProvider = HostEventStaffRepositoryProvider._();

final class HostEventStaffRepositoryProvider
    extends
        $FunctionalProvider<
          HostEventStaffRepository,
          HostEventStaffRepository,
          HostEventStaffRepository
        >
    with $Provider<HostEventStaffRepository> {
  HostEventStaffRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventStaffRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventStaffRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostEventStaffRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventStaffRepository create(Ref ref) {
    return hostEventStaffRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventStaffRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventStaffRepository>(value),
    );
  }
}

String _$hostEventStaffRepositoryHash() =>
    r'008915ab0a462827a18dfb85afaa337ba5e0fbd3';

@ProviderFor(hostEventOperatorAccess)
final hostEventOperatorAccessProvider = HostEventOperatorAccessFamily._();

final class HostEventOperatorAccessProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostEventOperatorAccess>,
          HostEventOperatorAccess,
          FutureOr<HostEventOperatorAccess>
        >
    with
        $FutureModifier<HostEventOperatorAccess>,
        $FutureProvider<HostEventOperatorAccess> {
  HostEventOperatorAccessProvider._({
    required HostEventOperatorAccessFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostEventOperatorAccessProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventOperatorAccessHash();

  @override
  String toString() {
    return r'hostEventOperatorAccessProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostEventOperatorAccess> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostEventOperatorAccess> create(Ref ref) {
    final argument = this.argument as String;
    return hostEventOperatorAccess(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventOperatorAccessProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventOperatorAccessHash() =>
    r'6312605c77fa7b16f5b9b9dcdea81ee066c3ae52';

final class HostEventOperatorAccessFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostEventOperatorAccess>, String> {
  HostEventOperatorAccessFamily._()
    : super(
        retry: null,
        name: r'hostEventOperatorAccessProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostEventOperatorAccessProvider call(String eventId) =>
      HostEventOperatorAccessProvider._(argument: eventId, from: this);

  @override
  String toString() => r'hostEventOperatorAccessProvider';
}
