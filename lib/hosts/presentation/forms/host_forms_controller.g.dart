// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_forms_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The actor is part of this generated family's identity. It forces a fresh
/// manager read before a newly signed-in account can see directory rows.

@ProviderFor(hostFormsAccountDirectory)
final hostFormsAccountDirectoryProvider = HostFormsAccountDirectoryFamily._();

/// The actor is part of this generated family's identity. It forces a fresh
/// manager read before a newly signed-in account can see directory rows.

final class HostFormsAccountDirectoryProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostFormsDirectoryState>,
          HostFormsDirectoryState,
          FutureOr<HostFormsDirectoryState>
        >
    with
        $FutureModifier<HostFormsDirectoryState>,
        $FutureProvider<HostFormsDirectoryState> {
  /// The actor is part of this generated family's identity. It forces a fresh
  /// manager read before a newly signed-in account can see directory rows.
  HostFormsAccountDirectoryProvider._({
    required HostFormsAccountDirectoryFamily super.from,
    required HostFormAccountDirectoryScope super.argument,
  }) : super(
         retry: null,
         name: r'hostFormsAccountDirectoryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormsAccountDirectoryHash();

  @override
  String toString() {
    return r'hostFormsAccountDirectoryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostFormsDirectoryState> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostFormsDirectoryState> create(Ref ref) {
    final argument = this.argument as HostFormAccountDirectoryScope;
    return hostFormsAccountDirectory(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormsAccountDirectoryProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormsAccountDirectoryHash() =>
    r'c47368cf0f33bbfcff6ee4d11074d2302a34b0c8';

/// The actor is part of this generated family's identity. It forces a fresh
/// manager read before a newly signed-in account can see directory rows.

final class HostFormsAccountDirectoryFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostFormsDirectoryState>,
          HostFormAccountDirectoryScope
        > {
  HostFormsAccountDirectoryFamily._()
    : super(
        retry: null,
        name: r'hostFormsAccountDirectoryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The actor is part of this generated family's identity. It forces a fresh
  /// manager read before a newly signed-in account can see directory rows.

  HostFormsAccountDirectoryProvider call(HostFormAccountDirectoryScope scope) =>
      HostFormsAccountDirectoryProvider._(argument: scope, from: this);

  @override
  String toString() => r'hostFormsAccountDirectoryProvider';
}

@ProviderFor(HostFormEditorController)
final hostFormEditorControllerProvider = HostFormEditorControllerFamily._();

final class HostFormEditorControllerProvider
    extends
        $AsyncNotifierProvider<HostFormEditorController, HostFormEditorState> {
  HostFormEditorControllerProvider._({
    required HostFormEditorControllerFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormEditorControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormEditorControllerHash();

  @override
  String toString() {
    return r'hostFormEditorControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  HostFormEditorController create() => HostFormEditorController();

  @override
  bool operator ==(Object other) {
    return other is HostFormEditorControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormEditorControllerHash() =>
    r'503c67c537015ebf6a28c0e58c378f7b473f767a';

final class HostFormEditorControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormEditorController,
          AsyncValue<HostFormEditorState>,
          HostFormEditorState,
          FutureOr<HostFormEditorState>,
          (String, String)
        > {
  HostFormEditorControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormEditorControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostFormEditorControllerProvider call(String organizerId, String formId) =>
      HostFormEditorControllerProvider._(
        argument: (organizerId, formId),
        from: this,
      );

  @override
  String toString() => r'hostFormEditorControllerProvider';
}

abstract class _$HostFormEditorController
    extends $AsyncNotifier<HostFormEditorState> {
  late final _$args = ref.$arg as (String, String);
  String get organizerId => _$args.$1;
  String get formId => _$args.$2;

  FutureOr<HostFormEditorState> build(String organizerId, String formId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<HostFormEditorState>, HostFormEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<HostFormEditorState>, HostFormEditorState>,
              AsyncValue<HostFormEditorState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args.$1, _$args.$2));
  }
}

@ProviderFor(hostFormShareAssetsController)
final hostFormShareAssetsControllerProvider =
    HostFormShareAssetsControllerFamily._();

final class HostFormShareAssetsControllerProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostFormShareAssets>,
          HostFormShareAssets,
          FutureOr<HostFormShareAssets>
        >
    with
        $FutureModifier<HostFormShareAssets>,
        $FutureProvider<HostFormShareAssets> {
  HostFormShareAssetsControllerProvider._({
    required HostFormShareAssetsControllerFamily super.from,
    required ({String organizerId, String formId}) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormShareAssetsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormShareAssetsControllerHash();

  @override
  String toString() {
    return r'hostFormShareAssetsControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostFormShareAssets> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostFormShareAssets> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String formId});
    return hostFormShareAssetsController(
      ref,
      organizerId: argument.organizerId,
      formId: argument.formId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormShareAssetsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormShareAssetsControllerHash() =>
    r'8fef45385f72a7b9219b152c2abd2ce82109f0b0';

final class HostFormShareAssetsControllerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostFormShareAssets>,
          ({String organizerId, String formId})
        > {
  HostFormShareAssetsControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormShareAssetsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostFormShareAssetsControllerProvider call({
    required String organizerId,
    required String formId,
  }) => HostFormShareAssetsControllerProvider._(
    argument: (organizerId: organizerId, formId: formId),
    from: this,
  );

  @override
  String toString() => r'hostFormShareAssetsControllerProvider';
}

@ProviderFor(hostFormsController)
final hostFormsControllerProvider = HostFormsControllerProvider._();

final class HostFormsControllerProvider
    extends
        $FunctionalProvider<
          HostFormsController,
          HostFormsController,
          HostFormsController
        >
    with $Provider<HostFormsController> {
  HostFormsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostFormsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostFormsControllerHash();

  @$internal
  @override
  $ProviderElement<HostFormsController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormsController create(Ref ref) {
    return hostFormsController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormsController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormsController>(value),
    );
  }
}

String _$hostFormsControllerHash() =>
    r'f03b4f93e3fa5e51b077347f0d87d0deced7e5b8';

/// How many forms the directory listens to for one request; it grows by
/// the request's page size each time the list asks for more.

@ProviderFor(HostFormsWindow)
final hostFormsWindowProvider = HostFormsWindowFamily._();

/// How many forms the directory listens to for one request; it grows by
/// the request's page size each time the list asks for more.
final class HostFormsWindowProvider
    extends $NotifierProvider<HostFormsWindow, int> {
  /// How many forms the directory listens to for one request; it grows by
  /// the request's page size each time the list asks for more.
  HostFormsWindowProvider._({
    required HostFormsWindowFamily super.from,
    required HostFormListRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostFormsWindowProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormsWindowHash();

  @override
  String toString() {
    return r'hostFormsWindowProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostFormsWindow create() => HostFormsWindow();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormsWindowProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormsWindowHash() => r'f815cf2cdad71f1614f1a227b924ff002b0d7e1a';

/// How many forms the directory listens to for one request; it grows by
/// the request's page size each time the list asks for more.

final class HostFormsWindowFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormsWindow,
          int,
          int,
          int,
          HostFormListRequest
        > {
  HostFormsWindowFamily._()
    : super(
        retry: null,
        name: r'hostFormsWindowProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// How many forms the directory listens to for one request; it grows by
  /// the request's page size each time the list asks for more.

  HostFormsWindowProvider call(HostFormListRequest request) =>
      HostFormsWindowProvider._(argument: request, from: this);

  @override
  String toString() => r'hostFormsWindowProvider';
}

/// How many forms the directory listens to for one request; it grows by
/// the request's page size each time the list asks for more.

abstract class _$HostFormsWindow extends $Notifier<int> {
  late final _$args = ref.$arg as HostFormListRequest;
  HostFormListRequest get request => _$args;

  int build(HostFormListRequest request);
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

/// The first rows of the request's form list, as a listener.

@ProviderFor(hostFormsListener)
final hostFormsListenerProvider = HostFormsListenerFamily._();

/// The first rows of the request's form list, as a listener.

final class HostFormsListenerProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostFormWindow>,
          HostFormWindow,
          Stream<HostFormWindow>
        >
    with $FutureModifier<HostFormWindow>, $StreamProvider<HostFormWindow> {
  /// The first rows of the request's form list, as a listener.
  HostFormsListenerProvider._({
    required HostFormsListenerFamily super.from,
    required (HostFormListRequest, int) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormsListenerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormsListenerHash();

  @override
  String toString() {
    return r'hostFormsListenerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostFormWindow> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostFormWindow> create(Ref ref) {
    final argument = this.argument as (HostFormListRequest, int);
    return hostFormsListener(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormsListenerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormsListenerHash() => r'd9ee6609a0f2f0c754a9723a975979dc66c07e0e';

/// The first rows of the request's form list, as a listener.

final class HostFormsListenerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostFormWindow>,
          (HostFormListRequest, int)
        > {
  HostFormsListenerFamily._()
    : super(
        retry: null,
        name: r'hostFormsListenerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The first rows of the request's form list, as a listener.

  HostFormsListenerProvider call(HostFormListRequest request, int limit) =>
      HostFormsListenerProvider._(argument: (request, limit), from: this);

  @override
  String toString() => r'hostFormsListenerProvider';
}

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. More
/// rows mean a larger listener; a larger listener that fails keeps the rows
/// already shown and reports the failure under them.

@ProviderFor(HostFormsDirectoryController)
final hostFormsDirectoryControllerProvider =
    HostFormsDirectoryControllerFamily._();

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. More
/// rows mean a larger listener; a larger listener that fails keeps the rows
/// already shown and reports the failure under them.
final class HostFormsDirectoryControllerProvider
    extends
        $AsyncNotifierProvider<
          HostFormsDirectoryController,
          HostFormsDirectoryState
        > {
  /// The forms directory, live: a form the server adds, changes or removes
  /// shows at once, and the list opens offline from the device cache. More
  /// rows mean a larger listener; a larger listener that fails keeps the rows
  /// already shown and reports the failure under them.
  HostFormsDirectoryControllerProvider._({
    required HostFormsDirectoryControllerFamily super.from,
    required HostFormListRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostFormsDirectoryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormsDirectoryControllerHash();

  @override
  String toString() {
    return r'hostFormsDirectoryControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostFormsDirectoryController create() => HostFormsDirectoryController();

  @override
  bool operator ==(Object other) {
    return other is HostFormsDirectoryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormsDirectoryControllerHash() =>
    r'd29c90db680171a459f32150f0a7a925ca209121';

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. More
/// rows mean a larger listener; a larger listener that fails keeps the rows
/// already shown and reports the failure under them.

final class HostFormsDirectoryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormsDirectoryController,
          AsyncValue<HostFormsDirectoryState>,
          HostFormsDirectoryState,
          FutureOr<HostFormsDirectoryState>,
          HostFormListRequest
        > {
  HostFormsDirectoryControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormsDirectoryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The forms directory, live: a form the server adds, changes or removes
  /// shows at once, and the list opens offline from the device cache. More
  /// rows mean a larger listener; a larger listener that fails keeps the rows
  /// already shown and reports the failure under them.

  HostFormsDirectoryControllerProvider call(HostFormListRequest request) =>
      HostFormsDirectoryControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostFormsDirectoryControllerProvider';
}

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. More
/// rows mean a larger listener; a larger listener that fails keeps the rows
/// already shown and reports the failure under them.

abstract class _$HostFormsDirectoryController
    extends $AsyncNotifier<HostFormsDirectoryState> {
  late final _$args = ref.$arg as HostFormListRequest;
  HostFormListRequest get request => _$args;

  FutureOr<HostFormsDirectoryState> build(HostFormListRequest request);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostFormsDirectoryState>,
              HostFormsDirectoryState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostFormsDirectoryState>,
                HostFormsDirectoryState
              >,
              AsyncValue<HostFormsDirectoryState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
