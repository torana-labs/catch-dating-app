import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_view.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_default_view_reads.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_draft_restore.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_controller.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'create_controller.g.dart';

/// One create session: who is creating, for which organizer, and what it
/// starts from. The screen keeps one instance, so the provider family keys
/// on its identity.
class CreateFlowArgs {
  CreateFlowArgs({
    required this.organizer,
    required this.userId,
    this.initialDraft,
    this.initialPrefill,
    this.initialSavedEventId,
    this.externalBookingMode = false,
  });

  final Organizer organizer;
  final String userId;
  final EventDraft? initialDraft;
  final CreateEventPrefill? initialPrefill;
  final String? initialSavedEventId;
  final bool externalBookingMode;
}

/// The create flow: the draft as the form, the create command once the
/// basics and the date are in, and the details, preferences and publication
/// commands after it. The event's setup view reaches it through the three
/// setup controllers, which follow their listeners; nothing here polls.
@riverpod
class CreateController extends _$CreateController {
  late String _requestId;
  String? _submittedSignature;
  bool _hydrated = false;
  final _subscriptions = <ProviderSubscription<Object?>>[];

  @override
  CreateFlowState build(CreateFlowArgs args) {
    // Keep the draft and command owner alive across the commands' awaits.
    ref.listen(createEventDraftControllerProvider, (_, _) {});
    ref.onDispose(() {
      for (final subscription in _subscriptions) {
        subscription.close();
      }
    });
    final starting = args.initialDraft ?? args.initialPrefill?.values;
    final draft =
        (starting ??
                EventDraft(
                  id: newPrivateEventRequestId(),
                  organizerId: args.organizer.id,
                  savedAt: DateTime.now(),
                ))
            .copyWith(
              id: args.initialDraft?.id ?? newPrivateEventRequestId(),
              externalBookingMode:
                  starting?.externalBookingMode ?? args.externalBookingMode,
            );
    _requestId = draft.eventCreateRequestId ?? newPrivateEventRequestId();
    _submittedSignature = draft.eventCreatePayloadSignature;
    final eventId = args.initialSavedEventId ?? draft.eventCreateReceiptEventId;
    _hydrated = args.initialSavedEventId == null;
    if (eventId != null) {
      Future.microtask(() => _follow(eventId));
    }
    return CreateFlowState(
      organizer: args.organizer,
      draft: draft,
      eventId: eventId,
      loadingSaved: args.initialSavedEventId != null,
    );
  }

  PrivateEventDetailsScope _scope(String eventId) =>
      (userId: args.userId, organizerId: args.organizer.id, eventId: eventId);

  // ---- the form ----

  void edit(EventDraft Function(EventDraft draft) change) {
    state = state.copyWith(
      draft: change(state.draft),
      problems: const <CreateProblem>{},
      clearError: true,
    );
  }

  void setFormat(CreateFormat format) => edit(
    (draft) => draft.copyWith(
      activityKind: format.activityKind.name,
      interactionModel: format.activityKind.defaultInteractionModel.name,
    ),
  );

  void setDate(DateTime date) =>
      edit((draft) => draft.copyWith(eventLocalDate: _localDate(date)));

  void setStart(int hour, int minute) => edit(
    (draft) => draft.copyWith(eventLocalStartTime: _localTime(hour, minute)),
  );

  /// The end as minutes after the start, crossing midnight when earlier.
  void setEnd(int hour, int minute) {
    final start = _minutesOf(state.draft.eventLocalStartTime);
    if (start == null) return;
    var duration = hour * 60 + minute - start;
    if (duration <= 0) duration += 24 * 60;
    edit((draft) => draft.copyWith(durationMinutes: duration));
  }

  void setPlace(EventMeetingLocation place) => edit(
    (draft) => draft.copyWith(
      meetingPoint: place.name,
      meetingLocationAddress: place.address,
      meetingLocationPlaceId: place.placeId,
      startingPointLat: place.latitude,
      startingPointLng: place.longitude,
    ),
  );

  void useTemplate(List<EventItineraryItem> steps) =>
      edit((draft) => draft.copyWith(itinerary: steps));

  void putStep(EventItineraryItem step) => edit((draft) {
    final steps = [...draft.itinerary];
    final index = steps.indexWhere((item) => item.id == step.id);
    if (index == -1) {
      steps.add(step);
    } else {
      steps[index] = step;
    }
    return draft.copyWith(itinerary: _sequenced(steps));
  });

