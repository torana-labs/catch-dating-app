// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_person_conversation_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One WhatsApp conversation while it is open, live: a new customer message
/// or a reply shows without a reload. Null until the thread has a view.

@ProviderFor(hostPersonWhatsappDetail)
final hostPersonWhatsappDetailProvider = HostPersonWhatsappDetailFamily._();

/// One WhatsApp conversation while it is open, live: a new customer message
/// or a reply shows without a reload. Null until the thread has a view.

final class HostPersonWhatsappDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostWhatsappThreadDetail?>,
          HostWhatsappThreadDetail?,
          Stream<HostWhatsappThreadDetail?>
        >
    with
        $FutureModifier<HostWhatsappThreadDetail?>,
        $StreamProvider<HostWhatsappThreadDetail?> {
  /// One WhatsApp conversation while it is open, live: a new customer message
  /// or a reply shows without a reload. Null until the thread has a view.
  HostPersonWhatsappDetailProvider._({
    required HostPersonWhatsappDetailFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostPersonWhatsappDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostPersonWhatsappDetailHash();

  @override
  String toString() {
    return r'hostPersonWhatsappDetailProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<HostWhatsappThreadDetail?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostWhatsappThreadDetail?> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostPersonWhatsappDetail(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostPersonWhatsappDetailProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostPersonWhatsappDetailHash() =>
    r'7434f5b46b4b2d3e277a4589fd4146d5133a2015';

/// One WhatsApp conversation while it is open, live: a new customer message
/// or a reply shows without a reload. Null until the thread has a view.

final class HostPersonWhatsappDetailFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<HostWhatsappThreadDetail?>,
          (String, String)
        > {
  HostPersonWhatsappDetailFamily._()
    : super(
        retry: null,
        name: r'hostPersonWhatsappDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One WhatsApp conversation while it is open, live: a new customer message
  /// or a reply shows without a reload. Null until the thread has a view.

  HostPersonWhatsappDetailProvider call(String organizerId, String threadId) =>
      HostPersonWhatsappDetailProvider._(
        argument: (organizerId, threadId),
        from: this,
      );

  @override
  String toString() => r'hostPersonWhatsappDetailProvider';
}

@ProviderFor(hostPersonConversationController)
final hostPersonConversationControllerProvider =
    HostPersonConversationControllerProvider._();

final class HostPersonConversationControllerProvider
    extends
        $FunctionalProvider<
          HostPersonConversationController,
          HostPersonConversationController,
          HostPersonConversationController
        >
    with $Provider<HostPersonConversationController> {
  HostPersonConversationControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostPersonConversationControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostPersonConversationControllerHash();

  @$internal
  @override
  $ProviderElement<HostPersonConversationController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostPersonConversationController create(Ref ref) {
    return hostPersonConversationController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostPersonConversationController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostPersonConversationController>(
        value,
      ),
    );
  }
}

String _$hostPersonConversationControllerHash() =>
    r'69c71c32aead454bb96be93842d65b640f47e1bd';
