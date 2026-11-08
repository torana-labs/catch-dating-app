// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'formats_plan_actions.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The two plan writes the formats screens make that the live guide's
/// controller has no method for: the court setup and the first-hello
/// switch. Both are the guide's own plan save, fenced on the plan's last
/// update; neither is a new backend command.
///
/// Every other formats action runs through the existing controllers:
/// rotations, pods, the reveal and the grouping rules through
/// `EventSuccessController`, runner moves through
/// `EventAssistanceMembershipController` and the crawl message through
/// `HostComposeCommands`.

@ProviderFor(HostFormatsCommands)
final hostFormatsCommandsProvider = HostFormatsCommandsProvider._();

/// The two plan writes the formats screens make that the live guide's
/// controller has no method for: the court setup and the first-hello
/// switch. Both are the guide's own plan save, fenced on the plan's last
/// update; neither is a new backend command.
///
/// Every other formats action runs through the existing controllers:
/// rotations, pods, the reveal and the grouping rules through
/// `EventSuccessController`, runner moves through
/// `EventAssistanceMembershipController` and the crawl message through
/// `HostComposeCommands`.
final class HostFormatsCommandsProvider
    extends $NotifierProvider<HostFormatsCommands, void> {
  /// The two plan writes the formats screens make that the live guide's
  /// controller has no method for: the court setup and the first-hello
  /// switch. Both are the guide's own plan save, fenced on the plan's last
  /// update; neither is a new backend command.
  ///
  /// Every other formats action runs through the existing controllers:
  /// rotations, pods, the reveal and the grouping rules through
  /// `EventSuccessController`, runner moves through
  /// `EventAssistanceMembershipController` and the crawl message through
  /// `HostComposeCommands`.
  HostFormatsCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostFormatsCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsCommandsHash();

  @$internal
  @override
  HostFormatsCommands create() => HostFormatsCommands();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostFormatsCommandsHash() =>
    r'e5d820a37a37795794275f03320018f82adf54d6';

/// The two plan writes the formats screens make that the live guide's
/// controller has no method for: the court setup and the first-hello
/// switch. Both are the guide's own plan save, fenced on the plan's last
/// update; neither is a new backend command.
///
/// Every other formats action runs through the existing controllers:
/// rotations, pods, the reveal and the grouping rules through
/// `EventSuccessController`, runner moves through
/// `EventAssistanceMembershipController` and the crawl message through
/// `HostComposeCommands`.

abstract class _$HostFormatsCommands extends $Notifier<void> {
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
