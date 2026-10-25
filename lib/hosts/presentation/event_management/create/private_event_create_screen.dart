import 'dart:async';
import 'dart:convert';
import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/app_error_context.dart' as app_ops;
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/events/domain/event_draft.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/hosts/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/hosts/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/hosts/domain/host_roster_import.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_private_event_basics_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_draft_restore.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_setup_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_loading_screen.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_draft_exit_dialog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'private_event_create_body.dart';
part 'private_event_create_drafts.dart';

/// The first page of the single progressive event editor.
///
/// No rich Event model is constructed here: the receipt identifies a private
/// canonical event whose optional capabilities can be set up later.
class PrivateEventCreateScreen extends ConsumerStatefulWidget {
  const PrivateEventCreateScreen({
    super.key,
    required this.club,
    this.initialDraft,
    this.initialPrefill,
    this.initialRosterImportPlan,
    this.promptForDraftsOnStart = true,
    this.initialSavedEventId,
    this.initialPublicationReview = false,
    this.create,
    this.update,
    this.readSaved,
    this.readOrganizerDefaults,
    this.onSaved,
    this.returnToResponsesOnSave = false,
  }) : assert(
         initialSavedEventId == null ||
             (initialDraft == null && initialPrefill == null),
         'A saved private event cannot also start from a draft or repeat.',
       );

  final Club club;
  final EventDraft? initialDraft;
  final CreateEventPrefill? initialPrefill;
  final HostRosterImportPlan? initialRosterImportPlan;
  final bool promptForDraftsOnStart;
  final String? initialSavedEventId;
  final bool initialPublicationReview;
  final CreatePrivateEvent? create;
  final UpdatePrivateEventBasics? update;
  final ReadPrivateEventBasics? readSaved;
  final ReadPrivateEventOrganizerDefaults? readOrganizerDefaults;
  final ValueChanged<PrivateEventCreateReceipt>? onSaved;
  final bool returnToResponsesOnSave;

  @override
  ConsumerState<PrivateEventCreateScreen> createState() =>
      _PrivateEventCreateScreenState();
}