  void removeStep(String id) => edit(
    (draft) => draft.copyWith(
      itinerary: _sequenced(
        draft.itinerary.where((item) => item.id != id).toList(),
      ),
    ),
  );

  void goTo(CreateStep step) {
    if (state.working || step == CreateStep.share) return;
    state = state.copyWith(step: step, problems: const {}, clearError: true);
  }

  /// Back one step; false on the first step, where back closes.
  bool back() {
    if (state.step == CreateStep.basics || state.step == CreateStep.share) {
      return false;
    }
    goTo(CreateStep.values[state.step.index - 1]);
    return true;
  }

  // ---- drafts ----

  Future<void> saveDraft() async {
    if (state.savingDraft) return;
    state = state.copyWith(savingDraft: true, clearError: true);
    try {
      await _persistDraft();
    } catch (error) {
      state = state.copyWith(error: error);
    } finally {
      if (ref.mounted) state = state.copyWith(savingDraft: false);
    }
  }

  Future<void> _persistDraft() async {
    final draft = state.draft.copyWith(
      savedAt: DateTime.now(),
      eventCreateRequestId: _requestId,
      eventCreatePayloadSignature: _submittedSignature,
      eventCreatePayloadJson: _submittedSignature,
      eventCreateReceiptEventId: state.eventId,
    );
    await ref
        .read(createEventDraftControllerProvider.notifier)
        .saveDraft(draft);
    if (!ref.mounted) return;
    state = state.copyWith(draft: draft);
    ref.invalidate(
      organizerEventDraftsProvider(organizerId: args.organizer.id),
    );
  }

  Future<void> _deleteDraft() async {
    try {
      await ref
          .read(createEventDraftControllerProvider.notifier)
          .deleteDraft(organizerId: args.organizer.id, draftId: state.draft.id);
      ref.invalidate(
        organizerEventDraftsProvider(organizerId: args.organizer.id),
      );
    } catch (error, stackTrace) {
      // The event is live; a stale local draft only reappears in the list.
      debugPrint('Could not delete the create draft: $error\n$stackTrace');
    }
  }

  // ---- the steps' commands ----

  /// Checks the current step and sends its command, then moves on. On the
  /// plan step this publishes.
  Future<void> next() async {
    if (state.working) return;
    final problems = _problems(state.step);
    if (problems.isNotEmpty) {
      state = state.copyWith(problems: problems);
      return;
    }
    state = state.copyWith(working: true, clearError: true);
    try {
      switch (state.step) {
        case CreateStep.basics:
          if (state.eventId != null) await _saveDetails(_basicsPatch());
          _advance(CreateStep.when);
        case CreateStep.when:
          await _saveBasics();
          await _saveDetails(_basicsPatch(includeWhere: true));
          _advance(CreateStep.tickets);
        case CreateStep.tickets:
          await _saveTickets();
          _advance(CreateStep.plan);
        case CreateStep.plan:
          await _publish();
        case CreateStep.share:
          break;
      }
    } catch (error) {
      if (ref.mounted) state = state.copyWith(error: error);
    } finally {
      if (ref.mounted) state = state.copyWith(working: false);
    }
  }

  void _advance(CreateStep step) {
    if (ref.mounted) state = state.copyWith(step: step);
  }

  Set<CreateProblem> _problems(CreateStep step) {
    final draft = state.draft;
    return switch (step) {
      CreateStep.basics => {
        if ((draft.name ?? '').trim().isEmpty) CreateProblem.name,
        if (state.format == null) CreateProblem.format,
      },
      CreateStep.when => {
        if (draft.eventLocalDate == null) CreateProblem.date,
        if (draft.eventLocalStartTime == null) CreateProblem.start,
      },
      CreateStep.tickets => {
        if (!draft.externalBookingMode && _pricePaise(draft.price) == null)
          CreateProblem.price,
      },
      CreateStep.plan || CreateStep.share => const {},
    };
  }

