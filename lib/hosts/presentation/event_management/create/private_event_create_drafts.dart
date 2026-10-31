part of 'private_event_create_screen.dart';

extension _PrivateEventCreateDrafts on _PrivateEventCreateScreenState {
  Future<void> _checkForDrafts() async {
    try {
      final drafts = await ref
          .read(createEventDraftControllerProvider.notifier)
          .loadDrafts(clubId: widget.organizer.id);
      if (!mounted || drafts.isEmpty) {
        return;
      }
      final picked = await showHostEventEntrySheet(
        context: context,
        state: HostEventEntryState.resolve(
          organizerId: widget.organizer.id,
          drafts: drafts,
        ),
      );
      if (!mounted || picked == null) return;
      if (picked.intent == HostEventEntryIntent.createProgram) {
        await context.pushNamed(
          Routes.hostCreateProgramScreen.name,
          pathParameters: {'organizerId': widget.organizer.id},
        );
        return;
      }
      if (picked.draft == null) return;
      final draft = picked.draft!;
      if (draft.clubId != widget.organizer.id) {
        return;
      }
      _mutateScreenState(() => _restorePickedDraft(draft));
    } catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  void _restorePickedDraft(EventDraft draft) {
    _activeDraft = draft;
    _localDraftId = draft.id;
    _requestId = draft.eventCreateRequestId ?? newPrivateEventRequestId();
    _submittedSignature = draft.eventCreatePayloadSignature;
    _submittedPayloadJson = draft.eventCreatePayloadJson;
    final restored = PrivateEventDraftRestore(
      draft,
      organizerCityId: widget.organizer.locationCityId,
      organizerMarketId: widget.organizer.locationMarketId,
      organizerTimezone: _managerDefaults?.timezone,
      trustedDefaults: _trustedOrganizerDefaultsReadAvailable(),
      organizerDefaultsHash: _organizerDefaultsHash,
    );
    _receipt = restored.receipt;
    _nameController.text = draft.name ?? '';
    _city = restored.city;
    _timezoneController.text = restored.timezone;
    _date = restored.date;
    _start = restored.start;
    _cityInherited = restored.cityInherited;
    _timezoneInherited = restored.timezoneInherited;
    _defaultsChanged = restored.defaultsChanged;
    _savedCity = restored.savedCity;
    _savedBasics = _receipt == null ? null : _currentExplicitBasics;
    _pendingUpdate = null;
    _editingSavedBasics = false;
    if (_receipt != null) {
      _loadingSavedEvent = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final savedId = _receipt?.eventId;
        if (mounted && savedId != null) {
          unawaited(
            _PrivateEventCreateBody(
              this,
            )._loadSavedEvent(savedEventId: savedId),
          );
        }
      });
    }
    _showErrors = false;
    _error = null;
  }
}
