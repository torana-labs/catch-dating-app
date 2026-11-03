// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_today_feed_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(HostTodayFeedController)
final hostTodayFeedControllerProvider = HostTodayFeedControllerFamily._();

final class HostTodayFeedControllerProvider
    extends $AsyncNotifierProvider<HostTodayFeedController, HostTodayFeedData> {
  HostTodayFeedControllerProvider._({
    required HostTodayFeedControllerFamily super.from,
    required HostTodayFeedRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostTodayFeedControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostTodayFeedControllerHash();

  @override
  String toString() {
    return r'hostTodayFeedControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostTodayFeedController create() => HostTodayFeedController();

  @override
  bool operator ==(Object other) {
    return other is HostTodayFeedControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostTodayFeedControllerHash() =>
    r'1b48c36a473362e27a78c19c5c6c779a911d53f7';

final class HostTodayFeedControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostTodayFeedController,
          AsyncValue<HostTodayFeedData>,
          HostTodayFeedData,
          FutureOr<HostTodayFeedData>,
          HostTodayFeedRequest
        > {
  HostTodayFeedControllerFamily._()
    : super(
        retry: null,
        name: r'hostTodayFeedControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostTodayFeedControllerProvider call(HostTodayFeedRequest request) =>
      HostTodayFeedControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostTodayFeedControllerProvider';
}

abstract class _$HostTodayFeedController
    extends $AsyncNotifier<HostTodayFeedData> {
  late final _$args = ref.$arg as HostTodayFeedRequest;
  HostTodayFeedRequest get request => _$args;

  FutureOr<HostTodayFeedData> build(HostTodayFeedRequest request);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<HostTodayFeedData>, HostTodayFeedData>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<HostTodayFeedData>, HostTodayFeedData>,
              AsyncValue<HostTodayFeedData>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
