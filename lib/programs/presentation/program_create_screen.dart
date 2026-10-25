import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/clubs/data/clubs_repository.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:catch_dating_app/programs/domain/program_timezone.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_timezone_field.dart';
import 'package:catch_dating_app/programs/presentation/program_timezone_providers.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ProgramCreateScreen extends ConsumerWidget {
  const ProgramCreateScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = account.value;
    if (uid == null) {
      return CatchScaffold.stepFlow(
        body: Column(
          children: [
            CatchStepHeader(
              title: context.l10n.programsCreateTitle,
              stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
              compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
                context.l10n,
              ),
              onBack: () => Navigator.of(context).pop(),
              leadingType: CatchTopBarNavigationMode.back,
            ),
            Expanded(
              child: account.error != null
                  ? CatchLocalizedErrorState(
                      account.error!,
                      context: AppErrorContext.auth,
                      onRetry: () => ref.invalidate(uidProvider),
                    )
                  : const CatchStateViewport.loading(
                      accountForBottomOverlay: false,
                    ),
            ),
          ],
        ),
      );
    }
    // Keep the scoped draft/key/receipt alive throughout route-level organizer
    // loading and retry. Replacing an async body must not create a new command.
    final controller = ref.watch(
      programCreateControllerProvider((
        accountId: uid,
        organizerId: organizerId,
      )),
    );
    return CatchScaffold.stepFlow(
      body: controller.when(
        loading: () => Column(
          children: [
            CatchStepHeader(
              title: context.l10n.programsCreateTitle,
              stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
              compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
                context.l10n,
              ),
              onBack: () => Navigator.of(context).pop(),
              leadingType: CatchTopBarNavigationMode.back,
            ),
            const Expanded(
              child: CatchStateViewport.loading(accountForBottomOverlay: false),
            ),
          ],
        ),
        error: (error, _) => Column(
          children: [
            CatchStepHeader(
              title: context.l10n.programsCreateTitle,
              stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
              compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
                context.l10n,
              ),
              onBack: () => Navigator.of(context).pop(),
              leadingType: CatchTopBarNavigationMode.back,
            ),
            Expanded(
              child: CatchLocalizedErrorState(
                error,
                context: AppErrorContext.event,
                onRetry: () => ref.invalidate(
                  programCreateControllerProvider((
                    accountId: uid,
                    organizerId: organizerId,
                  )),
                ),
              ),
            ),
          ],
        ),
        data: (controller) => CatchAsyncBoundary<List<Club>>(
          value: ref.watch(hostOperableClubsProvider(uid)),
          retainDataOn: const {},
          onRetry: () => ref.invalidate(hostOperableClubsProvider(uid)),
          loadingBuilder: (_) => Column(
            children: [
              CatchStepHeader(
                title: context.l10n.programsCreateTitle,
                stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
                compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
                  context.l10n,
                ),
                onBack: () => Navigator.of(context).pop(),
                leadingType: CatchTopBarNavigationMode.back,
              ),
              const Expanded(
                child: CatchStateViewport.loading(
                  accountForBottomOverlay: false,
                ),
              ),
            ],
          ),
          errorBuilder: (_, error, _, retry) => Column(
            children: [
              CatchStepHeader(
                title: context.l10n.programsCreateTitle,
                stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
                compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
                  context.l10n,
                ),
                onBack: () => Navigator.of(context).pop(),
                leadingType: CatchTopBarNavigationMode.back,
              ),
              Expanded(
                child: CatchLocalizedErrorState(
                  error,
                  context: AppErrorContext.club,
                  onRetry: retry,
                ),
              ),
            ],
          ),
          builder: (context, clubs) {
            final organizer = clubs
                .where((club) => club.id == organizerId)
                .firstOrNull;
            final selected = ref.watch(hostOrganizerSelectionProvider(uid));
            if (organizer == null ||
                (selected != null && selected != organizerId)) {
              return Column(
                children: [
                  CatchStepHeader(
                    title: context.l10n.programsCreateTitle,
                    stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
                    compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
                      context.l10n,
                    ),
                    onBack: () => Navigator.of(context).pop(),
                    leadingType: CatchTopBarNavigationMode.back,
                  ),
                  Expanded(
                    child: CatchEmptyState(
                      icon: CatchIcons.date,
                      title: context.l10n.programsCreateActorChangedTitle,
                      message: context.l10n.programsCreateActorChangedBody,
                    ),
                  ),
                ],
              );
            }
            return ProgramCreatePageBody(
              key: ValueKey('program-create-$uid-$organizerId'),
              organizerName: organizer.name,
              controller: controller,
              timezoneSuggestion:
                  ref.exists(
                    programTimezoneSuggestionProvider((
                      accountId: uid,
                      organizerId: organizerId,
                    )),
                  )
                  ? ref
                        .read(
                          programTimezoneSuggestionProvider((
                            accountId: uid,
                            organizerId: organizerId,
                          )),
                        )
                        .value
                  : null,
              onSaved: (programId) => context.goNamed(
                Routes.hostEventsScreen.name,
                queryParameters: {
                  'organizerId': organizerId,
                  'programId': programId,
                },
                extra: OrganizerProgramListAnchor(
                  accountId: uid,
                  organizerId: organizerId,
                  row: controller.confirmedRow!,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Rendering and Flutter field mechanics only. Validation, pending commands,
/// receipt recovery, and list confirmation belong to the injected controller.
class ProgramCreatePageBody extends StatefulWidget {
  const ProgramCreatePageBody({
    super.key,
    required this.organizerName,
    required this.controller,
    required this.onSaved,
    this.timezoneSuggestion,
  });

  final String organizerName;
  final ProgramCreateController controller;
  final ValueChanged<String> onSaved;
  final ProgramTimezoneSuggestion? timezoneSuggestion;

  @override
  State<ProgramCreatePageBody> createState() => _ProgramCreatePageBodyState();
}

class _ProgramCreatePageBodyState extends State<ProgramCreatePageBody> {
  late final _title = TextEditingController(
    text: widget.controller.values.title,
  );
  bool _timezoneOpen = false;
  String _timezoneQuery = '';
  bool _allowPop = false;

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool start}) async {
    final controller = widget.controller;
    if (controller.fieldsLocked) return;
    final values = controller.values;
    final initial =
        (start ? values.startsAt : values.endsAt) ??
        values.startsAt ??
        DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1970),
      lastDate: DateTime(2100, 12, 31),
    );
    if (date == null || !mounted || controller.fieldsLocked) return;
    controller.edit(
      start ? values.copyWith(startsAt: date) : values.copyWith(endsAt: date),
    );
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final id = await widget.controller.submit();
    if (mounted && id != null) widget.onSaved(id);
  }

  Future<void> _close() async {
    final controller = widget.controller;
    if (controller.saving) return;
    final hasDraft =
        controller.values.title.isNotEmpty ||
        controller.values.timezone.isNotEmpty ||
        controller.values.kind != null ||
        controller.values.startsAt != null ||
        controller.values.endsAt != null;
    if (hasDraft && !controller.confirmed && !controller.actorChanged) {
      final leave = await showCatchAdaptiveDialog<bool>(
        context: context,
        title: context.l10n.programsCreateLeaveTitle,
        message: controller.commandPending
            ? context.l10n.programsCreateLeavePendingBody
            : context.l10n.programsCreateLeaveDraftBody,
        actions: [
          CatchDialogAction(
            label: context.l10n.programsCreateKeepEditing,
            value: false,
          ),
          CatchDialogAction(
            label: context.l10n.programsCreateLeaveAction,
            value: true,
          ),
        ],
      );
      if (!mounted || leave != true) return;
    }
    setState(() => _allowPop = true);
    Navigator.of(context).pop();
  }

  String? _fieldError(BuildContext context, ProgramCreateField field) {
    final controller = widget.controller;
    if (!controller.showErrors) return null;
    return switch (controller.values.errors[field]) {
      null => null,
      ProgramCreateValidation.required => context.l10n.programsCreateRequired,
      ProgramCreateValidation.tooLong => context.l10n.programsCreateTooLong(
        maximum: field == ProgramCreateField.title
            ? CatchContractConstraints
                  .createOrganizerProgramCallablePayloadTitle
                  .maxLength!
            : CatchContractConstraints
                  .createOrganizerProgramCallablePayloadTimezone
                  .maxLength!,
      ),
      ProgramCreateValidation.invalidTimezone =>
        context.l10n.programsTimezoneInvalid,
      ProgramCreateValidation.invalidDate =>
        context.l10n.programsCreateInvalidDate,
      ProgramCreateValidation.endAfterStart =>
        context.l10n.programsCreateEndAfterStart,
    };
  }

  String _timezoneHelper(BuildContext context) {
    final suggestion = widget.timezoneSuggestion;
    final l10n = context.l10n;
    if (suggestion == null ||
        suggestion.value.identifier != widget.controller.values.timezone) {
      return l10n.programsTimezoneDatesHint;
    }
    final source = switch (suggestion.value.source) {
      ProgramTimezoneSource.organizer => l10n.programsTimezoneFromOrganizer,
      ProgramTimezoneSource.city => l10n.programsTimezoneFromCity,
      ProgramTimezoneSource.device => l10n.programsTimezoneFromDevice,
      ProgramTimezoneSource.manual => l10n.programsTimezoneDatesHint,
    };
    return suggestion.defaultsError == null
        ? source
        : '${l10n.programsTimezoneDefaultsUnavailable} $source';
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.controller,
    builder: (context, _) {
      final controller = widget.controller;
      final values = controller.values;
      final l10n = context.l10n;
      final copy = catchFieldCopy(l10n);
      return PopScope(
        canPop: _allowPop || controller.actorChanged || controller.confirmed,
        onPopInvokedWithResult: (popped, _) {
          if (!popped) _close();
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchStepHeader(
              title: l10n.programsCreateTitle,
              subtitle: widget.organizerName,
              stepLabelBuilder: catchStepHeaderLabelBuilder(l10n),
              compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(l10n),
              onBack: controller.saving ? null : _close,
              leadingType: CatchTopBarNavigationMode.back,
            ),
            Expanded(
              child: Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: CatchLayout.hostCreateEventFormLaneMaxWidth,
                  ),
                  child: ListView(
                    padding: CatchInsets.formStepBodyWithBottomActions,
                    children: [
                      if (controller.actorChanged)
                        CatchBanner.error(
                          message: l10n.programsCreateActorChangedBody,
                        ),
                      AbsorbPointer(
                        absorbing: controller.fieldsLocked,
                        child: CatchSectionList(
                          emptyStateOmitted: true,
                          children: [
                            CatchSection.fieldRows(
                              first: true,
                              children: [
                                CatchField.input(
                                  copy: copy,
                                  key: const ValueKey('program-create-title'),
                                  title: l10n.programsCreateNameLabel,
                                  controller: _title,
                                  contract: CatchContractConstraints
                                      .createOrganizerProgramCallablePayloadTitle,
                                  inputHint: l10n.programsCreateNameHint,
                                  textCapitalization: TextCapitalization.words,
                                  onChanged: (value) => controller.edit(
                                    values.copyWith(title: value),
                                  ),
                                  error: _fieldError(
                                    context,
                                    ProgramCreateField.title,
                                  ),
                                ),
                                CatchField<ProgramKind>.choices(
                                  copy: copy,
                                  key: const ValueKey('program-create-kind'),
                                  title: l10n.programsCreateKindLabel,
                                  body: values.kind == null
                                      ? l10n.programsCreateChooseKind
                                      : programKindLabel(context, values.kind!),
                                  contract: CatchContractConstraints
                                      .createOrganizerProgramCallablePayloadKind,
                                  contractValueBuilder: (kind) => kind.name,
                                  values: ProgramKind.values,
                                  itemLabelBuilder: (kind) =>
                                      programKindLabel(context, kind),
                                  selected: {
                                    if (values.kind != null) values.kind!,
                                  },
                                  onSelectionChanged: (selection) {
                                    if (selection.isNotEmpty) {
                                      controller.edit(
                                        values.copyWith(kind: selection.single),
                                      );
                                    }
                                  },
                                  error: _fieldError(
                                    context,
                                    ProgramCreateField.kind,
                                  ),
                                ),
                                ProgramTimezoneField(
                                  fieldCopy: copy,
                                  searchCopy: catchSearchFieldCopy(l10n),
                                  title: l10n.programsCreateTimezoneLabel,
                                  placeholder: l10n.programsCreateTimezoneHint,
                                  searchPlaceholder:
                                      l10n.programsTimezoneSearchHint,
                                  emptyMessage: l10n.programsTimezoneNoMatches,
                                  indiaLabel: l10n.programsTimezoneIndia,
                                  helperText: _timezoneHelper(context),
                                  selected: values.timezone,
                                  query: _timezoneQuery,
                                  date: values.startsAt ?? DateTime.now(),
                                  open: _timezoneOpen,
                                  enabled: !controller.fieldsLocked,
                                  onOpenChanged: (open) {
                                    if (controller.fieldsLocked) return;
                                    setState(() {
                                      _timezoneOpen = open;
                                      _timezoneQuery = '';
                                    });
                                  },
                                  onQueryChanged: (query) {
                                    if (!controller.fieldsLocked) {
                                      setState(() => _timezoneQuery = query);
                                    }
                                  },
                                  onSelected: (timezone) {
                                    if (controller.fieldsLocked) return;
                                    controller.edit(
                                      controller.values.copyWith(
                                        timezone: timezone,
                                      ),
                                    );
                                    setState(() => _timezoneOpen = false);
                                  },
                                  error: _fieldError(
                                    context,
                                    ProgramCreateField.timezone,
                                  ),
                                ),
                                CatchField.nav(
                                  copy: copy,
                                  key: const ValueKey('program-create-start'),
                                  title: l10n.programsCreateStartLabel,
                                  body: values.startsAt == null
                                      ? l10n.hostsWhenStepPlaceholderSelectADate
                                      : MaterialLocalizations.of(
                                          context,
                                        ).formatMediumDate(values.startsAt!),
                                  icon: CatchIcons.date,
                                  onTap: () => _pickDate(start: true),
                                  error: _fieldError(
                                    context,
                                    ProgramCreateField.start,
                                  ),
                                ),
                                CatchField.nav(
                                  copy: copy,
                                  key: const ValueKey('program-create-end'),
                                  title: l10n.programsCreateEndLabel,
                                  body: values.endsAt == null
                                      ? l10n.hostsWhenStepPlaceholderSelectADate
                                      : MaterialLocalizations.of(
                                          context,
                                        ).formatMediumDate(values.endsAt!),
                                  icon: CatchIcons.date,
                                  onTap: () => _pickDate(start: false),
                                  error: _fieldError(
                                    context,
                                    ProgramCreateField.end,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (controller.commandPending && !controller.confirmed)
                        CatchBanner(
                          message: controller.programId == null
                              ? l10n.programsCreatePendingBody
                              : l10n.programsCreateConfirmingBody,
                        ),
                      if (controller.confirmed)
                        CatchBanner(message: l10n.programsCreateSavedBody),
                      if (controller.error != null)
                        CatchBanner.error(
                          message:
                              controller.error is ProgramNotVisibleException
                              ? l10n.programsCreateNotVisibleBody
                              : appErrorMessage(
                                  controller.error!,
                                  l10n: l10n,
                                  context: AppErrorContext.event,
                                ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: CatchInsets.pageBodyTight,
                child: CatchButton(
                  key: const ValueKey('program-create-submit'),
                  label: controller.saving
                      ? (controller.programId == null
                            ? l10n.programsCreateSaving
                            : l10n.programsCreateConfirming)
                      : controller.confirmed
                      ? l10n.programsCreateViewEvents
                      : controller.commandPending
                      ? l10n.programsCreateRetry
                      : l10n.programsCreateSubmit,
                  onPressed: controller.saving || controller.actorChanged
                      ? null
                      : controller.confirmed
                      ? () => widget.onSaved(controller.programId!)
                      : _submit,
                  status: controller.saving
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  fullWidth: true,
                ),
              ),
            ),
          ],
        ),
      );
    },
  );
}

String programKindLabel(BuildContext context, ProgramKind kind) =>
    switch (kind) {
      ProgramKind.wedding => context.l10n.programsCreateKindWedding,
      ProgramKind.corporate => context.l10n.programsCreateKindCorporate,
      ProgramKind.social => context.l10n.programsCreateKindSocial,
      ProgramKind.other => context.l10n.programsCreateKindOther,
    };