  Future<PrivateEventBasics> _basics() async {
    final draft = state.draft;
    var cityId = args.organizer.locationCityId;
    var marketId = args.organizer.locationMarketId;
    String? timezone;
    try {
      final defaults = await firstCompleteDefaultsView(
        ref
            .read(hostEventSetupDefaultViewReadsProvider)
            .watch(args.organizer.id),
      );
      if (defaults.cityId != null && defaults.marketId != null) {
        cityId = defaults.cityId!;
        marketId = defaults.marketId!;
      }
      timezone = defaults.timezone;
    } on Object catch (error, stackTrace) {
      // Without the defaults view the organizer's own city stands in.
      debugPrint('Organizer defaults unavailable: $error\n$stackTrace');
    }
    final city = defaultCityOptions
        .where(
          (option) =>
              option.effectiveCityId == cityId &&
              option.effectiveMarketId == marketId,
        )
        .firstOrNull;
    return PrivateEventBasics(
      name: (draft.name ?? '').trim(),
      city: EventSetupValue.set(
        EventSetupCity(cityId: cityId, marketId: marketId),
      ),
      localDate: draft.eventLocalDate!,
      localStartTime: draft.eventLocalStartTime!,
      timezone: EventSetupValue.set(
        timezone ??
            city?.timeZone ??
            args.organizer.hostDefaults.timezone ??
            '',
      ),
    );
  }

  /// The create command the first time; afterwards the basics update when
  /// the name, date or start changed.
  Future<void> _saveBasics() async {
    final basics = await _basics();
    if (!basics.isValid) throw const FormatException('Invalid event basics');
    final commands = ref.read(createEventDraftControllerProvider.notifier);
    final eventId = state.eventId;
    if (eventId == null) {
      final signature = _submittedSignature ?? jsonEncode(basics.toJson());
      // The exact idempotency key and body are stored before the call, so a
      // lost response or a restart resumes this same request.
      _submittedSignature = signature;
      await _persistDraft();
      final receipt = await commands.createPrivateEvent(
        organizerId: args.organizer.id,
        requestId: _requestId,
        basics: PrivateEventBasics.fromJson(
          Map<String, dynamic>.from(jsonDecode(signature) as Map),
        ),
      );
      if (!ref.mounted) return;
      state = state.copyWith(eventId: receipt.eventId);
      await _persistDraft();
      _follow(receipt.eventId);
      await _until(
        privateEventDetailsControllerProvider(_scope(receipt.eventId)),
        (s) => (s.event?.setupRevision ?? 0) >= receipt.setupRevision,
      );
      return;
    }
    final event = ref
        .read(privateEventDetailsControllerProvider(_scope(eventId)))
        .event;
    if (event == null ||
        (event.name == basics.name &&
            event.localDate == basics.localDate &&
            event.localStartTime == basics.localStartTime)) {
      return;
    }
    final request = PrivateEventBasicsUpdateRequest(
      organizerId: args.organizer.id,
      eventId: eventId,
      requestId: newPrivateEventRequestId(),
      expectedSetupRevision: event.setupRevision,
      basics: PrivateEventBasics(
        name: basics.name,
        city: EventSetupValue.set(event.city),
        localDate: basics.localDate,
        localStartTime: basics.localStartTime,
        timezone: EventSetupValue.set(event.timezone),
      ),
    );
    await commands.savePendingBasicsUpdate(request);
    final receipt = await commands.updatePrivateEventBasics(request);
    await commands.clearPendingBasicsUpdate(request);
    await _until(
      privateEventDetailsControllerProvider(_scope(eventId)),
      (s) => (s.event?.setupRevision ?? 0) >= receipt.setupRevision,
    );
  }

  PrivateEventDetailsPatch _basicsPatch({bool includeWhere = false}) {
    final draft = state.draft;
    final format = state.format;
    final description = (draft.description ?? '').trim();
    final distance = double.tryParse(draft.distance ?? '');
    final lat = draft.startingPointLat;
    final lng = draft.startingPointLng;
    return PrivateEventDetailsPatch(
      eventFormat: format == null
          ? null
          : EventSetupValue.set(
              EventFormatSnapshot.fromActivityKind(format.activityKind),
            ),
      description: description.isEmpty ? null : description,
      distanceKm: format == CreateFormat.run ? distance : null,
      pace: format == CreateFormat.run ? draft.paceName : null,
      durationMinutes: includeWhere
          ? EventSetupValue.set(draft.durationMinutes)
          : null,
      meetingLocation:
          includeWhere &&
              draft.meetingPoint != null &&
              lat != null &&
              lng != null
          ? EventMeetingLocation(
              name: draft.meetingPoint!,
              address: draft.meetingLocationAddress,
              placeId: draft.meetingLocationPlaceId,
              latitude: lat,
              longitude: lng,
              notes: (draft.locationDetails ?? '').trim().isEmpty
                  ? null
                  : draft.locationDetails!.trim(),
            )
          : null,
    );
  }

