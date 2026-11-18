// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_whatsapp_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostWhatsappRepository)
final hostWhatsappRepositoryProvider = HostWhatsappRepositoryProvider._();

final class HostWhatsappRepositoryProvider
    extends
        $FunctionalProvider<
          HostWhatsappRepository,
          HostWhatsappRepository,
          HostWhatsappRepository
        >
    with $Provider<HostWhatsappRepository> {
  HostWhatsappRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostWhatsappRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostWhatsappRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostWhatsappRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostWhatsappRepository create(Ref ref) {
    return hostWhatsappRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostWhatsappRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostWhatsappRepository>(value),
    );
  }
}

String _$hostWhatsappRepositoryHash() =>
    r'69cc1fc0a9ada8767ef4aead1cd7cfdefac767d3';

@ProviderFor(hostMessagingSetup)
final hostMessagingSetupProvider = HostMessagingSetupFamily._();

final class HostMessagingSetupProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostMessagingSetup>,
          HostMessagingSetup,
          FutureOr<HostMessagingSetup>
        >
    with
        $FutureModifier<HostMessagingSetup>,
        $FutureProvider<HostMessagingSetup> {
  HostMessagingSetupProvider._({
    required HostMessagingSetupFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostMessagingSetupProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostMessagingSetupHash();

  @override
  String toString() {
    return r'hostMessagingSetupProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostMessagingSetup> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostMessagingSetup> create(Ref ref) {
    final argument = this.argument as String;
    return hostMessagingSetup(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostMessagingSetupProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostMessagingSetupHash() =>
    r'6337a62f3d9af92c945ef4f8daddbb924356c721';

final class HostMessagingSetupFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostMessagingSetup>, String> {
  HostMessagingSetupFamily._()
    : super(
        retry: null,
        name: r'hostMessagingSetupProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostMessagingSetupProvider call(String organizerId) =>
      HostMessagingSetupProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostMessagingSetupProvider';
}

/// The organizer's WhatsApp threads, a page at a time, every row shown
/// live. Threads past their retention are left out.

@ProviderFor(HostWhatsappThreadPages)
final hostWhatsappThreadPagesProvider = HostWhatsappThreadPagesFamily._();

/// The organizer's WhatsApp threads, a page at a time, every row shown
/// live. Threads past their retention are left out.
final class HostWhatsappThreadPagesProvider
    extends
        $StreamNotifierProvider<
          HostWhatsappThreadPages,
          LivePages<HostWhatsappThreadSummary>
        > {
  /// The organizer's WhatsApp threads, a page at a time, every row shown
  /// live. Threads past their retention are left out.
  HostWhatsappThreadPagesProvider._({
    required HostWhatsappThreadPagesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostWhatsappThreadPagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostWhatsappThreadPagesHash();

  @override
  String toString() {
    return r'hostWhatsappThreadPagesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostWhatsappThreadPages create() => HostWhatsappThreadPages();

  @override
  bool operator ==(Object other) {
    return other is HostWhatsappThreadPagesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostWhatsappThreadPagesHash() =>
    r'e0e733faced34f3b94b5145d7eb52a7aca621970';

/// The organizer's WhatsApp threads, a page at a time, every row shown
/// live. Threads past their retention are left out.

final class HostWhatsappThreadPagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostWhatsappThreadPages,
          AsyncValue<LivePages<HostWhatsappThreadSummary>>,
          LivePages<HostWhatsappThreadSummary>,
          Stream<LivePages<HostWhatsappThreadSummary>>,
          String
        > {
  HostWhatsappThreadPagesFamily._()
    : super(
        retry: null,
        name: r'hostWhatsappThreadPagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's WhatsApp threads, a page at a time, every row shown
  /// live. Threads past their retention are left out.

  HostWhatsappThreadPagesProvider call(String organizerId) =>
      HostWhatsappThreadPagesProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostWhatsappThreadPagesProvider';
}

/// The organizer's WhatsApp threads, a page at a time, every row shown
/// live. Threads past their retention are left out.

abstract class _$HostWhatsappThreadPages
    extends $StreamNotifier<LivePages<HostWhatsappThreadSummary>> {
  late final _$args = ref.$arg as String;
  String get organizerId => _$args;

  Stream<LivePages<HostWhatsappThreadSummary>> build(String organizerId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<LivePages<HostWhatsappThreadSummary>>,
              LivePages<HostWhatsappThreadSummary>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<LivePages<HostWhatsappThreadSummary>>,
                LivePages<HostWhatsappThreadSummary>
              >,
              AsyncValue<LivePages<HostWhatsappThreadSummary>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The WhatsApp threads opened so far, live: the first page until the
/// inbox asks for more.

@ProviderFor(hostWhatsappThreads)
final hostWhatsappThreadsProvider = HostWhatsappThreadsFamily._();

/// The WhatsApp threads opened so far, live: the first page until the
/// inbox asks for more.

final class HostWhatsappThreadsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostWhatsappThreadSummary>>,
          List<HostWhatsappThreadSummary>,
          FutureOr<List<HostWhatsappThreadSummary>>
        >
    with
        $FutureModifier<List<HostWhatsappThreadSummary>>,
        $FutureProvider<List<HostWhatsappThreadSummary>> {
  /// The WhatsApp threads opened so far, live: the first page until the
  /// inbox asks for more.
  HostWhatsappThreadsProvider._({
    required HostWhatsappThreadsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostWhatsappThreadsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostWhatsappThreadsHash();

  @override
  String toString() {
    return r'hostWhatsappThreadsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<HostWhatsappThreadSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<HostWhatsappThreadSummary>> create(Ref ref) {
    final argument = this.argument as String;
    return hostWhatsappThreads(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostWhatsappThreadsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostWhatsappThreadsHash() =>
    r'ca4db5d221e4a7a1c156c796b1dfa948a14955c2';

/// The WhatsApp threads opened so far, live: the first page until the
/// inbox asks for more.

final class HostWhatsappThreadsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<HostWhatsappThreadSummary>>,
          String
        > {
  HostWhatsappThreadsFamily._()
    : super(
        retry: null,
        name: r'hostWhatsappThreadsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The WhatsApp threads opened so far, live: the first page until the
  /// inbox asks for more.

  HostWhatsappThreadsProvider call(String organizerId) =>
      HostWhatsappThreadsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostWhatsappThreadsProvider';
}
