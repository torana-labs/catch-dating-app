// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_form_operations_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// How many rows a live response request listens to; it grows by the
/// request's page size each time the list asks for more.

@ProviderFor(HostFormResponsesWindow)
final hostFormResponsesWindowProvider = HostFormResponsesWindowFamily._();

/// How many rows a live response request listens to; it grows by the
/// request's page size each time the list asks for more.
final class HostFormResponsesWindowProvider
    extends $NotifierProvider<HostFormResponsesWindow, int> {
  /// How many rows a live response request listens to; it grows by the
  /// request's page size each time the list asks for more.
  HostFormResponsesWindowProvider._({
    required HostFormResponsesWindowFamily super.from,
    required HostFormResponseListRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostFormResponsesWindowProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormResponsesWindowHash();

  @override
  String toString() {
    return r'hostFormResponsesWindowProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostFormResponsesWindow create() => HostFormResponsesWindow();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormResponsesWindowProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormResponsesWindowHash() =>
    r'59972f5261d22cd2574730ae76b739b17711345a';

/// How many rows a live response request listens to; it grows by the
/// request's page size each time the list asks for more.

final class HostFormResponsesWindowFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormResponsesWindow,
          int,
          int,
          int,
          HostFormResponseListRequest
        > {
  HostFormResponsesWindowFamily._()
    : super(
        retry: null,
        name: r'hostFormResponsesWindowProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// How many rows a live response request listens to; it grows by the
  /// request's page size each time the list asks for more.

  HostFormResponsesWindowProvider call(HostFormResponseListRequest request) =>
      HostFormResponsesWindowProvider._(argument: request, from: this);

  @override
  String toString() => r'hostFormResponsesWindowProvider';
}

/// How many rows a live response request listens to; it grows by the
/// request's page size each time the list asks for more.

abstract class _$HostFormResponsesWindow extends $Notifier<int> {
  late final _$args = ref.$arg as HostFormResponseListRequest;
  HostFormResponseListRequest get request => _$args;

  int build(HostFormResponseListRequest request);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<int, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<int, int>,
              int,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The first rows of a response request the read model serves, as a
/// listener.

@ProviderFor(hostFormResponsesListener)
final hostFormResponsesListenerProvider = HostFormResponsesListenerFamily._();

/// The first rows of a response request the read model serves, as a
/// listener.

final class HostFormResponsesListenerProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostFormResponseWindow>,
          HostFormResponseWindow,
          Stream<HostFormResponseWindow>
        >
    with
        $FutureModifier<HostFormResponseWindow>,
        $StreamProvider<HostFormResponseWindow> {
  /// The first rows of a response request the read model serves, as a
  /// listener.
  HostFormResponsesListenerProvider._({
    required HostFormResponsesListenerFamily super.from,
    required (HostFormResponseListRequest, int) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormResponsesListenerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormResponsesListenerHash();

  @override
  String toString() {
    return r'hostFormResponsesListenerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostFormResponseWindow> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostFormResponseWindow> create(Ref ref) {
    final argument = this.argument as (HostFormResponseListRequest, int);
    return hostFormResponsesListener(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormResponsesListenerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormResponsesListenerHash() =>
    r'8a86f9e5d28cd2295ac6b88227b725e94b3f8baa';

/// The first rows of a response request the read model serves, as a
/// listener.

final class HostFormResponsesListenerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostFormResponseWindow>,
          (HostFormResponseListRequest, int)
        > {
  HostFormResponsesListenerFamily._()
    : super(
        retry: null,
        name: r'hostFormResponsesListenerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The first rows of a response request the read model serves, as a
  /// listener.

  HostFormResponsesListenerProvider call(
    HostFormResponseListRequest request,
    int limit,
  ) => HostFormResponsesListenerProvider._(
    argument: (request, limit),
    from: this,
  );

  @override
  String toString() => r'hostFormResponsesListenerProvider';
}

/// A response list. A request the response read model serves is live: an
/// answer submitted, reviewed or offered elsewhere shows at once, and more
/// rows mean a larger listener. Answer, identity, contact and text filters
/// page through the callable, their recorded search exception.

@ProviderFor(HostFormResponsesController)
final hostFormResponsesControllerProvider =
    HostFormResponsesControllerFamily._();

/// A response list. A request the response read model serves is live: an
/// answer submitted, reviewed or offered elsewhere shows at once, and more
/// rows mean a larger listener. Answer, identity, contact and text filters
/// page through the callable, their recorded search exception.
final class HostFormResponsesControllerProvider
    extends
        $AsyncNotifierProvider<
          HostFormResponsesController,
          HostFormResponsesState
        > {
  /// A response list. A request the response read model serves is live: an
  /// answer submitted, reviewed or offered elsewhere shows at once, and more
  /// rows mean a larger listener. Answer, identity, contact and text filters
  /// page through the callable, their recorded search exception.
  HostFormResponsesControllerProvider._({
    required HostFormResponsesControllerFamily super.from,
    required HostFormResponseListRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostFormResponsesControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormResponsesControllerHash();

  @override
  String toString() {
    return r'hostFormResponsesControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostFormResponsesController create() => HostFormResponsesController();

  @override
  bool operator ==(Object other) {
    return other is HostFormResponsesControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormResponsesControllerHash() =>
    r'f6f0609b4d0a8560411525551af5282d3804a9b6';

/// A response list. A request the response read model serves is live: an
/// answer submitted, reviewed or offered elsewhere shows at once, and more
/// rows mean a larger listener. Answer, identity, contact and text filters
/// page through the callable, their recorded search exception.

final class HostFormResponsesControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormResponsesController,
          AsyncValue<HostFormResponsesState>,
          HostFormResponsesState,
          FutureOr<HostFormResponsesState>,
          HostFormResponseListRequest
        > {
  HostFormResponsesControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormResponsesControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A response list. A request the response read model serves is live: an
  /// answer submitted, reviewed or offered elsewhere shows at once, and more
  /// rows mean a larger listener. Answer, identity, contact and text filters
  /// page through the callable, their recorded search exception.

  HostFormResponsesControllerProvider call(
    HostFormResponseListRequest request,
  ) => HostFormResponsesControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostFormResponsesControllerProvider';
}

/// A response list. A request the response read model serves is live: an
/// answer submitted, reviewed or offered elsewhere shows at once, and more
/// rows mean a larger listener. Answer, identity, contact and text filters
/// page through the callable, their recorded search exception.

abstract class _$HostFormResponsesController
    extends $AsyncNotifier<HostFormResponsesState> {
  late final _$args = ref.$arg as HostFormResponseListRequest;
  HostFormResponseListRequest get request => _$args;

  FutureOr<HostFormResponsesState> build(HostFormResponseListRequest request);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<HostFormResponsesState>, HostFormResponsesState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostFormResponsesState>,
                HostFormResponsesState
              >,
              AsyncValue<HostFormResponsesState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(hostFormResponseDetail)
final hostFormResponseDetailProvider = HostFormResponseDetailFamily._();

final class HostFormResponseDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostFormResponseDetail>,
          HostFormResponseDetail,
          FutureOr<HostFormResponseDetail>
        >
    with
        $FutureModifier<HostFormResponseDetail>,
        $FutureProvider<HostFormResponseDetail> {
  HostFormResponseDetailProvider._({
    required HostFormResponseDetailFamily super.from,
    required ({String organizerId, String responseId}) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormResponseDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormResponseDetailHash();

  @override
  String toString() {
    return r'hostFormResponseDetailProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostFormResponseDetail> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostFormResponseDetail> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String responseId});
    return hostFormResponseDetail(
      ref,
      organizerId: argument.organizerId,
      responseId: argument.responseId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormResponseDetailProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormResponseDetailHash() =>
    r'9d05632a979d37b5677f1af63369175c5bdc1592';

final class HostFormResponseDetailFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostFormResponseDetail>,
          ({String organizerId, String responseId})
        > {
  HostFormResponseDetailFamily._()
    : super(
        retry: null,
        name: r'hostFormResponseDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostFormResponseDetailProvider call({
    required String organizerId,
    required String responseId,
  }) => HostFormResponseDetailProvider._(
    argument: (organizerId: organizerId, responseId: responseId),
    from: this,
  );

  @override
  String toString() => r'hostFormResponseDetailProvider';
}

/// Applies the immutable response version's server-side conversion rules.

@ProviderFor(hostFormResponseCanApply)
final hostFormResponseCanApplyProvider = HostFormResponseCanApplyFamily._();

/// Applies the immutable response version's server-side conversion rules.

final class HostFormResponseCanApplyProvider
    extends $FunctionalProvider<AsyncValue<bool>, bool, FutureOr<bool>>
    with $FutureModifier<bool>, $FutureProvider<bool> {
  /// Applies the immutable response version's server-side conversion rules.
  HostFormResponseCanApplyProvider._({
    required HostFormResponseCanApplyFamily super.from,
    required ({String organizerId, String responseId}) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormResponseCanApplyProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormResponseCanApplyHash();

  @override
  String toString() {
    return r'hostFormResponseCanApplyProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<bool> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String responseId});
    return hostFormResponseCanApply(
      ref,
      organizerId: argument.organizerId,
      responseId: argument.responseId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormResponseCanApplyProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormResponseCanApplyHash() =>
    r'2caee51fc6ac1b5b8da0c4bce617122ea8fa2ebd';

/// Applies the immutable response version's server-side conversion rules.

final class HostFormResponseCanApplyFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<bool>,
          ({String organizerId, String responseId})
        > {
  HostFormResponseCanApplyFamily._()
    : super(
        retry: null,
        name: r'hostFormResponseCanApplyProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Applies the immutable response version's server-side conversion rules.

  HostFormResponseCanApplyProvider call({
    required String organizerId,
    required String responseId,
  }) => HostFormResponseCanApplyProvider._(
    argument: (organizerId: organizerId, responseId: responseId),
    from: this,
  );

  @override
  String toString() => r'hostFormResponseCanApplyProvider';
}

@ProviderFor(hostFormAnalytics)
final hostFormAnalyticsProvider = HostFormAnalyticsFamily._();

final class HostFormAnalyticsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostFormAnalytics>,
          HostFormAnalytics,
          FutureOr<HostFormAnalytics>
        >
    with
        $FutureModifier<HostFormAnalytics>,
        $FutureProvider<HostFormAnalytics> {
  HostFormAnalyticsProvider._({
    required HostFormAnalyticsFamily super.from,
    required ({String organizerId, String formId, String? versionId})
    super.argument,
  }) : super(
         retry: null,
         name: r'hostFormAnalyticsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormAnalyticsHash();

  @override
  String toString() {
    return r'hostFormAnalyticsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostFormAnalytics> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostFormAnalytics> create(Ref ref) {
    final argument =
        this.argument
            as ({String organizerId, String formId, String? versionId});
    return hostFormAnalytics(
      ref,
      organizerId: argument.organizerId,
      formId: argument.formId,
      versionId: argument.versionId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormAnalyticsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormAnalyticsHash() => r'ffcc8a3bcf04927f9c80f290e3d4c629bec657e6';

final class HostFormAnalyticsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostFormAnalytics>,
          ({String organizerId, String formId, String? versionId})
        > {
  HostFormAnalyticsFamily._()
    : super(
        retry: null,
        name: r'hostFormAnalyticsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostFormAnalyticsProvider call({
    required String organizerId,
    required String formId,
    String? versionId,
  }) => HostFormAnalyticsProvider._(
    argument: (organizerId: organizerId, formId: formId, versionId: versionId),
    from: this,
  );

  @override
  String toString() => r'hostFormAnalyticsProvider';
}

@ProviderFor(HostFormAutomationsController)
final hostFormAutomationsControllerProvider =
    HostFormAutomationsControllerFamily._();

final class HostFormAutomationsControllerProvider
    extends
        $AsyncNotifierProvider<
          HostFormAutomationsController,
          HostFormAutomationsState
        > {
  HostFormAutomationsControllerProvider._({
    required HostFormAutomationsControllerFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormAutomationsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormAutomationsControllerHash();

  @override
  String toString() {
    return r'hostFormAutomationsControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  HostFormAutomationsController create() => HostFormAutomationsController();

  @override
  bool operator ==(Object other) {
    return other is HostFormAutomationsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormAutomationsControllerHash() =>
    r'd28b40bc7da8b32f90e4fb383ca4a32ba74459c6';

final class HostFormAutomationsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormAutomationsController,
          AsyncValue<HostFormAutomationsState>,
          HostFormAutomationsState,
          FutureOr<HostFormAutomationsState>,
          (String, String?)
        > {
  HostFormAutomationsControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormAutomationsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostFormAutomationsControllerProvider call(
    String organizerId,
    String? formId,
  ) => HostFormAutomationsControllerProvider._(
    argument: (organizerId, formId),
    from: this,
  );

  @override
  String toString() => r'hostFormAutomationsControllerProvider';
}

abstract class _$HostFormAutomationsController
    extends $AsyncNotifier<HostFormAutomationsState> {
  late final _$args = ref.$arg as (String, String?);
  String get organizerId => _$args.$1;
  String? get formId => _$args.$2;

  FutureOr<HostFormAutomationsState> build(String organizerId, String? formId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostFormAutomationsState>,
              HostFormAutomationsState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostFormAutomationsState>,
                HostFormAutomationsState
              >,
              AsyncValue<HostFormAutomationsState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args.$1, _$args.$2));
  }
}

/// The draft campaigns an automation can hand off to, a page at a time and
/// live, so a draft saved in Sends shows here at once. A draft that is
/// already scheduled is left out.

@ProviderFor(HostAutomationMessagesController)
final hostAutomationMessagesControllerProvider =
    HostAutomationMessagesControllerFamily._();

/// The draft campaigns an automation can hand off to, a page at a time and
/// live, so a draft saved in Sends shows here at once. A draft that is
/// already scheduled is left out.
final class HostAutomationMessagesControllerProvider
    extends
        $StreamNotifierProvider<
          HostAutomationMessagesController,
          HostAutomationMessagesState
        > {
  /// The draft campaigns an automation can hand off to, a page at a time and
  /// live, so a draft saved in Sends shows here at once. A draft that is
  /// already scheduled is left out.
  HostAutomationMessagesControllerProvider._({
    required HostAutomationMessagesControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostAutomationMessagesControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostAutomationMessagesControllerHash();

  @override
  String toString() {
    return r'hostAutomationMessagesControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostAutomationMessagesController create() =>
      HostAutomationMessagesController();

  @override
  bool operator ==(Object other) {
    return other is HostAutomationMessagesControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostAutomationMessagesControllerHash() =>
    r'13d420022d31e976c47cf32f04ff7b91bf034a17';

/// The draft campaigns an automation can hand off to, a page at a time and
/// live, so a draft saved in Sends shows here at once. A draft that is
/// already scheduled is left out.

final class HostAutomationMessagesControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostAutomationMessagesController,
          AsyncValue<HostAutomationMessagesState>,
          HostAutomationMessagesState,
          Stream<HostAutomationMessagesState>,
          String
        > {
  HostAutomationMessagesControllerFamily._()
    : super(
        retry: null,
        name: r'hostAutomationMessagesControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The draft campaigns an automation can hand off to, a page at a time and
  /// live, so a draft saved in Sends shows here at once. A draft that is
  /// already scheduled is left out.

  HostAutomationMessagesControllerProvider call(String organizerId) =>
      HostAutomationMessagesControllerProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'hostAutomationMessagesControllerProvider';
}

/// The draft campaigns an automation can hand off to, a page at a time and
/// live, so a draft saved in Sends shows here at once. A draft that is
/// already scheduled is left out.

abstract class _$HostAutomationMessagesController
    extends $StreamNotifier<HostAutomationMessagesState> {
  late final _$args = ref.$arg as String;
  String get organizerId => _$args;

  Stream<HostAutomationMessagesState> build(String organizerId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostAutomationMessagesState>,
              HostAutomationMessagesState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostAutomationMessagesState>,
                HostAutomationMessagesState
              >,
              AsyncValue<HostAutomationMessagesState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
