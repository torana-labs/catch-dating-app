// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_detail_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern D: View-model provider**
///
/// Watches the club, events, reviews, user profile, and auth streams and
/// combines them into a single [OrganizerDetailViewModel].
///
/// Club, events, and auth identity are blocking because they control the main
/// route and schedule. Reviews, profile, and membership state are secondary;
/// they hydrate the detail screen when available without hiding newly-created
/// events behind the route's placeholder body.
// provider-graph: high-fan-out:organizerDetailViewModelProvider accepted -- One organizer page read: the organizer, its events, reviews, the viewer's identity, profile and follow, and the screen clock that decides which events are upcoming, so a capture or test can fix the time.

@ProviderFor(organizerDetailViewModel)
final organizerDetailViewModelProvider = OrganizerDetailViewModelFamily._();

/// **Pattern D: View-model provider**
///
/// Watches the club, events, reviews, user profile, and auth streams and
/// combines them into a single [OrganizerDetailViewModel].
///
/// Club, events, and auth identity are blocking because they control the main
/// route and schedule. Reviews, profile, and membership state are secondary;
/// they hydrate the detail screen when available without hiding newly-created
/// events behind the route's placeholder body.
// provider-graph: high-fan-out:organizerDetailViewModelProvider accepted -- One organizer page read: the organizer, its events, reviews, the viewer's identity, profile and follow, and the screen clock that decides which events are upcoming, so a capture or test can fix the time.

final class OrganizerDetailViewModelProvider
    extends
        $FunctionalProvider<
          AsyncValue<OrganizerDetailViewModel?>,
          AsyncValue<OrganizerDetailViewModel?>,
          AsyncValue<OrganizerDetailViewModel?>
        >
    with $Provider<AsyncValue<OrganizerDetailViewModel?>> {
  /// **Pattern D: View-model provider**
  ///
  /// Watches the club, events, reviews, user profile, and auth streams and
  /// combines them into a single [OrganizerDetailViewModel].
  ///
  /// Club, events, and auth identity are blocking because they control the main
  /// route and schedule. Reviews, profile, and membership state are secondary;
  /// they hydrate the detail screen when available without hiding newly-created
  /// events behind the route's placeholder body.
  // provider-graph: high-fan-out:organizerDetailViewModelProvider accepted -- One organizer page read: the organizer, its events, reviews, the viewer's identity, profile and follow, and the screen clock that decides which events are upcoming, so a capture or test can fix the time.
  OrganizerDetailViewModelProvider._({
    required OrganizerDetailViewModelFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'organizerDetailViewModelProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerDetailViewModelHash();

  @override
  String toString() {
    return r'organizerDetailViewModelProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<AsyncValue<OrganizerDetailViewModel?>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<OrganizerDetailViewModel?> create(Ref ref) {
    final argument = this.argument as String;
    return organizerDetailViewModel(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<OrganizerDetailViewModel?> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<OrganizerDetailViewModel?>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerDetailViewModelProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerDetailViewModelHash() =>
    r'9c33c925684ae043757a7fd3c3848bf1dacf15fc';

/// **Pattern D: View-model provider**
///
/// Watches the club, events, reviews, user profile, and auth streams and
/// combines them into a single [OrganizerDetailViewModel].
///
/// Club, events, and auth identity are blocking because they control the main
/// route and schedule. Reviews, profile, and membership state are secondary;
/// they hydrate the detail screen when available without hiding newly-created
/// events behind the route's placeholder body.
// provider-graph: high-fan-out:organizerDetailViewModelProvider accepted -- One organizer page read: the organizer, its events, reviews, the viewer's identity, profile and follow, and the screen clock that decides which events are upcoming, so a capture or test can fix the time.

final class OrganizerDetailViewModelFamily extends $Family
    with
        $FunctionalFamilyOverride<
          AsyncValue<OrganizerDetailViewModel?>,
          String
        > {
  OrganizerDetailViewModelFamily._()
    : super(
        retry: null,
        name: r'organizerDetailViewModelProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// **Pattern D: View-model provider**
  ///
  /// Watches the club, events, reviews, user profile, and auth streams and
  /// combines them into a single [OrganizerDetailViewModel].
  ///
  /// Club, events, and auth identity are blocking because they control the main
  /// route and schedule. Reviews, profile, and membership state are secondary;
  /// they hydrate the detail screen when available without hiding newly-created
  /// events behind the route's placeholder body.
  // provider-graph: high-fan-out:organizerDetailViewModelProvider accepted -- One organizer page read: the organizer, its events, reviews, the viewer's identity, profile and follow, and the screen clock that decides which events are upcoming, so a capture or test can fix the time.

  OrganizerDetailViewModelProvider call(String organizerId) =>
      OrganizerDetailViewModelProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'organizerDetailViewModelProvider';
}