  Future<void> _saveDetails(PrivateEventDetailsPatch patch) async {
    final eventId = state.eventId;
    if (eventId == null || !patch.isValid) return;
    final provider = privateEventDetailsControllerProvider(_scope(eventId));
    var current = await _until(provider, (s) => s.canEdit || s.error != null);
    if (current.error != null) throw current.error!;
    if (patch.eventFormat != null && !current.canEditFormat) {
      patch = PrivateEventDetailsPatch(
        description: patch.description,
        durationMinutes: patch.durationMinutes,
        meetingLocation: patch.meetingLocation,
        itinerary: patch.itinerary,
        admissionTerms: patch.admissionTerms,
      );
      if (!patch.isValid) return;
    }
    await ref.read(provider.notifier).save(patch);
    current = await _until(
      provider,
      (s) => (s.pending == null && !s.saving) || s.error != null,
    );
    if (current.error != null) throw current.error!;
  }

  Future<void> _saveTickets() async {
    final draft = state.draft;
    if (!draft.externalBookingMode) {
      final price = _pricePaise(draft.price)!;
      await _saveDetails(
        PrivateEventDetailsPatch(
          admissionTerms: PrivateEventAdmissionTerms(
            capacityLimit: int.tryParse(draft.capacity ?? '') ?? 30,
            priceInPaise: price,
            currency: 'INR',
            cancellationPolicyId: price == 0 ? 'notApplicable' : 'standard',
          ),
        ),
      );
    }
    final eventId = state.eventId;
    if (eventId == null) return;
    final provider = privateEventPreferencesControllerProvider(_scope(eventId));
    var current = await _until(provider, (s) => s.canEdit || s.error != null);
    if (current.error != null) throw current.error!;
    final intents = current.intents;
    if (intents.admissionPreset.value == state.admission.preset) return;
    await ref
        .read(provider.notifier)
        .save(
          PrivateEventPreferenceIntents(
            usualDurationMinutes: intents.usualDurationMinutes,
            preferredVenueId: intents.preferredVenueId,
            offerValidityMinutes: intents.offerValidityMinutes,
            collectionPreference: intents.collectionPreference,
            currency: intents.currency,
            offerMessageTemplate: intents.offerMessageTemplate,
            paymentInstructions: intents.paymentInstructions,
            reusablePaymentPage: intents.reusablePaymentPage,
            admissionPreset: EventSetupValue.set(state.admission.preset),
            expectedAmountMinor: intents.expectedAmountMinor,
          ),
        );
    current = await _until(
      provider,
      (s) => (!s.hasPending && !s.saving) || s.error != null,
    );
    if (current.error != null) throw current.error!;
  }

  Future<void> _publish() async {
    final eventId = state.eventId;
    if (eventId == null) return;
    if (state.draft.itinerary.isNotEmpty) {
      await _saveDetails(
        PrivateEventDetailsPatch(itinerary: state.draft.itinerary),
      );
    }
    final provider = eventPublicationControllerProvider(_scope(eventId));
    var current = await _until(
      provider,
      (s) => (s.canChange && s.event != null) || s.error != null,
    );
    if (current.error != null) throw current.error!;
    if (!current.canPublish) return;
    await ref.read(provider.notifier).changeTo('published');
    current = await _until(
      provider,
      (s) => s.event?.publicationState == 'published' || s.error != null,
    );
    if (current.error != null) throw current.error!;
    if (!ref.mounted) return;
    state = state.copyWith(published: true, step: CreateStep.share);
    unawaited(_deleteDraft());
  }

  Future<void> addPhotos() async {
    final eventId = state.eventId;
    if (eventId == null || !state.canAddPhotos) return;
    await ref
        .read(privateEventDetailsControllerProvider(_scope(eventId)).notifier)
        .addPhotos();
  }

  // ---- the setup views ----

  void _follow(String eventId) {
    if (!ref.mounted || _subscriptions.isNotEmpty) return;
    final scope = _scope(eventId);
    _subscriptions
      ..add(
        ref.listen<PrivateEventDetailsState>(
          privateEventDetailsControllerProvider(scope),
          (_, details) => _onDetails(details),
          fireImmediately: true,
        ),
      )
      ..add(
        ref.listen<EventPublicationState>(
          eventPublicationControllerProvider(scope),
          (_, publication) => _onPublication(publication),
          fireImmediately: true,
        ),
      )
      ..add(
        ref.listen<EventPreferencesEditorState>(
          privateEventPreferencesControllerProvider(scope),
          (_, preferences) => _onPreferences(preferences),
          fireImmediately: true,
        ),
      );
    unawaited(
      ref.read(privateEventDetailsControllerProvider(scope).notifier).load(),
    );
    unawaited(
      ref.read(eventPublicationControllerProvider(scope).notifier).load(),
    );
    unawaited(
      ref
          .read(privateEventPreferencesControllerProvider(scope).notifier)
          .load(),
    );
  }

