// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'safety_notice_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(safetyNoticeRepository)
final safetyNoticeRepositoryProvider = SafetyNoticeRepositoryProvider._();

final class SafetyNoticeRepositoryProvider
    extends
        $FunctionalProvider<
          SafetyNoticeRepository,
          SafetyNoticeRepository,
          SafetyNoticeRepository
        >
    with $Provider<SafetyNoticeRepository> {
  SafetyNoticeRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'safetyNoticeRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$safetyNoticeRepositoryHash();

  @$internal
  @override
  $ProviderElement<SafetyNoticeRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  SafetyNoticeRepository create(Ref ref) {
    return safetyNoticeRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SafetyNoticeRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SafetyNoticeRepository>(value),
    );
  }
}

String _$safetyNoticeRepositoryHash() =>
    r'84df9f8e34cb84681906ecb5215962610f84fcc2';

@ProviderFor(watchSafetyNotices)
final watchSafetyNoticesProvider = WatchSafetyNoticesFamily._();

final class WatchSafetyNoticesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<SafetyNotice>>,
          List<SafetyNotice>,
          Stream<List<SafetyNotice>>
        >
    with
        $FutureModifier<List<SafetyNotice>>,
        $StreamProvider<List<SafetyNotice>> {
  WatchSafetyNoticesProvider._({
    required WatchSafetyNoticesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchSafetyNoticesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchSafetyNoticesHash();

  @override
  String toString() {
    return r'watchSafetyNoticesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<SafetyNotice>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<SafetyNotice>> create(Ref ref) {
    final argument = this.argument as String;
    return watchSafetyNotices(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchSafetyNoticesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchSafetyNoticesHash() =>
    r'f29974fceaaf70e8b841655d392374d6900bf3f2';

final class WatchSafetyNoticesFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<SafetyNotice>>, String> {
  WatchSafetyNoticesFamily._()
    : super(
        retry: null,
        name: r'watchSafetyNoticesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchSafetyNoticesProvider call(String uid) =>
      WatchSafetyNoticesProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchSafetyNoticesProvider';
}
