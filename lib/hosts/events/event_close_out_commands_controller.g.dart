// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_close_out_commands_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Close out the night through `setEventCloseOut`. It does not invalidate
/// a read: the close-out listener delivers the saved choices.

@ProviderFor(HostEventCloseOutCommands)
final hostEventCloseOutCommandsProvider = HostEventCloseOutCommandsProvider._();

/// Close out the night through `setEventCloseOut`. It does not invalidate
/// a read: the close-out listener delivers the saved choices.
final class HostEventCloseOutCommandsProvider
    extends $NotifierProvider<HostEventCloseOutCommands, void> {
  /// Close out the night through `setEventCloseOut`. It does not invalidate
  /// a read: the close-out listener delivers the saved choices.
  HostEventCloseOutCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventCloseOutCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventCloseOutCommandsHash();

  @$internal
  @override
  HostEventCloseOutCommands create() => HostEventCloseOutCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostEventCloseOutCommandsHash() =>
    r'e61d26fcb0000fad0819c76598f45fc5dc7f590f';

/// Close out the night through `setEventCloseOut`. It does not invalidate
/// a read: the close-out listener delivers the saved choices.

abstract class _$HostEventCloseOutCommands extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