  void _onDetails(PrivateEventDetailsState details) {
    final event = details.event;
    var draft = state.draft;
    if (event != null && !_hydrated) {
      _hydrated = true;
      draft = _draftFrom(draft, event);
    }
    state = state.copyWith(
      draft: draft,
      loadingSaved: event == null && details.error == null && !_hydrated,
      canAddPhotos: details.canAddPhotos,
      uploadingPhotos: details.uploading,
      photoUrls: [
        for (final photo in event?.eventDetails.eventPhotos ?? const <Never>[])
          photo.url,
      ],
      published: event?.publicationState == 'published',
    );
  }

  void _onPublication(EventPublicationState publication) {
    final readiness = publication.event?.publicationReadiness;
    state = state.copyWith(stillToSet: readiness?.missing ?? const []);
  }

  void _onPreferences(EventPreferencesEditorState preferences) {
    final preset = preferences.intents.admissionPreset.value;
    if (preset != null && state.draft.admissionPreset == null) {
      state = state.copyWith(
        draft: state.draft.copyWith(admissionPreset: preset),
      );
    }
  }

  EventDraft _draftFrom(EventDraft draft, PrivateEventBasicSummary event) {
    final details = event.eventDetails;
    final terms = details.admissionTerms;
    final place = details.meetingLocation;
    final start = _minutesOf(event.localStartTime);
    final end = details.endTimeMillis;
    return draft.copyWith(
      name: event.name,
      eventLocalDate: event.localDate,
      eventLocalStartTime: event.localStartTime,
      description: details.description ?? draft.description,
      activityKind:
          details.eventFormat?.activityKind.name ?? draft.activityKind,
      interactionModel:
          details.eventFormat?.interactionModel.name ?? draft.interactionModel,
      itinerary: details.itinerary.isEmpty
          ? draft.itinerary
          : details.itinerary,
      capacity: terms?.capacityLimit.toString() ?? draft.capacity,
      price: terms == null
          ? draft.price
          : (terms.priceInPaise ~/ 100).toString(),
      meetingPoint: place?.name ?? draft.meetingPoint,
      meetingLocationAddress: place?.address ?? draft.meetingLocationAddress,
      meetingLocationPlaceId: place?.placeId ?? draft.meetingLocationPlaceId,
      startingPointLat: place?.latitude ?? draft.startingPointLat,
      startingPointLng: place?.longitude ?? draft.startingPointLng,
      locationDetails: place?.notes ?? draft.locationDetails,
      distance: details.distanceKm?.toString() ?? draft.distance,
      paceName: details.pace ?? draft.paceName,
      durationMinutes: end != null && start != null
          ? ((end - event.startTimeMillis) ~/ 60000)
          : draft.durationMinutes,
    );
  }

  /// The first value of [provider] that [ready] accepts.
  Future<T> _until<T>(ProviderListenable<T> provider, bool Function(T) ready) {
    final done = Completer<T>();
    ProviderSubscription<T>? subscription;
    subscription = ref.listen<T>(provider, (_, next) {
      if (!done.isCompleted && ready(next)) done.complete(next);
    }, fireImmediately: true);
    // Close once answered; the first value may already have answered.
    unawaited(done.future.whenComplete(() => subscription?.close()));
    return done.future;
  }
}

String _localDate(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-'
    '${date.month.toString().padLeft(2, '0')}-'
    '${date.day.toString().padLeft(2, '0')}';

String _localTime(int hour, int minute) =>
    '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';

int? _minutesOf(String? localTime) {
  final parts = localTime?.split(':');
  if (parts == null || parts.length != 2) return null;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) return null;
  return hour * 60 + minute;
}

/// Whole rupees entered by the host, in paise; null when not a price.
int? _pricePaise(String? rupees) {
  final value = int.tryParse((rupees ?? '').trim());
  if (value == null || value < 0) return null;
  return value * 100;
}

/// Plan steps start where the one before ends.
List<EventItineraryItem> _sequenced(List<EventItineraryItem> steps) {
  var offset = 0;
  return [
    for (final step in steps)
      () {
        final placed = step.copyWith(offsetMinutes: offset);
        offset += step.durationMinutes ?? 0;
        return placed;
      }(),
  ];
}
