// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_booking_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventPaidBookingSupport)
final eventPaidBookingSupportProvider = EventPaidBookingSupportFamily._();

final class EventPaidBookingSupportProvider
    extends $FunctionalProvider<bool, bool, bool>
    with $Provider<bool> {
  EventPaidBookingSupportProvider._({
    required EventPaidBookingSupportFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventPaidBookingSupportProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventPaidBookingSupportHash();

  @override
  String toString() {
    return r'eventPaidBookingSupportProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  bool create(Ref ref) {
    final argument = this.argument as String;
    return eventPaidBookingSupport(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventPaidBookingSupportProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventPaidBookingSupportHash() =>
    r'1aab0d3cf0d35a0225cf98f9ce1f2282c396eae5';

final class EventPaidBookingSupportFamily extends $Family
    with $FunctionalFamilyOverride<bool, String> {
  EventPaidBookingSupportFamily._()
    : super(
        retry: null,
        name: r'eventPaidBookingSupportProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventPaidBookingSupportProvider call(String currency) =>
      EventPaidBookingSupportProvider._(argument: currency, from: this);

  @override
  String toString() => r'eventPaidBookingSupportProvider';
}

/// **Pattern A: Action controller + static Mutations**
///
/// This is the most common mutation pattern in the app (6 controllers use it):
/// - [build()] returns `void` — the controller holds no Riverpod state.
/// - [Mutation]s (`bookMutation`, `cancelMutation`, etc.) are `static final`
///   fields that track the lifecycle of single-shot operations.
/// - The UI watches mutations directly (e.g. `ref.watch(controller.mutation)`)
///   and checks `.isPending`, `.hasError`, `.isSuccess`.
/// - Controller methods delegate to repositories and let errors propagate
///   into the Mutation error state automatically.
///
/// **When to use this pattern:** Single-shot user actions (book, cancel, join,
/// leave, submit, delete) where the UI needs to show loading/error/success
/// state for a specific action.

@ProviderFor(EventBookingController)
final eventBookingControllerProvider = EventBookingControllerProvider._();

/// **Pattern A: Action controller + static Mutations**
///
/// This is the most common mutation pattern in the app (6 controllers use it):
/// - [build()] returns `void` — the controller holds no Riverpod state.
/// - [Mutation]s (`bookMutation`, `cancelMutation`, etc.) are `static final`
///   fields that track the lifecycle of single-shot operations.
/// - The UI watches mutations directly (e.g. `ref.watch(controller.mutation)`)
///   and checks `.isPending`, `.hasError`, `.isSuccess`.
/// - Controller methods delegate to repositories and let errors propagate
///   into the Mutation error state automatically.
///
/// **When to use this pattern:** Single-shot user actions (book, cancel, join,
/// leave, submit, delete) where the UI needs to show loading/error/success
/// state for a specific action.
final class EventBookingControllerProvider
    extends $NotifierProvider<EventBookingController, void> {
  /// **Pattern A: Action controller + static Mutations**
  ///
  /// This is the most common mutation pattern in the app (6 controllers use it):
  /// - [build()] returns `void` — the controller holds no Riverpod state.
  /// - [Mutation]s (`bookMutation`, `cancelMutation`, etc.) are `static final`
  ///   fields that track the lifecycle of single-shot operations.
  /// - The UI watches mutations directly (e.g. `ref.watch(controller.mutation)`)
  ///   and checks `.isPending`, `.hasError`, `.isSuccess`.
  /// - Controller methods delegate to repositories and let errors propagate
  ///   into the Mutation error state automatically.
  ///
  /// **When to use this pattern:** Single-shot user actions (book, cancel, join,
  /// leave, submit, delete) where the UI needs to show loading/error/success
  /// state for a specific action.
  EventBookingControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventBookingControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventBookingControllerHash();

  @$internal
  @override
  EventBookingController create() => EventBookingController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$eventBookingControllerHash() =>
    r'9eb6c4a7c89aa2b20c4464cfb75f41fef586e2d2';

/// **Pattern A: Action controller + static Mutations**
///
/// This is the most common mutation pattern in the app (6 controllers use it):
/// - [build()] returns `void` — the controller holds no Riverpod state.
/// - [Mutation]s (`bookMutation`, `cancelMutation`, etc.) are `static final`
///   fields that track the lifecycle of single-shot operations.
/// - The UI watches mutations directly (e.g. `ref.watch(controller.mutation)`)
///   and checks `.isPending`, `.hasError`, `.isSuccess`.
/// - Controller methods delegate to repositories and let errors propagate
///   into the Mutation error state automatically.
///
/// **When to use this pattern:** Single-shot user actions (book, cancel, join,
/// leave, submit, delete) where the UI needs to show loading/error/success
/// state for a specific action.

abstract class _$EventBookingController extends $Notifier<void> {
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
