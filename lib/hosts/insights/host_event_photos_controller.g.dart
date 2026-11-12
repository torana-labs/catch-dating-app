// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_photos_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The host team's photos for one event's checked-in guests: the shared
/// album, picking several photos at once, per-photo upload progress, retry,
/// and removing a shared photo.
///
/// Uploads run one at a time so progress reads in order and a slow network
/// is not split across several files.

@ProviderFor(HostEventPhotosController)
final hostEventPhotosControllerProvider = HostEventPhotosControllerFamily._();

/// The host team's photos for one event's checked-in guests: the shared
/// album, picking several photos at once, per-photo upload progress, retry,
/// and removing a shared photo.
///
/// Uploads run one at a time so progress reads in order and a slow network
/// is not split across several files.
final class HostEventPhotosControllerProvider
    extends
        $AsyncNotifierProvider<
          HostEventPhotosController,
          HostEventPhotosState
        > {
  /// The host team's photos for one event's checked-in guests: the shared
  /// album, picking several photos at once, per-photo upload progress, retry,
  /// and removing a shared photo.
  ///
  /// Uploads run one at a time so progress reads in order and a slow network
  /// is not split across several files.
  HostEventPhotosControllerProvider._({
    required HostEventPhotosControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostEventPhotosControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventPhotosControllerHash();

  @override
  String toString() {
    return r'hostEventPhotosControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostEventPhotosController create() => HostEventPhotosController();

  @override
  bool operator ==(Object other) {
    return other is HostEventPhotosControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventPhotosControllerHash() =>
    r'1b4bca8e23f70f9f594093786aefd651ec54df40';

/// The host team's photos for one event's checked-in guests: the shared
/// album, picking several photos at once, per-photo upload progress, retry,
/// and removing a shared photo.
///
/// Uploads run one at a time so progress reads in order and a slow network
/// is not split across several files.

final class HostEventPhotosControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostEventPhotosController,
          AsyncValue<HostEventPhotosState>,
          HostEventPhotosState,
          FutureOr<HostEventPhotosState>,
          String
        > {
  HostEventPhotosControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventPhotosControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The host team's photos for one event's checked-in guests: the shared
  /// album, picking several photos at once, per-photo upload progress, retry,
  /// and removing a shared photo.
  ///
  /// Uploads run one at a time so progress reads in order and a slow network
  /// is not split across several files.

  HostEventPhotosControllerProvider call(String eventId) =>
      HostEventPhotosControllerProvider._(argument: eventId, from: this);

  @override
  String toString() => r'hostEventPhotosControllerProvider';
}

/// The host team's photos for one event's checked-in guests: the shared
/// album, picking several photos at once, per-photo upload progress, retry,
/// and removing a shared photo.
///
/// Uploads run one at a time so progress reads in order and a slow network
/// is not split across several files.

abstract class _$HostEventPhotosController
    extends $AsyncNotifier<HostEventPhotosState> {
  late final _$args = ref.$arg as String;
  String get eventId => _$args;

  FutureOr<HostEventPhotosState> build(String eventId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<HostEventPhotosState>, HostEventPhotosState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostEventPhotosState>,
                HostEventPhotosState
              >,
              AsyncValue<HostEventPhotosState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
