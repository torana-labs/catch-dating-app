// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_form_operations_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// A response request's entries, a page at a time, every row shown live.
/// Each page is its own listener, so asking for more reads only the new
/// page.

@ProviderFor(HostFormResponsePages)
final hostFormResponsePagesProvider = HostFormResponsePagesFamily._();

/// A response request's entries, a page at a time, every row shown live.
/// Each page is its own listener, so asking for more reads only the new
/// page.
final class HostFormResponsePagesProvider
    extends
        $StreamNotifierProvider<
          HostFormResponsePages,
          LivePages<HostFormInboxEntry>
        > {
  /// A response request's entries, a page at a time, every row shown live.
  /// Each page is its own listener, so asking for more reads only the new
  /// page.
  HostFormResponsePagesProvider._({
    required HostFormResponsePagesFamily super.from,
    required HostFormResponseListRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostFormResponsePagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormResponsePagesHash();

  @override
  String toString() {
    return r'hostFormResponsePagesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostFormResponsePages create() => HostFormResponsePages();

  @override
  bool operator ==(Object other) {
    return other is HostFormResponsePagesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormResponsePagesHash() =>
    r'64a1da6b3abcfa14da02f29263b1bb4a486e888c';

/// A response request's entries, a page at a time, every row shown live.
/// Each page is its own listener, so asking for more reads only the new
/// page.

final class HostFormResponsePagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormResponsePages,
          AsyncValue<LivePages<HostFormInboxEntry>>,
          LivePages<HostFormInboxEntry>,
          Stream<LivePages<HostFormInboxEntry>>,
          HostFormResponseListRequest
        > {
  HostFormResponsePagesFamily._()
    : super(
        retry: null,
        name: r'hostFormResponsePagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A response request's entries, a page at a time, every row shown live.
  /// Each page is its own listener, so asking for more reads only the new
  /// page.

  HostFormResponsePagesProvider call(HostFormResponseListRequest request) =>
      HostFormResponsePagesProvider._(argument: request, from: this);

  @override
  String toString() => r'hostFormResponsePagesProvider';
}

/// A response request's entries, a page at a time, every row shown live.
/// Each page is its own listener, so asking for more reads only the new
/// page.

abstract class _$HostFormResponsePages
    extends $StreamNotifier<LivePages<HostFormInboxEntry>> {
  late final _$args = ref.$arg as HostFormResponseListRequest;
  HostFormResponseListRequest get request => _$args;

  Stream<LivePages<HostFormInboxEntry>> build(
    HostFormResponseListRequest request,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<LivePages<HostFormInboxEntry>>,
              LivePages<HostFormInboxEntry>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<LivePages<HostFormInboxEntry>>,
                LivePages<HostFormInboxEntry>
              >,
              AsyncValue<LivePages<HostFormInboxEntry>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// A form page's version scope and answer filter options, read once. Shared
/// by every sort, status and date slice of the same form page.

@ProviderFor(hostFormResponseScope)
final hostFormResponseScopeProvider = HostFormResponseScopeFamily._();

/// A form page's version scope and answer filter options, read once. Shared
/// by every sort, status and date slice of the same form page.

final class HostFormResponseScopeProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostFormResponseScope?>,
          HostFormResponseScope?,
          FutureOr<HostFormResponseScope?>
        >
    with
        $FutureModifier<HostFormResponseScope?>,
        $FutureProvider<HostFormResponseScope?> {
  /// A form page's version scope and answer filter options, read once. Shared
  /// by every sort, status and date slice of the same form page.
  HostFormResponseScopeProvider._({
    required HostFormResponseScopeFamily super.from,
    required HostFormResponseScopeKey super.argument,
  }) : super(
         retry: null,
         name: r'hostFormResponseScopeProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormResponseScopeHash();

  @override
  String toString() {
    return r'hostFormResponseScopeProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostFormResponseScope?> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostFormResponseScope?> create(Ref ref) {
    final argument = this.argument as HostFormResponseScopeKey;
    return hostFormResponseScope(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormResponseScopeProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormResponseScopeHash() =>
    r'717f5470b6f36017a377f1b7941b0396e2bca9aa';

/// A form page's version scope and answer filter options, read once. Shared
/// by every sort, status and date slice of the same form page.

final class HostFormResponseScopeFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostFormResponseScope?>,
          HostFormResponseScopeKey
        > {
  HostFormResponseScopeFamily._()
    : super(
        retry: null,
        name: r'hostFormResponseScopeProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A form page's version scope and answer filter options, read once. Shared
  /// by every sort, status and date slice of the same form page.

  HostFormResponseScopeProvider call(HostFormResponseScopeKey key) =>
      HostFormResponseScopeProvider._(argument: key, from: this);

  @override
  String toString() => r'hostFormResponseScopeProvider';
}

/// A response list. A request the response read model serves is live: an
/// answer submitted, reviewed or offered elsewhere shows at once, and more
/// rows open one more page listener. Answer, identity, contact and text
/// filters page through the callable, their recorded search exception.

@ProviderFor(HostFormResponsesController)
final hostFormResponsesControllerProvider =
    HostFormResponsesControllerFamily._();

/// A response list. A request the response read model serves is live: an
/// answer submitted, reviewed or offered elsewhere shows at once, and more
/// rows open one more page listener. Answer, identity, contact and text
/// filters page through the callable, their recorded search exception.
final class HostFormResponsesControllerProvider
    extends
        $AsyncNotifierProvider<
          HostFormResponsesController,
          HostFormResponsesState
        > {
  /// A response list. A request the response read model serves is live: an
  /// answer submitted, reviewed or offered elsewhere shows at once, and more
  /// rows open one more page listener. Answer, identity, contact and text
  /// filters page through the callable, their recorded search exception.
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
    r'e22af8d9eaf8562137a22cffed96f02ae10f980e';

/// A response list. A request the response read model serves is live: an
/// answer submitted, reviewed or offered elsewhere shows at once, and more
/// rows open one more page listener. Answer, identity, contact and text
/// filters page through the callable, their recorded search exception.

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
  /// rows open one more page listener. Answer, identity, contact and text
  /// filters page through the callable, their recorded search exception.

  HostFormResponsesControllerProvider call(
    HostFormResponseListRequest request,
  ) => HostFormResponsesControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostFormResponsesControllerProvider';
}

/// A response list. A request the response read model serves is live: an
/// answer submitted, reviewed or offered elsewhere shows at once, and more
/// rows open one more page listener. Answer, identity, contact and text
/// filters page through the callable, their recorded search exception.

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

/// A read-back before a command: the server's current version of one of
/// [organizerId]'s responses, never a kept one.

@ProviderFor(hostFormResponseReadBack)
final hostFormResponseReadBackProvider = HostFormResponseReadBackFamily._();

/// A read-back before a command: the server's current version of one of
/// [organizerId]'s responses, never a kept one.

final class HostFormResponseReadBackProvider
    extends
        $FunctionalProvider<
          Future<HostFormResponseDetail> Function(String responseId),
          Future<HostFormResponseDetail> Function(String responseId),
          Future<HostFormResponseDetail> Function(String responseId)
        >
    with $Provider<Future<HostFormResponseDetail> Function(String responseId)> {
  /// A read-back before a command: the server's current version of one of
  /// [organizerId]'s responses, never a kept one.
  HostFormResponseReadBackProvider._({
    required HostFormResponseReadBackFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostFormResponseReadBackProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormResponseReadBackHash();

  @override
  String toString() {
    return r'hostFormResponseReadBackProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<Future<HostFormResponseDetail> Function(String responseId)>
  $createElement($ProviderPointer pointer) => $ProviderElement(pointer);

  @override
  Future<HostFormResponseDetail> Function(String responseId) create(Ref ref) {
    final argument = this.argument as String;
    return hostFormResponseReadBack(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    Future<HostFormResponseDetail> Function(String responseId) value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<
            Future<HostFormResponseDetail> Function(String responseId)
          >(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormResponseReadBackProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormResponseReadBackHash() =>
    r'e7b52f8f9b2c61e0ca48871a31ecf38356f7e435';

/// A read-back before a command: the server's current version of one of
/// [organizerId]'s responses, never a kept one.

final class HostFormResponseReadBackFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Future<HostFormResponseDetail> Function(String responseId),
          String
        > {
  HostFormResponseReadBackFamily._()
    : super(
        retry: null,
        name: r'hostFormResponseReadBackProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A read-back before a command: the server's current version of one of
  /// [organizerId]'s responses, never a kept one.

  HostFormResponseReadBackProvider call(String organizerId) =>
      HostFormResponseReadBackProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostFormResponseReadBackProvider';
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

/// The automation rules and run history of an organizer, or of one form
/// when `formId` is set, from listeners: a rule saved or switched elsewhere
/// and a run that finishes show at once. Saves and switches stay on the
/// revision-fenced callables; a saved rule shows at once and gives way to
/// its view when the view reaches that revision.

@ProviderFor(HostFormAutomationsController)
final hostFormAutomationsControllerProvider =
    HostFormAutomationsControllerFamily._();

/// The automation rules and run history of an organizer, or of one form
/// when `formId` is set, from listeners: a rule saved or switched elsewhere
/// and a run that finishes show at once. Saves and switches stay on the
/// revision-fenced callables; a saved rule shows at once and gives way to
/// its view when the view reaches that revision.
final class HostFormAutomationsControllerProvider
    extends
        $AsyncNotifierProvider<
          HostFormAutomationsController,
          HostFormAutomationsState
        > {
  /// The automation rules and run history of an organizer, or of one form
  /// when `formId` is set, from listeners: a rule saved or switched elsewhere
  /// and a run that finishes show at once. Saves and switches stay on the
  /// revision-fenced callables; a saved rule shows at once and gives way to
  /// its view when the view reaches that revision.
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
    r'e125c7cd730173cc8ffe038ba19d549a90ab7ee2';

/// The automation rules and run history of an organizer, or of one form
/// when `formId` is set, from listeners: a rule saved or switched elsewhere
/// and a run that finishes show at once. Saves and switches stay on the
/// revision-fenced callables; a saved rule shows at once and gives way to
/// its view when the view reaches that revision.

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

  /// The automation rules and run history of an organizer, or of one form
  /// when `formId` is set, from listeners: a rule saved or switched elsewhere
  /// and a run that finishes show at once. Saves and switches stay on the
  /// revision-fenced callables; a saved rule shows at once and gives way to
  /// its view when the view reaches that revision.

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

/// The automation rules and run history of an organizer, or of one form
/// when `formId` is set, from listeners: a rule saved or switched elsewhere
/// and a run that finishes show at once. Saves and switches stay on the
/// revision-fenced callables; a saved rule shows at once and gives way to
/// its view when the view reaches that revision.

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
