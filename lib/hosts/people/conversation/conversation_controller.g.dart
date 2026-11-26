// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'conversation_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The reply drafts for the signed-in account: kept while the Host app
/// runs so a draft survives moving between conversations, and dropped with
/// the account.

@ProviderFor(hostConversationDrafts)
final hostConversationDraftsProvider = HostConversationDraftsProvider._();

/// The reply drafts for the signed-in account: kept while the Host app
/// runs so a draft survives moving between conversations, and dropped with
/// the account.

final class HostConversationDraftsProvider
    extends
        $FunctionalProvider<HostReplyDrafts, HostReplyDrafts, HostReplyDrafts>
    with $Provider<HostReplyDrafts> {
  /// The reply drafts for the signed-in account: kept while the Host app
  /// runs so a draft survives moving between conversations, and dropped with
  /// the account.
  HostConversationDraftsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostConversationDraftsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostConversationDraftsHash();

  @$internal
  @override
  $ProviderElement<HostReplyDrafts> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HostReplyDrafts create(Ref ref) {
    return hostConversationDrafts(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostReplyDrafts value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostReplyDrafts>(value),
    );
  }
}

String _$hostConversationDraftsHash() =>
    r'57a18c3ef2569f424e1f77b67e684f05c5cc0f27';

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

/// One person's conversation with the organizer, composed from the
/// account, the organizer's events, the Catch conversations listener and
/// its older pages, the WhatsApp threads listener and, per source, the
/// conversation document, its messages and older history, or the live
/// WhatsApp thread. A programme scope reads only that programme's verified
/// identity: no source carries per-message programme provenance, so no
/// person is resolved there.

@ProviderFor(hostConversationController)
final hostConversationControllerProvider = HostConversationControllerFamily._();

/// One person's conversation with the organizer, composed from the
/// account, the organizer's events, the Catch conversations listener and
/// its older pages, the WhatsApp threads listener and, per source, the
/// conversation document, its messages and older history, or the live
/// WhatsApp thread. A programme scope reads only that programme's verified
/// identity: no source carries per-message programme provenance, so no
/// person is resolved there.

final class HostConversationControllerProvider
    extends
        $FunctionalProvider<
          HostConversationState,
          HostConversationState,
          HostConversationState
        >
    with $Provider<HostConversationState> {
  /// One person's conversation with the organizer, composed from the
  /// account, the organizer's events, the Catch conversations listener and
  /// its older pages, the WhatsApp threads listener and, per source, the
  /// conversation document, its messages and older history, or the live
  /// WhatsApp thread. A programme scope reads only that programme's verified
  /// identity: no source carries per-message programme provenance, so no
  /// person is resolved there.
  HostConversationControllerProvider._({
    required HostConversationControllerFamily super.from,
    required HostConversationRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostConversationControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostConversationControllerHash();

  @override
  String toString() {
    return r'hostConversationControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostConversationState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostConversationState create(Ref ref) {
    final argument = this.argument as HostConversationRequest;
    return hostConversationController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostConversationState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostConversationState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostConversationControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostConversationControllerHash() =>
    r'148ea37a81993c18a02eb0fa224d8d46d263ad2e';

/// One person's conversation with the organizer, composed from the
/// account, the organizer's events, the Catch conversations listener and
/// its older pages, the WhatsApp threads listener and, per source, the
/// conversation document, its messages and older history, or the live
/// WhatsApp thread. A programme scope reads only that programme's verified
/// identity: no source carries per-message programme provenance, so no
/// person is resolved there.

final class HostConversationControllerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          HostConversationState,
          HostConversationRequest
        > {
  HostConversationControllerFamily._()
    : super(
        retry: null,
        name: r'hostConversationControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One person's conversation with the organizer, composed from the
  /// account, the organizer's events, the Catch conversations listener and
  /// its older pages, the WhatsApp threads listener and, per source, the
  /// conversation document, its messages and older history, or the live
  /// WhatsApp thread. A programme scope reads only that programme's verified
  /// identity: no source carries per-message programme provenance, so no
  /// person is resolved there.

  HostConversationControllerProvider call(HostConversationRequest request) =>
      HostConversationControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostConversationControllerProvider';
}

/// The conversation commands: mark a Catch conversation read and reply on
/// a WhatsApp thread. Catch replies and photos go through the shared chat
/// controller.

@ProviderFor(hostConversationCommands)
final hostConversationCommandsProvider = HostConversationCommandsProvider._();

/// The conversation commands: mark a Catch conversation read and reply on
/// a WhatsApp thread. Catch replies and photos go through the shared chat
/// controller.

final class HostConversationCommandsProvider
    extends
        $FunctionalProvider<
          HostConversationCommands,
          HostConversationCommands,
          HostConversationCommands
        >
    with $Provider<HostConversationCommands> {
  /// The conversation commands: mark a Catch conversation read and reply on
  /// a WhatsApp thread. Catch replies and photos go through the shared chat
  /// controller.
  HostConversationCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostConversationCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostConversationCommandsHash();

  @$internal
  @override
  $ProviderElement<HostConversationCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostConversationCommands create(Ref ref) {
    return hostConversationCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostConversationCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostConversationCommands>(value),
    );
  }
}

String _$hostConversationCommandsHash() =>
    r'2d360a9277cc96f15cf6ef503644806ea75b51ca';
