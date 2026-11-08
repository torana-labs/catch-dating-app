// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'formats_crawl_commands_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Changing a crawl stop on the night and telling everyone booked: one
/// `changeEventCrawlStop` command under one request id. It does not
/// invalidate a read: the plan listener delivers the changed stop.

@ProviderFor(HostFormatsCrawlCommands)
final hostFormatsCrawlCommandsProvider = HostFormatsCrawlCommandsProvider._();

/// Changing a crawl stop on the night and telling everyone booked: one
/// `changeEventCrawlStop` command under one request id. It does not
/// invalidate a read: the plan listener delivers the changed stop.
final class HostFormatsCrawlCommandsProvider
    extends $NotifierProvider<HostFormatsCrawlCommands, void> {
  /// Changing a crawl stop on the night and telling everyone booked: one
  /// `changeEventCrawlStop` command under one request id. It does not
  /// invalidate a read: the plan listener delivers the changed stop.
  HostFormatsCrawlCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostFormatsCrawlCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsCrawlCommandsHash();

  @$internal
  @override
  HostFormatsCrawlCommands create() => HostFormatsCrawlCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostFormatsCrawlCommandsHash() =>
    r'8ad9a0b842dbb0622f896fe0a0842c25abc5e19a';

/// Changing a crawl stop on the night and telling everyone booked: one
/// `changeEventCrawlStop` command under one request id. It does not
/// invalidate a read: the plan listener delivers the changed stop.

abstract class _$HostFormatsCrawlCommands extends $Notifier<void> {
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
