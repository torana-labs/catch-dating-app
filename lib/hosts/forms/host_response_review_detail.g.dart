// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_response_review_detail.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Joins authorized projections without manufacturing a response for imports.
/// A failed linked projection fails the detail closed instead of dropping actions.

@ProviderFor(hostResponseReviewDetail)
final hostResponseReviewDetailProvider = HostResponseReviewDetailFamily._();

/// Joins authorized projections without manufacturing a response for imports.
/// A failed linked projection fails the detail closed instead of dropping actions.

final class HostResponseReviewDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostResponseReviewDetail>,
          HostResponseReviewDetail,
          FutureOr<HostResponseReviewDetail>
        >
    with
        $FutureModifier<HostResponseReviewDetail>,
        $FutureProvider<HostResponseReviewDetail> {
  /// Joins authorized projections without manufacturing a response for imports.
  /// A failed linked projection fails the detail closed instead of dropping actions.
  HostResponseReviewDetailProvider._({
    required HostResponseReviewDetailFamily super.from,
    required HostResponseReviewKey super.argument,
  }) : super(
         retry: null,
         name: r'hostResponseReviewDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostResponseReviewDetailHash();

  @override
  String toString() {
    return r'hostResponseReviewDetailProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostResponseReviewDetail> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostResponseReviewDetail> create(Ref ref) {
    final argument = this.argument as HostResponseReviewKey;
    return hostResponseReviewDetail(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostResponseReviewDetailProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostResponseReviewDetailHash() =>
    r'7b7a8faf03d7b24eda3e1d98ba861e4339e8d21f';

/// Joins authorized projections without manufacturing a response for imports.
/// A failed linked projection fails the detail closed instead of dropping actions.

final class HostResponseReviewDetailFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostResponseReviewDetail>,
          HostResponseReviewKey
        > {
  HostResponseReviewDetailFamily._()
    : super(
        retry: null,
        name: r'hostResponseReviewDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Joins authorized projections without manufacturing a response for imports.
  /// A failed linked projection fails the detail closed instead of dropping actions.

  HostResponseReviewDetailProvider call(HostResponseReviewKey key) =>
      HostResponseReviewDetailProvider._(argument: key, from: this);

  @override
  String toString() => r'hostResponseReviewDetailProvider';
}
