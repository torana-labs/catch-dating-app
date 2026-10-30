// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_draft_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventDraftRepository)
final eventDraftRepositoryProvider = EventDraftRepositoryProvider._();

final class EventDraftRepositoryProvider
    extends
        $FunctionalProvider<
          EventDraftRepository,
          EventDraftRepository,
          EventDraftRepository
        >
    with $Provider<EventDraftRepository> {
  EventDraftRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventDraftRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventDraftRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventDraftRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventDraftRepository create(Ref ref) {
    return eventDraftRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventDraftRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventDraftRepository>(value),
    );
  }
}

String _$eventDraftRepositoryHash() =>
    r'da8ec131054175bd2e0ee02967754cff84e94e0d';

@ProviderFor(organizerEventDrafts)
final organizerEventDraftsProvider = OrganizerEventDraftsFamily._();

final class OrganizerEventDraftsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventDraft>>,
          List<EventDraft>,
          FutureOr<List<EventDraft>>
        >
    with $FutureModifier<List<EventDraft>>, $FutureProvider<List<EventDraft>> {
  OrganizerEventDraftsProvider._({
    required OrganizerEventDraftsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'clubEventDraftsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerEventDraftsHash();

  @override
  String toString() {
    return r'clubEventDraftsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<EventDraft>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<EventDraft>> create(Ref ref) {
    final argument = this.argument as String;
    return organizerEventDrafts(ref, clubId: argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerEventDraftsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerEventDraftsHash() => r'627777152f72522e3a2bf645a6f0cc562ebe07b8';

final class OrganizerEventDraftsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<EventDraft>>, String> {
  OrganizerEventDraftsFamily._()
    : super(
        retry: null,
        name: r'clubEventDraftsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  OrganizerEventDraftsProvider call({required String clubId}) =>
      OrganizerEventDraftsProvider._(argument: clubId, from: this);

  @override
  String toString() => r'clubEventDraftsProvider';
}
