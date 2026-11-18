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

/// The request's forms, a page at a time, every row shown live. Each page is
/// its own listener, so asking for more reads only the new page. A title
/// search is one bounded listener with no further page.

@ProviderFor(HostFormsDirectoryPages)
final hostFormsDirectoryPagesProvider = HostFormsDirectoryPagesFamily._();

/// The request's forms, a page at a time, every row shown live. Each page is
/// its own listener, so asking for more reads only the new page. A title
/// search is one bounded listener with no further page.
final class HostFormsDirectoryPagesProvider
    extends
        $StreamNotifierProvider<
          HostFormsDirectoryPages,
          LivePages<HostFormSummary>
        > {
  /// The request's forms, a page at a time, every row shown live. Each page is
  /// its own listener, so asking for more reads only the new page. A title
  /// search is one bounded listener with no further page.
  HostFormsDirectoryPagesProvider._({
    required HostFormsDirectoryPagesFamily super.from,
    required HostFormListRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostFormsDirectoryPagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormsDirectoryPagesHash();

  @override
  String toString() {
    return r'hostFormsDirectoryPagesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostFormsDirectoryPages create() => HostFormsDirectoryPages();

  @override
  bool operator ==(Object other) {
    return other is HostFormsDirectoryPagesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormsDirectoryPagesHash() =>
    r'8a39b5b12960713b9b64c3d2b5216c987500e9b0';

/// The request's forms, a page at a time, every row shown live. Each page is
/// its own listener, so asking for more reads only the new page. A title
/// search is one bounded listener with no further page.

final class HostFormsDirectoryPagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormsDirectoryPages,
          AsyncValue<LivePages<HostFormSummary>>,
          LivePages<HostFormSummary>,
          Stream<LivePages<HostFormSummary>>,
          HostFormListRequest
        > {
  HostFormsDirectoryPagesFamily._()
    : super(
        retry: null,
        name: r'hostFormsDirectoryPagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The request's forms, a page at a time, every row shown live. Each page is
  /// its own listener, so asking for more reads only the new page. A title
  /// search is one bounded listener with no further page.

  HostFormsDirectoryPagesProvider call(HostFormListRequest request) =>
      HostFormsDirectoryPagesProvider._(argument: request, from: this);

  @override
  String toString() => r'hostFormsDirectoryPagesProvider';
}

/// The request's forms, a page at a time, every row shown live. Each page is
/// its own listener, so asking for more reads only the new page. A title
/// search is one bounded listener with no further page.

abstract class _$HostFormsDirectoryPages
    extends $StreamNotifier<LivePages<HostFormSummary>> {
  late final _$args = ref.$arg as HostFormListRequest;
  HostFormListRequest get request => _$args;

  Stream<LivePages<HostFormSummary>> build(HostFormListRequest request);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<LivePages<HostFormSummary>>,
              LivePages<HostFormSummary>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<LivePages<HostFormSummary>>,
                LivePages<HostFormSummary>
              >,
              AsyncValue<LivePages<HostFormSummary>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. A page
/// that fails to open keeps the rows already shown and reports the failure
/// under them.

@ProviderFor(HostFormsDirectoryController)
final hostFormsDirectoryControllerProvider =
    HostFormsDirectoryControllerFamily._();

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. A page
/// that fails to open keeps the rows already shown and reports the failure
/// under them.
final class HostFormsDirectoryControllerProvider
    extends
        $AsyncNotifierProvider<
          HostFormsDirectoryController,
          HostFormsDirectoryState
        > {
  /// The forms directory, live: a form the server adds, changes or removes
  /// shows at once, and the list opens offline from the device cache. A page
  /// that fails to open keeps the rows already shown and reports the failure
  /// under them.
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
    r'bc98f4b2aec35ad9666bdcdce0c35840a94d80bd';

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. A page
/// that fails to open keeps the rows already shown and reports the failure
/// under them.

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
  /// shows at once, and the list opens offline from the device cache. A page
  /// that fails to open keeps the rows already shown and reports the failure
  /// under them.

  HostFormsDirectoryControllerProvider call(HostFormListRequest request) =>
      HostFormsDirectoryControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostFormsDirectoryControllerProvider';
}

/// The forms directory, live: a form the server adds, changes or removes
/// shows at once, and the list opens offline from the device cache. A page
/// that fails to open keeps the rows already shown and reports the failure
/// under them.

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
