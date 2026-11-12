// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'formats_crawl_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The crawl board, composed from the event's route, the plan listener
/// (stops changed on the night) and the guest list listener: who is with
/// the crawl (checked in), the arrival groups and who has not joined yet.
/// Nothing polls.

@ProviderFor(hostFormatsCrawlController)
final hostFormatsCrawlControllerProvider = HostFormatsCrawlControllerFamily._();

/// The crawl board, composed from the event's route, the plan listener
/// (stops changed on the night) and the guest list listener: who is with
/// the crawl (checked in), the arrival groups and who has not joined yet.
/// Nothing polls.

final class HostFormatsCrawlControllerProvider
    extends
        $FunctionalProvider<
          HostFormatsCrawlState,
          HostFormatsCrawlState,
          HostFormatsCrawlState
        >
    with $Provider<HostFormatsCrawlState> {
  /// The crawl board, composed from the event's route, the plan listener
  /// (stops changed on the night) and the guest list listener: who is with
  /// the crawl (checked in), the arrival groups and who has not joined yet.
  /// Nothing polls.
  HostFormatsCrawlControllerProvider._({
    required HostFormatsCrawlControllerFamily super.from,
    required (Organizer, Event) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormatsCrawlControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsCrawlControllerHash();

  @override
  String toString() {
    return r'hostFormatsCrawlControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<HostFormatsCrawlState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormatsCrawlState create(Ref ref) {
    final argument = this.argument as (Organizer, Event);
    return hostFormatsCrawlController(ref, argument.$1, argument.$2);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormatsCrawlState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormatsCrawlState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormatsCrawlControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormatsCrawlControllerHash() =>
    r'9ceb2eb8a5b85502e699f8a660f9f22ae600ad03';

/// The crawl board, composed from the event's route, the plan listener
/// (stops changed on the night) and the guest list listener: who is with
/// the crawl (checked in), the arrival groups and who has not joined yet.
/// Nothing polls.

final class HostFormatsCrawlControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostFormatsCrawlState, (Organizer, Event)> {
  HostFormatsCrawlControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormatsCrawlControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The crawl board, composed from the event's route, the plan listener
  /// (stops changed on the night) and the guest list listener: who is with
  /// the crawl (checked in), the arrival groups and who has not joined yet.
  /// Nothing polls.

  HostFormatsCrawlControllerProvider call(Organizer organizer, Event event) =>
      HostFormatsCrawlControllerProvider._(
        argument: (organizer, event),
        from: this,
      );

  @override
  String toString() => r'hostFormatsCrawlControllerProvider';
}
