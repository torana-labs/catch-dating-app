part of 'host_event_offer_workspace_controller.dart';

/// Existing-offer loading, payment refresh, and external handoff actions.
extension HostEventOfferWorkspaceExistingOfferActions
    on HostEventOfferWorkspaceController {
  void _prepareDraft(
    List<HostFormResponseDetail> details,
    HostOfferEventConfiguration configuration,
  ) {
    final expiry = configuration.suggestedExpiresAt;
    if (expiry == null) {
      return;
    }
    final draft = HostOfferWorkspacePolicy.draft(
      organizerId: _organizerId,
      details: details,
      configuration: configuration,
      personalMode: _personalMode,
      personalLinks: _personalLinks,
    );
    _update(() {
      _draft = draft;
      _commitRequestId = HostOfferWorkspacePolicy.newRequestId();
    });
  }

  Future<void> previewPersonal() async {
    if (!_active) return;
    final accountId = _accountId;
    final event = _event;
    final previous = _configuration;
    final generation = _generation;
    if (accountId == null ||
        event == null ||
        previous == null ||
        _isLoading ||
        _selectionStale ||
        _hasUnresolvedCommand ||
        !_personalMode) {
      return;
    }
    _update(() {
      _loading = true;
      _stage = HostOfferWorkspaceStage.preparingOffer;
      _error = null;
    });
    try {
      if (!await _revalidate(generation, accountId)) {
        return;
      }
      late List<HostFormResponseDetail> details;
      late List<HostFormResponseDetail> missing;
      late HostOfferEventConfiguration current;
      await Future.wait<void>([
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
          current = await _targets.configuration(
            organizerId: _organizerId,
            eventId: event.eventId,
          );
        })(),
      ]);
      if (!await _revalidate(generation, accountId)) {
        return;
      }
      if (missing.isNotEmpty) {
        _update(() {
          _missingContacts = List.unmodifiable(missing);
          _draft = null;
        });
        return;
      }
      if (HostOfferWorkspacePolicy.personalReviewChanged(
        current,
        previous,
        details,
        _details,
      )) {
        _update(() => _selectionStale = true);
        return;
      }
      _update(() => _recoveringPending = true);
      _prepareDraft(details, current);
      if (_draft case final draft?) {
        await _offerController.preview(
          draft: draft,
          now: _now(),
          eventStartsAt: current.startsAt,
        );
      }
    } on Object catch (error) {
      if (_current(generation, accountId)) _update(() => _error = error);
    } finally {
      if (_current(generation, accountId)) {
        _update(() {
          _loading = false;
          _stage = HostOfferWorkspaceStage.idle;
          _recoveringPending = false;
        });
      }
    }
  }

  /// Listens again to the selected people's offers, after an error or when
  /// the host asks. The list is a listener, so changes arrive on their own.
  Future<void> refreshOffers() async {
    if (!_active) return;
    final event = _event;
    final accountId = _accountId;
    final generation = _generation;
    if (event == null || accountId == null || _details.isEmpty) {
      return;
    }
    try {
      final items = await _listenOffers(
        eventId: event.eventId,
        details: _details,
        generation: generation,
        accountId: accountId,
      );
      if (!_current(generation, accountId) ||
          _event?.eventId != event.eventId) {
        return;
      }
      _update(() => _offers = items);
      _selectAwaitedOffer();
    } on Object catch (error) {
      if (_current(generation, accountId)) _update(() => _error = error);
    }
  }

  /// Starts the offers listener for [eventId] and the selected people in
  /// [details], replacing any earlier one. Completes with its first value;
  /// later values update the list while the selection is current.
  Future<List<Map<String, Object?>>> _listenOffers({
    required String eventId,
    required List<HostFormResponseDetail> details,
    required int generation,
    required String accountId,
  }) {
    _stopOffers();
    final first = Completer<List<Map<String, Object?>>>();
    final contactIds = {
      for (final detail in details)
        if (detail.contactId case final String id) id,
    };
    _offersSubscription =
        _watchOffers(
          organizerId: _organizerId,
          eventId: eventId,
          contactIds: contactIds,
        ).listen(
          (items) {
            final List<Map<String, Object?>> visible;
            try {
              visible = HostOfferWorkspacePolicy.offerItems(
                items: items,
                eventId: eventId,
                details: details,
              );
            } on Object catch (error, stackTrace) {
              if (!first.isCompleted) {
                first.completeError(error, stackTrace);
              } else if (_current(generation, accountId)) {
                _update(() => _error = error);
              }
              return;
            }
            if (!first.isCompleted) {
              first.complete(visible);
              return;
            }
            if (!_current(generation, accountId) ||
                _event?.eventId != eventId) {
              return;
            }
            _update(() => _offers = visible);
            _selectAwaitedOffer();
          },
          onError: (Object error, StackTrace stackTrace) {
            if (!first.isCompleted) {
              first.completeError(error, stackTrace);
            } else if (_current(generation, accountId)) {
              _update(() => _error = error);
            }
          },
        );
    return first.future;
  }

  /// After a commit, selects the single offer once the list shows every
  /// offer the receipt named.
  void _selectAwaitedOffer() {
    final awaited = _awaitedOfferIds;
    if (awaited == null || !_active) return;
    final shown = {for (final item in _offers) item['offerId']};
    if (!awaited.every(shown.contains)) return;
    _awaitedOfferIds = null;
    if (_ids.length == 1 && _offers.length == 1) {
      final existing = _offers.single;
      // Select after the commit's own state update settles.
      scheduleMicrotask(() {
        if (_active) selectExisting(existing);
      });
    }
  }

  /// The selected offer as its listener shows it now.
  Future<HostEventOffer> _currentOffer({
    required String organizerId,
    required String eventId,
    required String contactId,
  }) async => (await _watchOffer(
    organizerId: organizerId,
    eventId: eventId,
    contactId: contactId,
  ).firstWhere((offer) => offer != null))!;

  Future<void> selectExisting(Map<String, Object?> item) async {
    if (!_active) return;
    final event = _event;
    final accountId = _accountId;
    final generation = _generation;
    final contactId = item['contactId'];
    final offerId = item['offerId'];
    if (event == null ||
        accountId == null ||
        _loading ||
        contactId is! String ||
        offerId is! String) {
      return;
    }
    _update(() {
      _loading = true;
      _stage = HostOfferWorkspaceStage.loadingOffer;
      _error = null;
    });
    try {
      final offer = await _listenSelected(
        eventId: event.eventId,
        contactId: contactId,
        offerId: offerId,
        generation: generation,
        accountId: accountId,
      );
      if (!_current(generation, accountId) ||
          _event?.eventId != event.eventId) {
        return;
      }
      _update(() {
        _selectedOffer = offer;
        _handoff = null;
        _referenceRequestId = HostOfferWorkspacePolicy.newRequestId();
        _reviewRequestId = HostOfferWorkspacePolicy.newRequestId();
        _messageCopied = false;
        _handoffOpenFailed = false;
      });
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

  /// Starts the selected offer's listener, replacing any earlier one.
  /// Completes with its first value; a later revision (a reference the guest
  /// sent, another manager's review) replaces the selection while it is
  /// still this offer.
  Future<HostEventOffer> _listenSelected({
    required String eventId,
    required String contactId,
    required String offerId,
    required int generation,
    required String accountId,
  }) {
    _stopSelected();
    final first = Completer<HostEventOffer>();
    void check(HostEventOffer offer) {
      if (offer.organizerId != _organizerId ||
          offer.eventId != eventId ||
          offer.contactId != contactId ||
          offer.offerId != offerId) {
        throw const FormatException('Offer detail does not match selection.');
      }
    }

    _selectedSubscription =
        _watchOffer(
          organizerId: _organizerId,
          eventId: eventId,
          contactId: contactId,
        ).listen(
          (offer) {
            if (offer == null) {
              if (!first.isCompleted) {
                first.completeError(
                  const FormatException('Offer is unavailable.'),
                );
              }
              return;
            }
            try {
              check(offer);
            } on Object catch (error, stackTrace) {
              if (!first.isCompleted) {
                first.completeError(error, stackTrace);
              } else if (_current(generation, accountId)) {
                _update(() => _error = error);
              }
              return;
            }
            if (!first.isCompleted) {
              first.complete(offer);
            } else if (_current(generation, accountId) &&
                !_isLoading &&
                _selectedOffer?.offerId == offer.offerId &&
                !HostOfferWorkspacePolicy.sameOfferRevision(
                  _selectedOffer,
                  offer,
                )) {
              manualUpdated(offer);
            }
          },
          onError: (Object error, StackTrace stackTrace) {
            if (!first.isCompleted) {
              first.completeError(error, stackTrace);
            } else if (_current(generation, accountId)) {
              _update(() => _error = error);
            }
          },
        );
    return first.future;
  }

  void manualUpdated(HostEventOffer updated) {
    if (!_active) return;
    final previous = _selectedOffer;
    if (previous == null ||
        previous.offerId != updated.offerId ||
        previous.organizerId != updated.organizerId ||
        previous.eventId != updated.eventId ||
        previous.contactId != updated.contactId) {
      return;
    }
    _update(() {
      _selectedOffer = updated;
      _handoff = null;
      _referenceRequestId = HostOfferWorkspacePolicy.newRequestId();
      _reviewRequestId = HostOfferWorkspacePolicy.newRequestId();
      _messageCopied = false;
    });
  }

  Future<void> prepareSelectedHandoff() async {
    if (!_active) return;
    final selected = _selectedOffer;
    final accountId = _accountId;
    final generation = _generation;
    if (selected == null || accountId == null || _loading) {
      return;
    }
    _update(() {
      _loading = true;
      _stage = HostOfferWorkspaceStage.preparingMessage;
      _error = null;
      _handoff = null;
    });
    try {
      final prepared = await HostOfferWorkspacePolicy.verifiedHandoff(
        selected: selected,
        getOffer: _currentOffer,
        prepareHandoff: _prepareHandoff,
        isCurrent: () =>
            _current(generation, accountId) && _sameSelectedOffer(selected),
      );
      if (prepared == null) return;
      _update(() {
        _selectedOffer = prepared.offer;
        _handoff = prepared.handoff;
        _messageCopied = false;
        _handoffOpenFailed = false;
      });
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

  bool _sameSelectedOffer(HostEventOffer offer) =>
      HostOfferWorkspacePolicy.sameOfferRevision(_selectedOffer, offer);

  Future<void> copyPreparedHandoff() async {
    if (!_active) return;
    final handoff = _handoff;
    final accountId = _accountId;
    final generation = _generation;
    if (handoff?.kind != 'prepared' ||
        handoff?.copyText == null ||
        accountId == null ||
        _loading) {
      return;
    }
    try {
      await _copyMessage(handoff!.copyText!);
      if (_current(generation, accountId) && identical(_handoff, handoff)) {
        _update(() => _messageCopied = true);
      }
    } on Object catch (error) {
      if (_current(generation, accountId)) _update(() => _error = error);
    }
  }

  Future<void> openPreparedWhatsapp() async {
    if (!_active) return;
    final handoff = _handoff;
    final accountId = _accountId;
    final generation = _generation;
    if (handoff?.kind != 'prepared' ||
        handoff?.whatsappUrl == null ||
        accountId == null ||
        _loading) {
      return;
    }
    final uri = handoff!.whatsappUrl!;
    if (uri.scheme != 'https' ||
        uri.host != 'wa.me' ||
        uri.userInfo.isNotEmpty ||
        !RegExp(r'^/[0-9]{8,15}$').hasMatch(uri.path)) {
      _update(() => _handoffOpenFailed = true);
      return;
    }
    try {
      final opened = await _openHandoff(uri);
      if (_current(generation, accountId) && identical(_handoff, handoff)) {
        _update(() => _handoffOpenFailed = !opened);
      }
    } on Object {
      if (_current(generation, accountId)) {
        _update(() => _handoffOpenFailed = true);
      }
    }
  }

  void closeExisting() {
    if (!_active) return;
    if (_isLoading) return;
    _stopSelected();
    _update(() {
      _selectedOffer = null;
      _handoff = null;
    });
  }
}
