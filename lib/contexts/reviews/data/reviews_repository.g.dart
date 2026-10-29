// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reviews_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(reviewsRepository)
final reviewsRepositoryProvider = ReviewsRepositoryProvider._();

final class ReviewsRepositoryProvider
    extends
        $FunctionalProvider<
          ReviewsRepository,
          ReviewsRepository,
          ReviewsRepository
        >
    with $Provider<ReviewsRepository> {
  ReviewsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'reviewsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$reviewsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ReviewsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ReviewsRepository create(Ref ref) {
    return reviewsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ReviewsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ReviewsRepository>(value),
    );
  }
}

String _$reviewsRepositoryHash() => r'52bee368d4158266dbf1c124ad53707143c1958b';

@ProviderFor(watchReviewsForClub)
final watchReviewsForClubProvider = WatchReviewsForClubFamily._();

final class WatchReviewsForClubProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Review>>,
          List<Review>,
          Stream<List<Review>>
        >
    with $FutureModifier<List<Review>>, $StreamProvider<List<Review>> {
  WatchReviewsForClubProvider._({
    required WatchReviewsForClubFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchReviewsForClubProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchReviewsForClubHash();

  @override
  String toString() {
    return r'watchReviewsForClubProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Review>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Review>> create(Ref ref) {
    final argument = this.argument as String;
    return watchReviewsForClub(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchReviewsForClubProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchReviewsForClubHash() =>
    r'2777391bdfaca2d675d1da30fcb68d2565743582';

final class WatchReviewsForClubFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Review>>, String> {
  WatchReviewsForClubFamily._()
    : super(
        retry: null,
        name: r'watchReviewsForClubProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchReviewsForClubProvider call(String clubId) =>
      WatchReviewsForClubProvider._(argument: clubId, from: this);

  @override
  String toString() => r'watchReviewsForClubProvider';
}

@ProviderFor(watchReviewsForEvent)
final watchReviewsForEventProvider = WatchReviewsForEventFamily._();

final class WatchReviewsForEventProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Review>>,
          List<Review>,
          Stream<List<Review>>
        >
    with $FutureModifier<List<Review>>, $StreamProvider<List<Review>> {
  WatchReviewsForEventProvider._({
    required WatchReviewsForEventFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchReviewsForEventProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchReviewsForEventHash();

  @override
  String toString() {
    return r'watchReviewsForEventProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Review>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Review>> create(Ref ref) {
    final argument = this.argument as String;
    return watchReviewsForEvent(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchReviewsForEventProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchReviewsForEventHash() =>
    r'433a7bcb93e2998aa1cd4e1e58ae6a4c758e30b0';

final class WatchReviewsForEventFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Review>>, String> {
  WatchReviewsForEventFamily._()
    : super(
        retry: null,
        name: r'watchReviewsForEventProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchReviewsForEventProvider call(String eventId) =>
      WatchReviewsForEventProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchReviewsForEventProvider';
}

@ProviderFor(watchReviewsByUser)
final watchReviewsByUserProvider = WatchReviewsByUserFamily._();

final class WatchReviewsByUserProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Review>>,
          List<Review>,
          Stream<List<Review>>
        >
    with $FutureModifier<List<Review>>, $StreamProvider<List<Review>> {
  WatchReviewsByUserProvider._({
    required WatchReviewsByUserFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchReviewsByUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchReviewsByUserHash();

  @override
  String toString() {
    return r'watchReviewsByUserProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Review>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Review>> create(Ref ref) {
    final argument = this.argument as String;
    return watchReviewsByUser(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchReviewsByUserProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchReviewsByUserHash() =>
    r'825043f2c5c6f2b83717e2a2e2b5e25ee78696b2';

final class WatchReviewsByUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Review>>, String> {
  WatchReviewsByUserFamily._()
    : super(
        retry: null,
        name: r'watchReviewsByUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchReviewsByUserProvider call(String reviewerUserId) =>
      WatchReviewsByUserProvider._(argument: reviewerUserId, from: this);

  @override
  String toString() => r'watchReviewsByUserProvider';
}

@ProviderFor(watchUserReviewForEvent)
final watchUserReviewForEventProvider = WatchUserReviewForEventFamily._();

final class WatchUserReviewForEventProvider
    extends $FunctionalProvider<AsyncValue<Review?>, Review?, Stream<Review?>>
    with $FutureModifier<Review?>, $StreamProvider<Review?> {
  WatchUserReviewForEventProvider._({
    required WatchUserReviewForEventFamily super.from,
    required ({String eventId, String reviewerUserId}) super.argument,
  }) : super(
         retry: null,
         name: r'watchUserReviewForEventProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchUserReviewForEventHash();

  @override
  String toString() {
    return r'watchUserReviewForEventProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<Review?> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<Review?> create(Ref ref) {
    final argument = this.argument as ({String eventId, String reviewerUserId});
    return watchUserReviewForEvent(
      ref,
      eventId: argument.eventId,
      reviewerUserId: argument.reviewerUserId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WatchUserReviewForEventProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchUserReviewForEventHash() =>
    r'5c191a076a8dabba67458a9a2ed9caa37cde4384';

final class WatchUserReviewForEventFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<Review?>,
          ({String eventId, String reviewerUserId})
        > {
  WatchUserReviewForEventFamily._()
    : super(
        retry: null,
        name: r'watchUserReviewForEventProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchUserReviewForEventProvider call({
    required String eventId,
    required String reviewerUserId,
  }) => WatchUserReviewForEventProvider._(
    argument: (eventId: eventId, reviewerUserId: reviewerUserId),
    from: this,
  );

  @override
  String toString() => r'watchUserReviewForEventProvider';
}
