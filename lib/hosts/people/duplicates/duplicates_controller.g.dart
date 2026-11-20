// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'duplicates_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The organizer's duplicate review, a page at a time. Each command
/// refreshes it with [refreshHostDuplicates]; the people it names update
/// through their own listeners.

@ProviderFor(HostDuplicateReviewPages)
final hostDuplicateReviewPagesProvider = HostDuplicateReviewPagesFamily._();

/// The organizer's duplicate review, a page at a time. Each command
/// refreshes it with [refreshHostDuplicates]; the people it names update
/// through their own listeners.
final class HostDuplicateReviewPagesProvider
    extends
        $AsyncNotifierProvider<HostDuplicateReviewPages, HostDuplicateReview> {
  /// The organizer's duplicate review, a page at a time. Each command
  /// refreshes it with [refreshHostDuplicates]; the people it names update
  /// through their own listeners.
  HostDuplicateReviewPagesProvider._({
    required HostDuplicateReviewPagesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostDuplicateReviewPagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostDuplicateReviewPagesHash();

  @override
  String toString() {
    return r'hostDuplicateReviewPagesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostDuplicateReviewPages create() => HostDuplicateReviewPages();

  @override
  bool operator ==(Object other) {
    return other is HostDuplicateReviewPagesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostDuplicateReviewPagesHash() =>
    r'6c4c8347a9e471850b225c0ece2b1ba6067bacf6';

/// The organizer's duplicate review, a page at a time. Each command
/// refreshes it with [refreshHostDuplicates]; the people it names update
/// through their own listeners.

final class HostDuplicateReviewPagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostDuplicateReviewPages,
          AsyncValue<HostDuplicateReview>,
          HostDuplicateReview,
          FutureOr<HostDuplicateReview>,
          String
        > {
  HostDuplicateReviewPagesFamily._()
    : super(
        retry: null,
        name: r'hostDuplicateReviewPagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's duplicate review, a page at a time. Each command
  /// refreshes it with [refreshHostDuplicates]; the people it names update
  /// through their own listeners.

  HostDuplicateReviewPagesProvider call(String organizerId) =>
      HostDuplicateReviewPagesProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostDuplicateReviewPagesProvider';
}

/// The organizer's duplicate review, a page at a time. Each command
/// refreshes it with [refreshHostDuplicates]; the people it names update
/// through their own listeners.

abstract class _$HostDuplicateReviewPages
    extends $AsyncNotifier<HostDuplicateReview> {
  late final _$args = ref.$arg as String;
  String get organizerId => _$args;

  FutureOr<HostDuplicateReview> build(String organizerId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<HostDuplicateReview>, HostDuplicateReview>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<HostDuplicateReview>, HostDuplicateReview>,
              AsyncValue<HostDuplicateReview>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The duplicate review page for one of its two lists.

@ProviderFor(hostDuplicatesController)
final hostDuplicatesControllerProvider = HostDuplicatesControllerFamily._();

/// The duplicate review page for one of its two lists.

final class HostDuplicatesControllerProvider
    extends
        $FunctionalProvider<
          HostDuplicatesState,
          HostDuplicatesState,
          HostDuplicatesState
        >
    with $Provider<HostDuplicatesState> {
  /// The duplicate review page for one of its two lists.
  HostDuplicatesControllerProvider._({
    required HostDuplicatesControllerFamily super.from,
    required (String, HostDuplicatesView) super.argument,
  }) : super(
         retry: null,
         name: r'hostDuplicatesControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostDuplicatesControllerHash();

  @override
  String toString() {
    return r'hostDuplicatesControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<HostDuplicatesState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostDuplicatesState create(Ref ref) {
    final argument = this.argument as (String, HostDuplicatesView);
    return hostDuplicatesController(ref, argument.$1, argument.$2);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostDuplicatesState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostDuplicatesState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostDuplicatesControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostDuplicatesControllerHash() =>
    r'9a1ce81b31e77d5e731ed88057a3cad9c1910394';

/// The duplicate review page for one of its two lists.

final class HostDuplicatesControllerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          HostDuplicatesState,
          (String, HostDuplicatesView)
        > {
  HostDuplicatesControllerFamily._()
    : super(
        retry: null,
        name: r'hostDuplicatesControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The duplicate review page for one of its two lists.

  HostDuplicatesControllerProvider call(
    String organizerId,
    HostDuplicatesView view,
  ) => HostDuplicatesControllerProvider._(
    argument: (organizerId, view),
    from: this,
  );

  @override
  String toString() => r'hostDuplicatesControllerProvider';
}

/// The People list's Possible duplicates row; null while the review is
/// read or when it cannot be, so the row never stands in for an error.

@ProviderFor(hostPeopleDuplicateSummary)
final hostPeopleDuplicateSummaryProvider = HostPeopleDuplicateSummaryFamily._();

/// The People list's Possible duplicates row; null while the review is
/// read or when it cannot be, so the row never stands in for an error.

final class HostPeopleDuplicateSummaryProvider
    extends
        $FunctionalProvider<
          HostPeopleDuplicateSummary?,
          HostPeopleDuplicateSummary?,
          HostPeopleDuplicateSummary?
        >
    with $Provider<HostPeopleDuplicateSummary?> {
  /// The People list's Possible duplicates row; null while the review is
  /// read or when it cannot be, so the row never stands in for an error.
  HostPeopleDuplicateSummaryProvider._({
    required HostPeopleDuplicateSummaryFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostPeopleDuplicateSummaryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPeopleDuplicateSummaryHash();

  @override
  String toString() {
    return r'hostPeopleDuplicateSummaryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostPeopleDuplicateSummary?> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostPeopleDuplicateSummary? create(Ref ref) {
    final argument = this.argument as String;
    return hostPeopleDuplicateSummary(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostPeopleDuplicateSummary? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostPeopleDuplicateSummary?>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostPeopleDuplicateSummaryProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPeopleDuplicateSummaryHash() =>
    r'45410ed8317cfc57786f0e1dbdb32df9b24d5cdf';

/// The People list's Possible duplicates row; null while the review is
/// read or when it cannot be, so the row never stands in for an error.

final class HostPeopleDuplicateSummaryFamily extends $Family
    with $FunctionalFamilyOverride<HostPeopleDuplicateSummary?, String> {
  HostPeopleDuplicateSummaryFamily._()
    : super(
        retry: null,
        name: r'hostPeopleDuplicateSummaryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The People list's Possible duplicates row; null while the review is
  /// read or when it cannot be, so the row never stands in for an error.

  HostPeopleDuplicateSummaryProvider call(String organizerId) =>
      HostPeopleDuplicateSummaryProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostPeopleDuplicateSummaryProvider';
}

/// The merge commands the People pages run: merge a pair, mark it as
/// different people, show it again, and undo a merge.

@ProviderFor(hostDuplicateCommands)
final hostDuplicateCommandsProvider = HostDuplicateCommandsProvider._();

/// The merge commands the People pages run: merge a pair, mark it as
/// different people, show it again, and undo a merge.

final class HostDuplicateCommandsProvider
    extends
        $FunctionalProvider<
          HostDuplicateCommands,
          HostDuplicateCommands,
          HostDuplicateCommands
        >
    with $Provider<HostDuplicateCommands> {
  /// The merge commands the People pages run: merge a pair, mark it as
  /// different people, show it again, and undo a merge.
  HostDuplicateCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostDuplicateCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostDuplicateCommandsHash();

  @$internal
  @override
  $ProviderElement<HostDuplicateCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostDuplicateCommands create(Ref ref) {
    return hostDuplicateCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostDuplicateCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostDuplicateCommands>(value),
    );
  }
}

String _$hostDuplicateCommandsHash() =>
    r'3078b9c1fc23033833ef66f4da51111e62203f03';
