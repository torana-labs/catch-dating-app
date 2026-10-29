// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'activity_notification_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(activityNotificationRepository)
final activityNotificationRepositoryProvider =
    ActivityNotificationRepositoryProvider._();

final class ActivityNotificationRepositoryProvider
    extends
        $FunctionalProvider<
          ActivityNotificationRepository,
          ActivityNotificationRepository,
          ActivityNotificationRepository
        >
    with $Provider<ActivityNotificationRepository> {
  ActivityNotificationRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'activityNotificationRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$activityNotificationRepositoryHash();

  @$internal
  @override
  $ProviderElement<ActivityNotificationRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ActivityNotificationRepository create(Ref ref) {
    return activityNotificationRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ActivityNotificationRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ActivityNotificationRepository>(
        value,
      ),
    );
  }
}

String _$activityNotificationRepositoryHash() =>
    r'13dd20ca74ec5649f7d41d3b189c8183d0f2232f';

@ProviderFor(watchActivityNotifications)
final watchActivityNotificationsProvider = WatchActivityNotificationsFamily._();

final class WatchActivityNotificationsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ActivityNotification>>,
          List<ActivityNotification>,
          Stream<List<ActivityNotification>>
        >
    with
        $FutureModifier<List<ActivityNotification>>,
        $StreamProvider<List<ActivityNotification>> {
  WatchActivityNotificationsProvider._({
    required WatchActivityNotificationsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchActivityNotificationsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchActivityNotificationsHash();

  @override
  String toString() {
    return r'watchActivityNotificationsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<ActivityNotification>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<ActivityNotification>> create(Ref ref) {
    final argument = this.argument as String;
    return watchActivityNotifications(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchActivityNotificationsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchActivityNotificationsHash() =>
    r'f04a4d108a105b921bd73261100ab236dd8caa17';

final class WatchActivityNotificationsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<ActivityNotification>>, String> {
  WatchActivityNotificationsFamily._()
    : super(
        retry: null,
        name: r'watchActivityNotificationsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchActivityNotificationsProvider call(String uid) =>
      WatchActivityNotificationsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchActivityNotificationsProvider';
}