class _PrivateEventCreateScreenState
    extends ConsumerState<PrivateEventCreateScreen> {
  // The body lives in a Dart extension; State.setState is protected there.
  void _mutateScreenState(VoidCallback update) => setState(update);
  final _nameController = TextEditingController();
  final _timezoneController = TextEditingController();
  final _cityAccordion = CatchAccordionController();
  DateTime? _date;
  TimeOfDay? _start;
  CityOption? _city;
  bool _cityInherited = false;
  bool _timezoneInherited = false;
  PrivateEventCreateReceipt? _receipt;
  PrivateEventBasics? _savedBasics;
  EventSetupCity? _savedCity;
  String? _savedCityLabel;
  PrivateEventBasicsUpdateRequest? _pendingUpdate;
  bool _editingSavedBasics = false;
  bool _editingPreferences = false;
  EventEditorScope? _preferencesScope;
  bool _openedInitialPublication = false;
  bool _editingPublication = false;
  EventEditorScope? _publicationScope;
  String _savedPublicationState = 'private';
  bool _editingDetails = false;
  PrivateEventDetailsScope? _detailsScope;
  bool _loadingSavedEvent = false;
  bool _canEditSavedBasics = false;
  bool _canChangeSavedCity = false;
  bool _savedEventActive = false;
  String? _readError;
  ManagerEventSetupDefaults? _managerDefaults;
  bool _loadingManagerDefaults = false;
  String? _managerDefaultsError;
  bool _saving = false;
  bool _showErrors = false;
  bool _moreBasicsOpen = false;
  bool _allowPop = false;
  bool _defaultsChanged = false;
  String? _error;
  late String _requestId;
  String? _submittedSignature;
  String? _submittedPayloadJson;
  late String _localDraftId;
  EventDraft? _activeDraft;
  bool _trustedOrganizerDefaultsReadAvailable() => _managerDefaults != null;

  @override
  void initState() {
    super.initState();
    _requestId = newPrivateEventRequestId();
    _localDraftId = widget.initialDraft?.id ?? newPrivateEventRequestId();
    _activeDraft = widget.initialDraft;
    final startingValues = widget.initialDraft ?? widget.initialPrefill?.values;
    if (startingValues != null) {
      _requestId = startingValues.eventCreateRequestId ?? _requestId;
      _submittedSignature = startingValues.eventCreatePayloadSignature;
      _submittedPayloadJson = startingValues.eventCreatePayloadJson;
      final savedId = startingValues.eventCreateReceiptEventId;
      final savedRevision = startingValues.eventCreateReceiptRevision;
      if (savedId != null && savedRevision != null) {
        _receipt = PrivateEventCreateReceipt(
          eventId: savedId,
          setupRevision: savedRevision,
          replayed: true,
        );
      }
      _nameController.text = startingValues.name ?? '';
      _timezoneController.text = startingValues.eventTimezone ?? '';
      for (final option in defaultCityOptions) {
        if (option.effectiveCityId == startingValues.eventCityId &&
            option.effectiveMarketId == startingValues.eventMarketId) {
          _city = option;
          break;
        }
      }
      _date = restoredPrivateEventDate(
        startingValues,
        rejectPast: savedId == null,
      );
      _start = restoredPrivateEventStart(startingValues);
    }
    for (final option in defaultCityOptions) {
      if (_city == null &&
          option.effectiveCityId == widget.club.locationCityId &&
          option.effectiveMarketId == widget.club.locationMarketId) {
        _city = option;
        if (_timezoneController.text.isEmpty) {
          _timezoneController.text = option.timeZone;
        }
        break;
      }
    }
    if (startingValues == null) {
      _cityInherited =
          _trustedOrganizerDefaultsReadAvailable() &&
          widget.club.locationCityId.isNotEmpty &&
          widget.club.locationMarketId.isNotEmpty;
      _timezoneInherited =
          _trustedOrganizerDefaultsReadAvailable() &&
          (widget.club.hostDefaults.timezone?.trim().isNotEmpty ?? false);
    } else {
      _cityInherited =
          _trustedOrganizerDefaultsReadAvailable() &&
          startingValues.eventCityMode == 'inherit';
      _timezoneInherited =
          _trustedOrganizerDefaultsReadAvailable() &&
          startingValues.eventTimezoneMode == 'inherit';
      final reviewedHash = startingValues.eventReviewedDefaultsHash;
      _defaultsChanged =
          (_cityInherited || _timezoneInherited) &&
          reviewedHash != _organizerDefaultsHash;
    }
    _nameController.addListener(_refresh);
    _timezoneController.addListener(_refresh);
    _cityAccordion.addListener(_refresh);
    if (widget.readOrganizerDefaults != null) {
      _loadingManagerDefaults = true;
      WidgetsBinding.instance.addPostFrameCallback(
        (_) =>
            unawaited(_PrivateEventCreateBody(this)._loadOrganizerDefaults()),
      );
    }
    if (widget.initialSavedEventId != null) {
      _loadingSavedEvent = true;
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _PrivateEventCreateBody(this)._loadSavedEvent(),
      );
    } else if (_receipt != null) {
      _savedCity = _city == null
          ? null
          : EventSetupCity(
              cityId: _city!.effectiveCityId,
              marketId: _city!.effectiveMarketId,
            );
      _savedBasics = _currentExplicitBasics;
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
    if (widget.promptForDraftsOnStart &&
        widget.initialSavedEventId == null &&
        widget.initialDraft == null &&
        widget.initialPrefill == null &&
        widget.initialRosterImportPlan == null) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _PrivateEventCreateDrafts(this)._checkForDrafts(),
      );
    }
  }

  @override
  void dispose() {
    _nameController.removeListener(_refresh);
    _timezoneController.removeListener(_refresh);
    _cityAccordion.removeListener(_refresh);
    _nameController.dispose();
    _timezoneController.dispose();
    _cityAccordion.dispose();
    super.dispose();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  String get _localDate {
    final date = _date!;
    return '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
  }

  String get _localStartTime {
    final time = _start!;
    return '${time.hour.toString().padLeft(2, '0')}:'
        '${time.minute.toString().padLeft(2, '0')}';
  }

  PrivateEventBasics? get _basics {
    final city = _city;
    final savedCity = _savedCity;
    if ((city == null && savedCity == null && !_cityInherited) ||
        _date == null ||
        _start == null) {
      return null;
    }
    return PrivateEventBasics(
      name: _nameController.text,
      city: _cityInherited
          ? const EventSetupValue.inherit()
          : EventSetupValue.set(
              city == null
                  ? savedCity!
                  : EventSetupCity(
                      cityId: city.effectiveCityId,
                      marketId: city.effectiveMarketId,
                    ),
            ),
      localDate: _localDate,
      localStartTime: _localStartTime,
      timezone: _timezoneInherited
          ? const EventSetupValue.inherit()
          : EventSetupValue.set(_timezoneController.text),
      reviewedDefaultsHash: _cityInherited || _timezoneInherited
          ? _organizerDefaultsHash
          : null,
    );
  }

  PrivateEventBasics? get _currentExplicitBasics {
    final city = _city == null
        ? _savedCity
        : EventSetupCity(
            cityId: _city!.effectiveCityId,
            marketId: _city!.effectiveMarketId,
          );
    if (city == null ||
        _date == null ||
        _start == null ||
        _timezoneController.text.trim().isEmpty) {
      return null;
    }
    return PrivateEventBasics(
      name: _nameController.text,
      city: EventSetupValue.set(city),
      localDate: _localDate,
      localStartTime: _localStartTime,
      timezone: EventSetupValue.set(_timezoneController.text),
    );
  }

  void _applyExplicitBasics(PrivateEventBasics basics) {
    final city = basics.city.value;
    if (city != null) {
      _savedCity = city;
      _city = defaultCityOptions
          .where(
            (option) =>
                option.effectiveCityId == city.cityId &&
                option.effectiveMarketId == city.marketId,
          )
          .firstOrNull;
      _savedCityLabel = _city?.label ?? city.cityId;
    }
    _nameController.text = basics.name;
    _timezoneController.text = basics.timezone.value ?? '';
    _date = DateTime.tryParse(basics.localDate);
    final parts = basics.localStartTime.split(':');
    _start = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    _cityInherited = false;
    _timezoneInherited = false;
    _defaultsChanged = false;
  }

  String get _organizerDefaultsHash =>
      _managerDefaults?.basicsReviewedHash ?? '';

  void _restoreOrganizerCity() {
    final defaults = _managerDefaults;
    if (defaults?.cityId == null || defaults?.marketId == null) {
      return;
    }
    setState(() {
      _cityInherited = _trustedOrganizerDefaultsReadAvailable();
      for (final option in defaultCityOptions) {
        if (option.effectiveCityId == defaults!.cityId &&
            option.effectiveMarketId == defaults.marketId) {
          _city = option;
          break;
        }
      }
      _savedCity = EventSetupCity(
        cityId: defaults!.cityId!,
        marketId: defaults.marketId!,
      );
    });
  }

  void _restoreOrganizerTimezone() {
    final inherited = _managerDefaults?.timezone;
    if (inherited == null || inherited.trim().isEmpty) return;
    setState(() {
      _timezoneInherited = _trustedOrganizerDefaultsReadAvailable();
      _timezoneController.text = inherited;
    });
  }

  void _reviewCurrentDefaults() {
    if (_cityInherited) _restoreOrganizerCity();
    if (_timezoneInherited) _restoreOrganizerTimezone();
    setState(() {
      _defaultsChanged =
          (_cityInherited && _managerDefaults?.cityId == null) ||
          (_timezoneInherited && _managerDefaults?.timezone == null);
      _error = null;
    });
  }

  bool get _hasChanges =>
      _nameController.text.trim().isNotEmpty ||
      _date != null ||
      _start != null ||
      _submittedSignature != null ||
      _activeDraft != null ||
      widget.initialPrefill != null;

  Future<void> _pickDate() async {
    final today = DateUtils.dateOnly(DateTime.now());
    final date = await showCatchDatePicker(
      copy: catchDatePickerCopy(context.l10n),
      context: context,
      initialDate: _date != null && !_date!.isBefore(today) ? _date! : today,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      title: context.l10n.hostsCreateEventScreenTitleEventDate,
    );
    if (date != null && mounted) setState(() => _date = date);
  }

  Future<void> _pickStart() async {
    final time = await showCatchTimePicker(
      copy: catchTimePickerCopy(context.l10n),
      context: context,
      initialTime: _start ?? TimeOfDay.now(),
      title: context.l10n.hostsCreateEventScreenTitleStartTime,
    );
    if (time != null && mounted) setState(() => _start = time);
  }

  @override
  Widget build(BuildContext context) {
    // Keep the action controller alive while a manager read is in flight;
    // its draft journal is read again after that asynchronous boundary.
    ref.watch(createEventDraftControllerProvider);
    if (_loadingManagerDefaults) {
      return const HostCreateEventRouteLoadingScreen();
    }
    if (_managerDefaultsError != null) {
      return CatchScaffold.stepFlow(
        body: CatchErrorState(
          title: context.l10n.hostsEventDefaultsManagerUnavailable,
          message: _managerDefaultsError!,
          retryLabel: context.l10n.hostsPrivateEventRetryDefaultsRead,
          onRetry: () =>
              unawaited(_PrivateEventCreateBody(this)._loadOrganizerDefaults()),
          actions: const [CatchErrorBackButton()],
        ),
      );
    }
    final t = CatchTokens.of(context);
    final receipt = _receipt;
    if (_loadingSavedEvent) {
      return const HostCreateEventRouteLoadingScreen();
    }
    if (_readError != null) {
      return CatchScaffold.stepFlow(
        body: CatchErrorState(
          title:
              context.l10n.hostsHostCreateEventScreenTitleEventSetupUnavailable,
          message: _readError!,
          retryLabel: context.l10n.hostsPrivateEventRetrySavedRead,
          onRetry: () {
            final eventId = _receipt?.eventId ?? widget.initialSavedEventId;
            if (eventId != null) {
              unawaited(
                _PrivateEventCreateBody(
                  this,
                )._loadSavedEvent(savedEventId: eventId),
              );
            }
          },
          actions: const [CatchErrorBackButton()],
        ),
      );
    }
    if (_editingPreferences && _preferencesScope != null) {
      final preferences = ref.watch(
        privateEventPreferencesControllerProvider(_preferencesScope!),
      );
      final currentUid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
      if (!currentUid.isSettledData ||
          currentUid.value != _preferencesScope!.userId ||
          !preferences.actorAvailable) {
        return CatchScaffold.stepFlow(
          body: CatchErrorState(
            title: context.l10n.hostsEventPreferenceError,
            message: appErrorMessage(
              const SignInRequiredException('edit event settings'),
              l10n: context.l10n,
              context: AppErrorContext.event,
            ),
            actions: const [CatchErrorBackButton()],
          ),
        );
      }
      return PrivateEventPreferencesScreen(
        scope: _preferencesScope!,
        onBack: _PrivateEventCreateBody(this)._closePreferences,
      );
    }
    if (_editingPublication && _publicationScope != null) {
      final publication = ref.watch(
        eventPublicationControllerProvider(_publicationScope!),
      );
      final currentUid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
      if (!currentUid.isSettledData ||
          currentUid.value != _publicationScope!.userId ||
          !publication.actorAvailable) {
        return CatchScaffold.stepFlow(
          body: CatchErrorState(
            title: context.l10n.hostsEventPreferenceError,
            message: appErrorMessage(
              const SignInRequiredException('manage event visibility'),
              l10n: context.l10n,
              context: AppErrorContext.event,
            ),
            actions: const [CatchErrorBackButton()],
          ),
        );
      }
      return EventPublicationScreen(
        scope: _publicationScope!,
        onBack: _PrivateEventCreateBody(this)._closePublication,
        onEditDetails: () {
          _PrivateEventCreateBody(this)._closePublication();
          _PrivateEventCreateBody(this)._openDetails();
        },
      );
    }
    if (_editingDetails && _detailsScope != null) {
      final details = ref.watch(
        privateEventDetailsControllerProvider(_detailsScope!),
      );
      final currentUid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
      if (!currentUid.isSettledData ||
          currentUid.value != _detailsScope!.userId ||
          !details.actorAvailable) {
        return CatchScaffold.stepFlow(
          body: CatchErrorState(
            title: context.l10n.hostsEventPreferenceError,
            message: appErrorMessage(
              const SignInRequiredException('edit event details'),
              l10n: context.l10n,
              context: AppErrorContext.event,
            ),
            actions: const [CatchErrorBackButton()],
          ),
        );
      }
      return PrivateEventDetailsScreen(
        scope: _detailsScope!,
        onBack: _PrivateEventCreateBody(this)._closeDetails,
      );
    }
    if (receipt != null && !_editingSavedBasics) {
      return PrivateEventSetupScreen(
        readOnly: !_savedEventActive,
        publicationState: _savedPublicationState,
        club: widget.club,
        receipt: receipt,
        name: _nameController.text.trim(),
        date: _date!,
        start: _start!,
        cityLabel: _city?.label ?? _savedCityLabel ?? widget.club.location,
        pendingRosterFileName: widget.initialRosterImportPlan?.fileName,
        onEditBasics: _canEditSavedBasics || _pendingUpdate != null
            ? () => setState(() => _editingSavedBasics = true)
            : null,
        onSetupPublicListing: () =>
            _PrivateEventCreateBody(this)._openPublication(),
        onEditPayments: _savedEventActive && _savedPublicationState == 'private'
            ? () => _PrivateEventCreateBody(this)._openPreferences()
            : null,
        onEditDetails: _savedEventActive && _savedPublicationState == 'private'
            ? () => _PrivateEventCreateBody(this)._openDetails()
            : null,
        onClose: _PrivateEventCreateBody(this)._close,
      );
    }
    return PopScope(
      canPop:
          _allowPop ||
          (widget.returnToResponsesOnSave &&
              _receipt != null &&
              _savedBasics != null &&
              _pendingUpdate == null &&
              !_loadingSavedEvent &&
              _readError == null),
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _PrivateEventCreateBody(this)._close();
      },
      child: CatchScaffold.stepFlow(
        backgroundColor: t.bg,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchStepHeader(
              title: receipt == null
                  ? context.l10n.hostsHostEventsListLabelNewEvent
                  : context.l10n.hostsPrivateEventEditBasics,
              subtitle: widget.club.name,
              stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
              compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
                context.l10n,
              ),
              onBack: _saving ? null : _PrivateEventCreateBody(this)._close,
              leadingType: CatchTopBarNavigationMode.back,
            ),
            Expanded(
              child: AbsorbPointer(
                absorbing:
                    _saving ||
                    (receipt == null
                        ? _submittedSignature != null
                        : _pendingUpdate != null),
                child: Align(
                  alignment: Alignment.topCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: CatchLayout.hostCreateEventFormLaneMaxWidth,
                    ),
                    child: ListView(
                      padding: CatchInsets.formStepBodyWithBottomActions,
                      children: [
                        if (_defaultsChanged) ...[
                          CatchBanner.error(
                            message:
                                context.l10n.hostsPrivateEventDefaultsChanged,
                          ),
                          CatchButton(
                            label: context.l10n.hostsPrivateEventReviewDefaults,
                            onPressed: _reviewCurrentDefaults,
                            variant: CatchButtonVariant.secondary,
                          ),
                          gapH4,
                        ],
                        if (receipt == null && _submittedSignature != null) ...[
                          CatchBanner.error(
                            message:
                                context.l10n.hostsPrivateEventPendingRequest,
                          ),
                          gapH4,
                        ],
                        if (_pendingUpdate != null) ...[
                          CatchBanner.error(
                            message:
                                context.l10n.hostsPrivateEventPendingUpdate,
                          ),
                          gapH4,
                        ],
                        HostPrivateEventBasicsSection(
                          nameController: _nameController,
                          timezoneController: _timezoneController,
                          city: _city,
                          date: _date,
                          start: _start,
                          organizerLocation: widget.club.location,
                          savedCityLabel: _savedCityLabel,
                          suggestedTimezone: _managerDefaults?.timezone,
                          cityAccordion: _cityAccordion,
                          cityLocked:
                              receipt != null &&
                              !_canChangeSavedCity &&
                              _pendingUpdate == null,
                          canRestoreCity:
                              (receipt == null || _canChangeSavedCity) &&
                              !_cityInherited &&
                              _managerDefaults?.cityId != null,
                          hasSavedCity: _savedCity != null,
                          cityInherited: _cityInherited,
                          timezoneInherited: _timezoneInherited,
                          showErrors: _showErrors,
                          saving: _saving,
                          moreBasicsOpen: _moreBasicsOpen,
                          onChooseCity: (picked) => setState(() {
                            _city = picked;
                            _cityInherited = false;
                            _timezoneController.text = picked.timeZone;
                            _timezoneInherited = false;
                          }),
                          onRestoreCity: _restoreOrganizerCity,
                          onRestoreTimezone: _restoreOrganizerTimezone,
                          onTimezoneEdited: () {
                            if (_timezoneInherited) {
                              setState(() => _timezoneInherited = false);
                            }
                          },
                          onPickDate: _pickDate,
                          onPickStart: _pickStart,
                          onToggleMoreBasics: () => setState(
                            () => _moreBasicsOpen = !_moreBasicsOpen,
                          ),
                        ),
                        gapH4,
                        CatchText(
                          widget.returnToResponsesOnSave
                              ? context.l10n.hostsPrivateEventReturnToReviewHint
                              : context.l10n.hostsPrivateEventSaveHint,
                          variant: CatchTextVariant.bodyM,
                          color: t.ink2,
                        ),
                        if (_error != null) ...[
                          gapH4,
                          CatchBanner.error(message: _error!),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: CatchInsets.pageBodyTight,
                child: CatchButton(
                  key: const ValueKey('private-event-save'),
                  label: receipt != null
                      ? (_pendingUpdate == null
                            ? context.l10n.hostsEventEditSaveChanges
                            : context.l10n.hostsPrivateEventRetrySave)
                      : (_submittedSignature == null
                            ? (widget.returnToResponsesOnSave
                                  ? context
                                        .l10n
                                        .hostsPrivateEventSaveReturnResponses
                                  : context.l10n.hostsPrivateEventSaveContinue)
                            : context.l10n.hostsPrivateEventRetrySave),
                  onPressed:
                      _saving ||
                          (receipt != null &&
                              !_canEditSavedBasics &&
                              _pendingUpdate == null)
                      ? null
                      : _PrivateEventCreateBody(this)._save,
                  status: _saving
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  fullWidth: true,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
