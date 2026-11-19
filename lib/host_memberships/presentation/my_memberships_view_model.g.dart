// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'my_memberships_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// My memberships reads only the member's memberships: each carries the
/// savings total the server keeps from its member-priced bookings.

@ProviderFor(myMembershipsViewModel)
final myMembershipsViewModelProvider = MyMembershipsViewModelFamily._();

/// My memberships reads only the member's memberships: each carries the
/// savings total the server keeps from its member-priced bookings.

final class MyMembershipsViewModelProvider
    extends
        $FunctionalProvider<
          AsyncValue<MyMembershipsState>,
          MyMembershipsState,
          FutureOr<MyMembershipsState>
        >
    with
        $FutureModifier<MyMembershipsState>,
        $FutureProvider<MyMembershipsState> {
  /// My memberships reads only the member's memberships: each carries the
  /// savings total the server keeps from its member-priced bookings.
  MyMembershipsViewModelProvider._({
    required MyMembershipsViewModelFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'myMembershipsViewModelProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$myMembershipsViewModelHash();

  @override
  String toString() {
    return r'myMembershipsViewModelProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<MyMembershipsState> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<MyMembershipsState> create(Ref ref) {
    final argument = this.argument as String;
    return myMembershipsViewModel(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is MyMembershipsViewModelProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$myMembershipsViewModelHash() =>
    r'48f1463acd4b965b1755cf9616d63b855307f207';

/// My memberships reads only the member's memberships: each carries the
/// savings total the server keeps from its member-priced bookings.

final class MyMembershipsViewModelFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<MyMembershipsState>, String> {
  MyMembershipsViewModelFamily._()
    : super(
        retry: null,
        name: r'myMembershipsViewModelProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// My memberships reads only the member's memberships: each carries the
  /// savings total the server keeps from its member-priced bookings.

  MyMembershipsViewModelProvider call(String uid) =>
      MyMembershipsViewModelProvider._(argument: uid, from: this);

  @override
  String toString() => r'myMembershipsViewModelProvider';
}
