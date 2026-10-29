import 'dart:async';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_offer_workspace_policy.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_offer_workspace_existing_offer.dart';
part 'host_event_offer_workspace_state.dart';

part 'host_event_offer_workspace_controller.g.dart';
part 'host_event_offer_workspace_controller.freezed.dart';

@Riverpod(dependencies: [hostEventOfferWorkspaceDependencies])
class HostEventOfferWorkspaceController
    extends _$HostEventOfferWorkspaceController {
  late HostEventOfferWorkspaceDependencies _dependencies;
  int _generation = 0;
  @override
  HostEventOfferWorkspaceState build(HostEventOfferWorkspaceScope scope) {
    _dependencies = ref.read(
      hostEventOfferWorkspaceDependenciesProvider(scope),
    );
    ref.listen(
      hostEventOfferWorkspaceDependenciesProvider(scope),
      (_, next) => _dependencies = next,
    );
    final query = _dependencies.queryController;
    query?.addListener(_onQueryChanged);
    ref.onDispose(() {
      _generation++;
      query?.removeListener(_onQueryChanged);
    });
    final flow = ref.read(hostEventOfferControllerProvider(scope.offers));
    ref.listen(hostEventOfferControllerProvider(scope.offers), (_, next) {
      if (!next.actorAvailable) {
        invalidateActor();
        return;
      }
      if (!_active) return;
      state = state.copyWith(offerFlow: next);
      _onOfferChanged();
    });
    ref.listen(uidProvider, (_, next) {
      if (next.asData?.value != scope.offers.accountId) invalidateActor();
    });
    return HostEventOfferWorkspaceState(
      offerFlow: flow,
      actorAvailable: flow.actorAvailable,
    );
  }

  bool get _active => ref.mounted && state.actorAvailable;
  void invalidateActor() {
    if (!ref.mounted) return;
    _generation++;
    state = const HostEventOfferWorkspaceState(actorAvailable: false);
  }

  HostEventOfferController get _offerController =>
      ref.read(hostEventOfferControllerProvider(scope.offers).notifier);
  HostOfferFlowView get _offerFlow =>
      ref.read(hostEventOfferControllerProvider(scope.offers));
  String? get _accountId => scope.offers.accountId;
  bool get _hasUnresolvedCommand => state.hasUnresolvedCommand;
  bool get _canCancelPreparation => _active && state.canCancelPreparation;
  String get _organizerId => _dependencies.organizerId;
  HostResponseQueryController? get _queryController =>
      _dependencies.queryController;
  String? get _responseId => _dependencies.responseId;
  Future<Map<String, Object?>> Function({
    required String organizerId,
    required String eventId,
    String? afterOfferId,
  })
  get _listOffers => _dependencies.listOffers;
  Future<HostEventOffer> Function({
    required String organizerId,
    required String eventId,
    required String contactId,
  })
  get _getOffer => _dependencies.getOffer;
  Future<HostOfferHandoff> Function({required HostEventOffer offer})
  get _prepareHandoff => _dependencies.prepareHandoff;
  Future<void> Function(String text) get _copyMessage =>
      _dependencies.copyMessage;
  Future<bool> Function(Uri uri) get _openHandoff => _dependencies.openHandoff;
  HostOfferEventTargetsGateway get _targets => _dependencies.targets;
  Future<HostFormResponseDetail> Function(String responseId)
  get _getResponseDetail => _dependencies.getResponseDetail;
  Future<bool> Function(HostFormResponseDetail)? get _isResponseReviewed =>
      _dependencies.isResponseReviewed;
  Future<void> Function(String responseId) get _openResponseForConversion =>
      _dependencies.openResponseForConversion;
  Future<void> Function(String eventId) get _openEventSettings =>
      _dependencies.openEventSettings;
  DateTime Function() get _now => _dependencies.now;
  String? get _initialEventId => _dependencies.initialEventId;
  HostOfferEventTarget? get _initialEventTarget =>
      _dependencies.initialEventTarget;

  bool get _loading => state.busy;
  set _loading(bool value) {
    if (_active) state = state.copyWith(busy: value);
  }

  set _stage(HostOfferWorkspaceStage value) {
    if (_active) state = state.copyWith(stage: value);
  }

  set _recoveringPending(bool value) {
    if (_active) state = state.copyWith(recoveringPending: value);
  }

  bool get _refreshTargetOnRetry => state.refreshTargetOnRetry;
  set _refreshTargetOnRetry(bool value) {
    if (_active) state = state.copyWith(refreshTargetOnRetry: value);
  }

  set _error(Object? value) {
    if (_active) state = state.copyWith(error: value);
  }

  bool get _selectionStale => state.selectionStale;
  set _selectionStale(bool value) {
    if (_active) state = state.copyWith(selectionStale: value);
  }

  List<String> get _ids => state.ids;
  set _ids(List<String> value) {
    if (_active) state = state.copyWith(ids: value);
  }

  String? get _resultHash => state.resultHash;
  set _resultHash(String? value) {
    if (_active) state = state.copyWith(resultHash: value);
  }

  List<HostOfferEventTarget> get _events => state.events;
  set _events(List<HostOfferEventTarget> value) {
    if (_active) state = state.copyWith(events: value);
  }

  String? get _nextEventCursor => state.nextEventCursor;
  set _nextEventCursor(String? value) {
    if (_active) state = state.copyWith(nextEventCursor: value);
  }

  HostOfferEventTarget? get _event => state.event;
  set _event(HostOfferEventTarget? value) {
    if (_active) state = state.copyWith(event: value);
  }

  HostOfferEventConfiguration? get _configuration => state.configuration;
  set _configuration(HostOfferEventConfiguration? value) {
    if (_active) state = state.copyWith(configuration: value);
  }

  List<HostFormResponseDetail> get _details => state.details;
  set _details(List<HostFormResponseDetail> value) {
    if (_active) state = state.copyWith(details: value);
  }

  set _missingContacts(List<HostFormResponseDetail> value) {
    if (_active) state = state.copyWith(missingContacts: value);
  }

  Map<String, String> get _personalLinks => state.personalLinks;
  set _personalLinks(Map<String, String> value) {
    if (_active) state = state.copyWith(personalLinks: value);
  }

  HostOfferBatchDraft? get _draft => state.draft;
  set _draft(HostOfferBatchDraft? value) {
    if (_active) state = state.copyWith(draft: value);
  }

  set _commitRequestId(String? value) {
    if (_active) state = state.copyWith(commitRequestId: value);
  }

  List<Map<String, Object?>> get _offers => state.offers;
  set _offers(List<Map<String, Object?>> value) {
    if (_active) state = state.copyWith(offers: value);
  }

  String? get _nextOfferCursor => state.nextOfferCursor;
  set _nextOfferCursor(String? value) {
    if (_active) state = state.copyWith(nextOfferCursor: value);
  }

  String? get _refreshedReceiptId => state.refreshedReceiptId;
  set _refreshedReceiptId(String? value) {
    if (_active) state = state.copyWith(refreshedReceiptId: value);
  }

  HostEventOffer? get _selectedOffer => state.selectedOffer;
  set _selectedOffer(HostEventOffer? value) {
    if (_active) state = state.copyWith(selectedOffer: value);
  }

  HostOfferHandoff? get _handoff => state.handoff;
  set _handoff(HostOfferHandoff? value) {
    if (_active) state = state.copyWith(handoff: value);
  }

  set _referenceRequestId(String? value) {
    if (_active) state = state.copyWith(referenceRequestId: value);
  }

  set _reviewRequestId(String? value) {
    if (_active) state = state.copyWith(reviewRequestId: value);
  }

  set _messageCopied(bool value) {
    if (_active) state = state.copyWith(messageCopied: value);
  }

  set _handoffOpenFailed(bool value) {
    if (_active) state = state.copyWith(handoffOpenFailed: value);
  }

  bool get _isLoading => state.loading;
  bool _current(int generation, String? accountId) =>
      _active &&
      generation == _generation &&
      accountId != null &&
      accountId == _accountId;

  void _reset() {
    ++_generation;
    _ids = const [];
    _resultHash = null;
    _events = const [];
    _nextEventCursor = null;
    _event = null;
    _configuration = null;
    _details = const [];
    _missingContacts = const [];
    _personalLinks = const {};
    _draft = null;
    _commitRequestId = null;
    _offers = const [];
    _nextOfferCursor = null;
    _refreshedReceiptId = null;
    _selectedOffer = null;
    _handoff = null;
    _referenceRequestId = null;
    _reviewRequestId = null;
    _messageCopied = false;
    _handoffOpenFailed = false;
    _loading = false;
    _stage = HostOfferWorkspaceStage.idle;
    _recoveringPending = false;
    _refreshTargetOnRetry = false;
    _error = null;
    _selectionStale = false;
  }

  void _onQueryChanged() {
    if (!_active) return;
    if (_ids.isEmpty) {
      return;
    }
    final intent = _queryController?.selectionIntent;
    if (intent?.resultHash == _resultHash && _sameIds(intent!.ids, _ids)) {
      return;
    }
    if (_hasUnresolvedCommand) {
      // Query changes cannot discard a command that may already have reached
      // the server. Keep its exact draft and request available for recovery.
      _update(() {
        ++_generation;
        _selectionStale = true;
        _loading = false;
        _stage = HostOfferWorkspaceStage.idle;
        _recoveringPending = false;
        _draft = _offerFlow.draft ?? _draft;
        _commitRequestId = _offerFlow.pendingRequestId;
      });
      return;
    }
    _update(() {
      _reset();
      _selectionStale = true;
    });
  }

  void _onOfferChanged() {
    final view = _offerFlow;
    final receipt = view.receipt;
    if (view.status != HostOfferFlowStatus.committed ||
        receipt == null ||
        receipt.requestId == _refreshedReceiptId ||
        receipt.eventId != _event?.eventId) {
      return;
    }
    _refreshedReceiptId = receipt.requestId;
    refreshOffers().then((_) {
      if (_active && _ids.length == 1 && _offers.length == 1) {
        selectExisting(_offers.single);
      }
    });
  }

  static bool _sameIds(List<String> a, List<String> b) =>
      a.length == b.length && a.toSet().containsAll(b);

  Future<bool> _revalidate(int generation, String accountId) async {
    if (!_current(generation, accountId) || _resultHash == null) {
      return false;
    }
    final query = _queryController;
    final valid = query == null
        ? _ids.length == 1 && _ids.single == _responseId
        : await query.revalidateSelection(ids: _ids, resultHash: _resultHash!);
    if (!_current(generation, accountId)) {
      return false;
    }
    if (!valid) {
      _update(() {
        _selectionStale = true;
        _draft = null;
      });
    }
    return valid;
  }

  Future<void> start() async {
    if (!_active) return;
    if (_isLoading || _hasUnresolvedCommand) return;
    final accountId = _accountId;
    final intent =
        _queryController?.selectionIntent ??
        (_responseId == null
            ? null
            : (ids: [_responseId!], resultHash: _responseId!));
    if (accountId == null || intent == null || intent.ids.length > 25) {
      return;
    }
    _update(() {
      _reset();
      _ids = List.unmodifiable(intent.ids);
      _resultHash = intent.resultHash;
    });
    if (_initialEventTarget case final target?) {
      _update(() => _events = List.unmodifiable([target]));
      await choose(target);
      return;
    }
    await loadEvents();
  }

  Future<void> loadEvents() async {
    if (!_active) return;
    if (_loading) {
      return;
    }
    final generation = _generation;
    final accountId = _accountId;
    if (accountId == null) {
      return;
    }
    final cursor = _nextEventCursor;
    _update(() {
      _loading = true;
      _stage = HostOfferWorkspaceStage.loadingEvents;
      _error = null;
    });
    try {
      final page = await _targets.list(
        organizerId: _organizerId,
        cursor: cursor,
      );
      if (!_current(generation, accountId)) {
        return;
      }
      if (cursor != null && cursor == page.nextCursor) {
        throw const FormatException('Offer target page repeated.');
      }
      _update(() {
        _events = List.unmodifiable(
          {
            for (final event in _events) event.eventId: event,
            for (final event in page.events) event.eventId: event,
          }.values,
        );
        _nextEventCursor = page.nextCursor;
      });
      if (_initialEventId case final initialId?) {
        final matches = page.events.where(
          (event) => event.eventId == initialId,
        );
        if (matches.isNotEmpty) {
          // _choose runs after the list _loading interlock is released.
          scheduleMicrotask(() {
            if (_current(generation, accountId)) choose(matches.first);
          });
        }
      }
    } on Object catch (error) {
      if (_current(generation, accountId)) _update(() => _error = error);
    } finally {
      if (_current(generation, accountId)) {
        _update(() {
          _loading = false;
          _stage = HostOfferWorkspaceStage.idle;
        });
      }
    }
  }

  Future<List<HostFormResponseDetail>> _resolveDetails({
    bool Function()? isCurrent,
  }) => HostOfferWorkspacePolicy.resolveDetails(
    ids: _ids,
    getResponseDetail: _getResponseDetail,
    queryConfigured: _queryController != null,
    currentRequest: () => _queryController?.view.request,
    isCurrent: isCurrent,
  );

  Future<void> choose(HostOfferEventTarget event) => _prepare(event);

  Future<void> _prepare(
    HostOfferEventTarget event, {
    bool refreshTarget = false,
  }) async {
    if (!_active) return;
    final accountId = _accountId;
    if (accountId == null ||
        _isLoading ||
        _selectionStale ||
        _hasUnresolvedCommand) {
      return;
    }
    final generation = ++_generation;
    if (_event?.eventId != event.eventId) _personalLinks = const {};
    _update(() {
      _loading = true;
      _stage = HostOfferWorkspaceStage.preparingOffer;
      _refreshTargetOnRetry = refreshTarget;
      _event = event;
      _configuration = null;
      _details = const [];
      _missingContacts = const [];
      _draft = null;
      _commitRequestId = null;
      _offers = const [];
      _nextOfferCursor = null;
      _selectedOffer = null;
      _handoff = null;
      _error = null;
    });
    try {
      if (!await _revalidate(generation, accountId)) {
        return;
      }
      late HostOfferEventConfiguration configuration;
      late List<HostFormResponseDetail> details;
      late List<HostFormResponseDetail> missing;
      late Map<String, Object?> existing;
      // These manager reads are independent. Accept their combined result
      // only after the selection and account fences have been checked again.
      await Future.wait<void>([
        (() async {
          configuration = await _targets.configuration(
            organizerId: _organizerId,
            eventId: event.eventId,
          );
        })(),
        (() async {
          details = await _resolveDetails(
            isCurrent: () => _current(generation, accountId),
          );
          missing = await HostOfferWorkspacePolicy.missingContacts(
            details: details,
            isResponseReviewed: _isResponseReviewed,
            isCurrent: () => _current(generation, accountId),
          );
        })(),
        (() async {
          existing = await _listOffers(
            organizerId: _organizerId,
            eventId: event.eventId,
          );
        })(),
      ]);
      if (!await _revalidate(generation, accountId)) {
        return;
      }
      if (!_current(generation, accountId)) {
        return;
      }
      final selected = refreshTarget
          ? HostOfferEventTarget(
              eventId: event.eventId,
              name: event.name,
              startTime: configuration.startsAt,
              timezone: event.timezone,
              publicationState: event.publicationState,
              setupRevision: event.setupRevision == null
                  ? null
                  : configuration.eventSourceRevision,
            )
          : event;
      if (!HostOfferWorkspacePolicy.configurationMatches(
        configuration,
        selected,
        _organizerId,
      )) {
        throw StateError('Selected responses changed.');
      }
      final page = HostOfferWorkspacePolicy.offerPage(
        response: existing,
        eventId: event.eventId,
        previousCursor: null,
        append: false,
        details: details,
        offers: const [],
      );
      _update(() {
        _event = selected;
        _events = List.unmodifiable([
          for (final item in _events)
            item.eventId == selected.eventId ? selected : item,
        ]);
        _configuration = configuration;
        _details = List.unmodifiable(details);
        _missingContacts = List.unmodifiable(missing);
        _draft = null;
        _commitRequestId = null;
        _selectedOffer = null;
        _handoff = null;
        _offers = page.items;
        _nextOfferCursor = page.cursor;
      });
      if (missing.isEmpty &&
          configuration.suggestedExpiresAt != null &&
          _current(generation, accountId)) {
        // A saved command keeps its original identity. Do not allow a local
        // preparation cancel to race publication of that recovery result.
        _update(() => _recoveringPending = true);
        try {
          await _offerController.recoverPending(
            organizerId: _organizerId,
            eventId: event.eventId,
            isCurrent: () => _current(generation, accountId),
          );
        } finally {
          if (_current(generation, accountId)) {
            _update(() => _recoveringPending = false);
          }
        }
        if (!_current(generation, accountId)) {
          return;
        }
        final pending = _offerFlow;
        if (_hasUnresolvedCommand && pending.draft != null) {
          // Replay the exact saved command. Never rotate its request identity
          // after an ambiguous result or app restart.
          _update(() {
            _draft = pending.draft;
            _commitRequestId = pending.pendingRequestId;
          });
          return;
        }
        if (_ids.length == 1 && _offers.length == 1) {
          // Select after releasing the event-_loading interlock.
          final existing = _offers.single;
          scheduleMicrotask(() {
            if (_current(generation, accountId)) selectExisting(existing);
          });
        } else if (!_personalMode) {
          _prepareDraft(details, configuration);
        }
      }
    } on Object catch (error) {
      if (_current(generation, accountId)) _update(() => _error = error);
    } finally {
      if (_current(generation, accountId)) {
        _update(() {
          _loading = false;
          _stage = HostOfferWorkspaceStage.idle;
        });
      }
    }
  }

  bool get _personalMode =>
      _configuration?.paymentTerms?['preferredCollection'] == 'personalRequest';

  Future<void> returnForConversion(String responseId) async {
    if (!_active) return;
    final generation = _generation;
    final accountId = _accountId;
    if (accountId == null) {
      return;
    }
    try {
      await _openResponseForConversion(responseId);
      if (!_current(generation, accountId)) {
        return;
      }
      final event = _event;
      if (event != null) await choose(event);
    } on Object catch (error) {
      if (_current(generation, accountId)) _update(() => _error = error);
    }
  }

  Future<void> openSettings() async {
    if (!_active) return;
    final event = _event;
    final accountId = _accountId;
    final generation = _generation;
    if (event == null ||
        accountId == null ||
        _isLoading ||
        _hasUnresolvedCommand) {
      return;
    }
    _update(() {
      _loading = true;
      _error = null;
    });
    try {
      await _openEventSettings(event.eventId);
      if (!_current(generation, accountId)) {
        return;
      }
    } on Object catch (error) {
      if (_current(generation, accountId)) _update(() => _error = error);
      return;
    } finally {
      if (_current(generation, accountId)) _update(() => _loading = false);
    }
    if (!_current(generation, accountId)) return;
    // One fresh configuration read both updates the target revision and
    // prepares the offer after returning from settings.
    await _prepare(event, refreshTarget: true);
  }

  void cancelPreparation() {
    if (!_canCancelPreparation) return;
    _update(() {
      ++_generation;
      _loading = false;
      _stage = HostOfferWorkspaceStage.idle;
      _clearEvent();
    });
  }

  Future<void> retry() async {
    if (!_active) return;
    if (_isLoading || _hasUnresolvedCommand) return;
    if (_selectionStale) {
      await start();
    } else if (_event case final selected?) {
      await _prepare(selected, refreshTarget: _refreshTargetOnRetry);
    } else {
      await loadEvents();
    }
  }

  void _clearEvent() {
    _event = null;
    _configuration = null;
    _details = const [];
    _missingContacts = const [];
    _draft = null;
    _commitRequestId = null;
    _selectedOffer = null;
    _handoff = null;
    _offers = const [];
    _nextOfferCursor = null;
    _error = null;
    _personalLinks = const {};
  }

  void changeEvent() {
    if (!_active) return;
    if (_canCancelPreparation) {
      cancelPreparation();
      return;
    }
    if (_isLoading || _hasUnresolvedCommand) return;
    _update(() {
      ++_generation;
      _clearEvent();
    });
    if (_events.length <= 1 && _initialEventTarget != null) loadEvents();
  }

  void setPersonalLink(String contactId, String value) {
    if (!_active) return;
    _personalLinks = {..._personalLinks, contactId: value.trim()};
  }

  void _update(void Function() change) {
    if (_active) change();
  }
}
