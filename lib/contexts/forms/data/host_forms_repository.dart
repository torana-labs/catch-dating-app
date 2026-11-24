import 'dart:convert';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_view_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_response_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_conversion.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_embed.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_share.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:catch_platform/persistence/command_journal_storage.dart';
import 'package:catch_platform/persistence/local_command_journal.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:crypto/crypto.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/forms/data/read_models/host_response_summary_reads.dart'
    show
        HostFormResponseScope,
        HostFormResponseScopeKey,
        HostResponseSummaryReads;

part 'host_forms_repository.g.dart';

// firestore-index: hostFormSummaries (organizerId:ASCENDING, status:ASCENDING, updatedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostFormSummaries (organizerId:ASCENDING, status:ASCENDING, purpose:ASCENDING, updatedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, submittedAtMillis:ASCENDING, __name__:ASCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, kind:ASCENDING, submittedAtMillis:ASCENDING, __name__:ASCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, kind:ASCENDING, submittedAtMillis:DESCENDING, __name__:DESCENDING)
class HostFormValidationResult {
  const HostFormValidationResult({required this.valid, required this.issues});

  factory HostFormValidationResult.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'form validation');
    final valid = map['valid'];
    if (valid is! bool) {
      throw const FormatException('Form validation was missing valid.');
    }
    return HostFormValidationResult(
      valid: valid,
      issues: _mapList(
        map['issues'],
        'form validation issues',
      ).map(HostFormValidationIssue.fromMap).toList(growable: false),
    );
  }

  final bool valid;
  final List<HostFormValidationIssue> issues;
}

class HostFormsRepository {
  HostFormsRepository(
    this._functions, {
    this.summaries,
    this.responses,
    this.views,
  });

  /// The response inbox read model. Only an instance that lists responses
  /// needs it; the export gateway's instance does not.
  final HostResponseSummaryReads? responses;

  /// The form list read model. Only an instance that lists forms needs it.
  final HostFormSummaryReads? summaries;

  /// The editor and analytics views. Only an instance that opens a form
  /// needs them.
  final HostFormViewReads? views;

  /// The newest editor state each form's own commands returned on this
  /// device, so opening the form waits for its view to catch up rather than
  /// showing the revision before. Revisions and instants only; it lives as
  /// long as this signed-in repository.
  final _ownWrites = <String, ({int draftRevision, int updatedAtMillis})>{};

  final FirebaseFunctions _functions;

  static T _required<T>(T? reads, String name) =>
      reads ?? (throw StateError('This repository has no $name read model.'));

  Future<HostFormPaymentSetup> managePaymentConnection({
    required String organizerId,
    required HostFormPaymentConnectionAction action,
    String? connectionId,
  }) => _call(
    name: 'manageOrganizerFormPaymentConnection',
    payload: ManageOrganizerFormPaymentConnectionCallableRequest(
      organizerId: organizerId,
      action: action.name,
      connectionId: connectionId,
    ).toJson(),
    action: 'manage form payment connection',
    parse: HostFormPaymentSetup.fromCallableData,
  );

  /// The forms of [request], [pageSize] at a time, every row kept live.
  LivePager<HostFormSummary> watchFormPages(
    HostFormListRequest request, {
    required int pageSize,
  }) =>
      _required(summaries, 'form list').watchPages(request, pageSize: pageSize);

  Future<HostFormEditor> createForm({
    required String organizerId,
    required String templateId,
    required String requestId,
    String? title,
  }) => _call(
    name: 'createOrganizerForm',
    payload: CreateOrganizerFormCallableRequest(
      organizerId: organizerId,
      templateId: templateId,
      requestId: requestId,
      title: title?.trim().isEmpty ?? true ? null : title?.trim(),
      defaultTargetKind: HostFormTargetKind.organizer.name,
      defaultTargetId: null,
    ).toJson(),
    action: 'create organizer form',
    parse: (data) => _noteEditor(HostFormEditor.fromCallableData(data)),
  );

  /// One form's editor from its `hostFormEditorViews` row (the
  /// `getOrganizerFormEditor` callable is no longer called). A form this
  /// device just created or saved opens once the view reaches that revision;
  /// a save from a view another device has since moved past still fails its
  /// revision check on the server.
  Future<HostFormEditor> getEditor({
    required String organizerId,
    required String formId,
  }) async {
    const context = BackendErrorContext(
      service: BackendService.firestore,
      action: 'load organizer form editor',
      resource: HostFormViewReads.editors,
    );
    final floor = _ownWrites[formId];
    final HostFormEditor? editor;
    try {
      editor = await _required(views, 'form editor').editor(
        organizerId: organizerId,
        formId: formId,
        reached: floor == null
            ? null
            : (editor) =>
                  editor.form.draftRevision >= floor.draftRevision &&
                  editor.form.updatedAt.millisecondsSinceEpoch >=
                      floor.updatedAtMillis,
      );
    } on FormatException catch (error) {
      // A row of another organizer reads as missing, as the callable said.
      throw DocumentNotFoundException('form', cause: error, context: context);
    }
    if (editor == null) {
      throw const DocumentNotFoundException('form', context: context);
    }
    return editor;
  }

  HostFormEditor _noteEditor(HostFormEditor editor) {
    _noteForm(editor.form);
    return editor;
  }

  HostFormSummary _noteForm(HostFormSummary form) {
    final known = _ownWrites[form.formId];
    final updatedAtMillis = form.updatedAt.millisecondsSinceEpoch;
    if (known == null ||
        form.draftRevision > known.draftRevision ||
        updatedAtMillis > known.updatedAtMillis) {
      _ownWrites[form.formId] = (
        draftRevision: known == null || form.draftRevision > known.draftRevision
            ? form.draftRevision
            : known.draftRevision,
        updatedAtMillis:
            known == null || updatedAtMillis > known.updatedAtMillis
            ? updatedAtMillis
            : known.updatedAtMillis,
      );
    }
    return form;
  }

  Future<HostFormEditor> updateDraft({
    required String organizerId,
    required String formId,
    required int expectedRevision,
    required HostFormDefinition definition,
  }) => _call(
    name: 'updateOrganizerFormDraft',
    payload: UpdateOrganizerFormDraftCallableRequest(
      organizerId: organizerId,
      formId: formId,
      expectedRevision: expectedRevision,
      definition: definition.toJson(),
    ).toJson(),
    action: 'save organizer form draft',
    parse: (data) => _noteEditor(HostFormEditor.fromCallableData(data)),
  );

  Future<HostFormValidationResult> validateDraft({
    required String organizerId,
    required String formId,
    required HostFormDefinition definition,
  }) => _call(
    name: 'validateOrganizerFormDraft',
    payload: ValidateOrganizerFormDraftCallableRequest(
      organizerId: organizerId,
      formId: formId,
      definition: definition.toJson(),
    ).toJson(),
    action: 'validate organizer form draft',
    parse: HostFormValidationResult.fromCallableData,
  );

  Future<HostFormSummary> publish({
    required String organizerId,
    required String formId,
    required int expectedRevision,
  }) => _call(
    name: 'publishOrganizerForm',
    payload: PublishOrganizerFormCallableRequest(
      organizerId: organizerId,
      formId: formId,
      expectedRevision: expectedRevision,
    ).toJson(),
    action: 'publish organizer form',
    parse: (data) => _noteForm(
      HostFormSummary.fromMap(_requiredMap(data, 'published organizer form')),
    ),
  );

  Future<HostFormSummary> setLifecycle({
    required String organizerId,
    required String formId,
    required HostFormLifecycleStatus expectedStatus,
    required HostFormLifecycleAction action,
  }) => _call(
    name: 'setOrganizerFormLifecycle',
    payload: SetOrganizerFormLifecycleCallableRequest(
      organizerId: organizerId,
      formId: formId,
      expectedStatus: expectedStatus.name,
      action: action.name,
    ).toJson(),
    action: '${action.name} organizer form',
    parse: (data) => _noteForm(
      HostFormSummary.fromMap(_requiredMap(data, 'organizer form lifecycle')),
    ),
  );

  Future<HostFormEditor> duplicate({
    required String organizerId,
    required String sourceFormId,
    required String requestId,
    String? title,
  }) => _call(
    name: 'duplicateOrganizerForm',
    payload: DuplicateOrganizerFormCallableRequest(
      organizerId: organizerId,
      sourceFormId: sourceFormId,
      requestId: requestId,
      title: title?.trim().isEmpty ?? true ? null : title?.trim(),
    ).toJson(),
    action: 'duplicate organizer form',
    parse: (data) => _noteEditor(HostFormEditor.fromCallableData(data)),
  );

  Future<void> deleteDraft({
    required String organizerId,
    required String formId,
    required int expectedRevision,
  }) => _call<void>(
    name: 'deleteOrganizerFormDraft',
    payload: DeleteOrganizerFormDraftCallableRequest(
      organizerId: organizerId,
      formId: formId,
      expectedRevision: expectedRevision,
    ).toJson(),
    action: 'delete organizer form draft',
    parse: (data) {
      final map = _requiredMap(data, 'deleted organizer form draft');
      if (map['deleted'] != true) {
        throw const FormatException('Organizer form draft was not deleted.');
      }
    },
  );

  /// A published form's public link and embed code, built on the device
  /// from its `hostFormSummaries` row (the `getOrganizerFormShareAssets`
  /// callable is no longer called). [embedId] names the embed frame; each
  /// read draws a fresh one, as the callable did.
  Future<HostFormShareAssets> getShareAssets({
    required String organizerId,
    required String formId,
    String? embedId,
  }) async {
    const context = BackendErrorContext(
      service: BackendService.firestore,
      action: 'load organizer form share assets',
      resource: 'hostFormSummaries',
    );
    final HostFormSummary? form;
    try {
      form = await _required(
        summaries,
        'form list',
      ).summary(organizerId: organizerId, formId: formId);
    } on FormatException catch (error) {
      // A row of another organizer reads as missing, as the callable said.
      throw DocumentNotFoundException('form', cause: error, context: context);
    }
    if (form == null) {
      throw const DocumentNotFoundException('form', context: context);
    }
    if (form.activeVersionId == null ||
        form.publishedVersion < 1 ||
        form.status == HostFormLifecycleStatus.archived) {
      throw const BackendOperationException(
        code: 'failed-precondition',
        message: 'Publish this form before sharing it.',
        context: context,
      );
    }
    return HostFormShareAssets.forPublicForm(
      site: AppConfig.publicSiteUrl,
      publicFormId: form.publicFormId,
      title: form.title,
      embedId: embedId ?? newHostFormEmbedId(),
    );
  }

  Future<HostFormShareLink> createShareLink({
    required String organizerId,
    required String formId,
    required String label,
    required String? source,
    required String requestId,
  }) => _call(
    name: 'createOrganizerFormShareLink',
    payload: CreateOrganizerFormShareLinkCallableRequest(
      organizerId: organizerId,
      formId: formId,
      label: label.trim(),
      source: source?.trim().isEmpty ?? true ? null : source?.trim(),
      requestId: requestId,
    ).toJson(),
    action: 'create organizer form share link',
    parse: HostFormShareLink.fromCallableData,
  );

  /// The entries of a request the response read model serves
  /// ([HostResponseSummaryReads.supports]), [pageSize] at a time, every row
  /// kept live.
  LivePager<HostFormInboxEntry> watchResponsePages(
    HostFormResponseListRequest request, {
    required int pageSize,
  }) => _required(
    responses,
    'response inbox',
  ).watchPages(request, pageSize: pageSize);

  /// A form page's version scope and answer filter options, read once.
  Future<HostFormResponseScope?> responseScope(HostFormResponseScopeKey key) =>
      _required(responses, 'response inbox').scope(key);

  Future<HostFormResponsePage> listResponses(
    HostFormResponseListRequest request,
  ) async {
    if (HostResponseSummaryReads.supports(request)) {
      return _required(responses, 'response inbox').list(request);
    }
    if (request.offeredOnly) {
      // The callable inbox does not know offers; never show its list here.
      throw StateError('Offers cannot be filtered this way.');
    }
    return _call(
      name: 'listOrganizerFormResponses',
      payload: ListOrganizerFormResponsesCallableRequest(
        organizerId: request.organizerId,
        formId: request.formId,
        contactId: request.contactId,
        includeApplications: request.includeApplications ? true : null,
        reviewStatus: request.reviewStatus?.name,
        versionId: request.versionId,
        statuses: request.statuses.map((value) => value.name).toList(),
        sortDirection: request.oldestFirst ? 'asc' : null,
        answerFilters: request.answerFilters.isEmpty
            ? null
            : [
                for (final entry in request.answerFilters.entries)
                  {
                    'questionId': entry.key,
                    'values': entry.value.toList()..sort(),
                  },
              ],
        identityKinds: request.identityKinds
            .map((value) => value.name)
            .toList(),
        sourceLinkId: request.sourceLinkId,
        query: request.query?.trim().isEmpty ?? true
            ? null
            : request.query?.trim(),
        fromMillis: request.from?.millisecondsSinceEpoch,
        toMillis: request.to?.millisecondsSinceEpoch,
        cursor: request.cursor,
        limit: request.limit.clamp(1, ReadLimitPolicy.historyPage).toInt(),
      ).toJson(),
      action: 'load organizer form responses',
      parse: (data) => HostFormResponsePage.fromCallableData(
        data,
        requireUnifiedEntries: request.includeApplications,
      ),
    );
  }

  Future<HostFormResponseDetail> getResponseDetail({
    required String organizerId,
    required String responseId,
  }) => _call(
    name: 'getOrganizerFormResponseDetail',
    payload: GetOrganizerFormResponseDetailCallableRequest(
      organizerId: organizerId,
      responseId: responseId,
    ).toJson(),
    action: 'load organizer form response',
    parse: HostFormResponseDetail.fromCallableData,
  );

  /// One published version's analytics and its form's share-link funnel
  /// while listened to, from `hostFormAnalyticsViews` and
  /// `hostFormSourceViews` (the `getOrganizerFormAnalytics` callable is no
  /// longer called).
  Stream<HostFormAnalytics> watchAnalytics({
    required String organizerId,
    required String formId,
    required String versionId,
  }) => _required(views, 'form analytics').watchAnalytics(
    organizerId: organizerId,
    formId: formId,
    versionId: versionId,
  );

  Future<HostFormExportReceipt> requestExport({
    required String organizerId,
    required String formId,
    required String requestId,
    required HostFormExportFormat format,
    Set<HostFormResponseStatus> statuses = const {},
    String? versionId,
    DateTime? from,
    DateTime? to,
    Map<String, Object?>? responseQuery,
    String? expectedQueryHash,
    String? expectedResultHash,
  }) => _call(
    name: 'requestOrganizerFormExport',
    payload: RequestOrganizerFormExportCallableRequest(
      organizerId: organizerId,
      formId: formId,
      requestId: requestId,
      format: format.name,
      statuses: statuses.map((value) => value.name).toList(),
      versionId: versionId,
      fromMillis: from?.millisecondsSinceEpoch,
      toMillis: to?.millisecondsSinceEpoch,
      responseQuery: responseQuery,
      expectedQueryHash: expectedQueryHash,
      expectedResultHash: expectedResultHash,
    ).toJson(),
    action: 'export organizer form responses',
    parse: HostFormExportReceipt.fromCallableData,
  );

  Future<HostFormConversionPreview> previewConversion({
    required String organizerId,
    required String responseId,
    required HostFormConversionKind kind,
    String? eventId,
    Map<String, Object?> overrides = const {},
  }) => _call(
    name: 'previewOrganizerFormConversion',
    payload: PreviewOrganizerFormConversionCallableRequest(
      organizerId: organizerId,
      responseId: responseId,
      kind: kind.name,
      eventId: eventId,
      overrides: overrides,
    ).toJson(),
    action: 'preview organizer form response conversion',
    parse: HostFormConversionPreview.fromCallableData,
  );

  Future<HostFormConversionReceipt> convertResponse({
    required String organizerId,
    required String responseId,
    required HostFormConversionKind kind,
    required String requestId,
    String? eventId,
    Map<String, Object?> overrides = const {},
  }) => _call(
    name: 'convertOrganizerFormResponse',
    payload: ConvertOrganizerFormResponseCallableRequest(
      organizerId: organizerId,
      responseId: responseId,
      kind: kind.name,
      eventId: eventId,
      overrides: overrides,
      requestId: requestId,
    ).toJson(),
    action: 'convert organizer form response',
    parse: HostFormConversionReceipt.fromCallableData,
  );

  Future<HostFormAutomationRule> saveAutomation({
    required String organizerId,
    required String? formId,
    required String requestId,
    required String name,
    required bool enabled,
    required HostFormAutomationTrigger trigger,
    required List<Map<String, Object?>> actions,
    String? ruleId,
    int? expectedRevision,
    Map<String, Object?>? condition,
    String? triggerEventId,
    int delayMinutes = 0,
  }) => _call(
    name: 'createOrganizerFormAutomation',
    payload: CreateOrganizerFormAutomationCallableRequest(
      organizerId: organizerId,
      formId: formId,
      ruleId: ruleId,
      requestId: requestId,
      expectedRevision: expectedRevision,
      name: name,
      enabled: enabled,
      trigger: trigger.name,
      triggerEventId: triggerEventId,
      delayMinutes: delayMinutes,
      condition: condition,
      actions: actions,
    ).toJson(),
    action: 'save organizer form automation',
    parse: (data) =>
        HostFormAutomationRule.fromMap(_requiredMap(data, 'form automation')),
  );

  Future<HostFormAutomationRule> setAutomationEnabled({
    required String organizerId,
    required String ruleId,
    required int expectedRevision,
    required bool enabled,
  }) => _call(
    name: 'setOrganizerFormAutomationState',
    payload: SetOrganizerFormAutomationStateCallableRequest(
      organizerId: organizerId,
      ruleId: ruleId,
      expectedRevision: expectedRevision,
      enabled: enabled,
    ).toJson(),
    action: 'update organizer form automation',
    parse: (data) =>
        HostFormAutomationRule.fromMap(_requiredMap(data, 'form automation')),
  );

  Future<T> _call<T>({
    required String name,
    required Map<String, Object?> payload,
    required String action,
    required T Function(Object?) parse,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(name)
          .call<Object?>(payload);
      return parse(result.data);
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: action,
      resource: name,
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

class _ExportStillPreparing implements Exception {
  const _ExportStillPreparing(this.receipt);
  final HostFormExportReceipt receipt;
}

/// Replays one exact filtered export after a timeout or app restart. A pending
/// receipt stays in the journal until the server reports a terminal state.
class JournalHostResponseExportGateway implements HostResponseExportGateway {
  JournalHostResponseExportGateway({
    required this.repository,
    required Future<CommandJournalStorage> Function() storage,
    required String? Function() currentAccountId,
  }) : _journal = LocalCommandJournal<HostResponseExportCommand>(
         storage: storage,
         namespace: 'host_response_export',
         currentAccountId: currentAccountId,
         codec: LocalCommandCodec(
           encode: (entry) => entry.toJson(),
           decode: HostResponseExportCommand.fromJson,
           scope: (entry) => entry.scope,
           resources: (entry) => {'form:${entry.formId}'},
         ),
       );

  final HostFormsRepository repository;
  final LocalCommandJournal<HostResponseExportCommand> _journal;

  @override
  Future<HostResponseExportCommand?> pending({
    required String accountId,
    required String organizerId,
    required String formId,
  }) async {
    final entries = await _journal.load(
      accountId,
      scope: '$organizerId|$formId',
    );
    if (entries.length > 1) {
      throw StateError('Resolve the saved response exports in order.');
    }
    return entries.firstOrNull;
  }

  @override
  Future<HostFormExportReceipt> execute(
    HostResponseExportCommand command,
  ) async {
    final saved = await pending(
      accountId: command.accountId,
      organizerId: command.organizerId,
      formId: command.formId,
    );
    if (saved != null) {
      if (jsonEncode(saved.toJson()) != jsonEncode(command.toJson())) {
        throw StateError('Resolve the saved response export first.');
      }
    } else {
      await _journal.append(command.accountId, command);
    }
    HostFormExportReceipt? terminal;
    try {
      await _journal.flush(command.accountId, command.scope, (entry) async {
        if (entry.requestId != command.requestId) {
          throw StateError('Another response export is pending.');
        }
        final receipt = await repository.requestExport(
          organizerId: entry.organizerId,
          formId: entry.formId,
          requestId: entry.requestId,
          format: entry.format,
          statuses: entry.statuses
              .map(HostFormResponseStatus.values.byName)
              .toSet(),
          versionId: entry.versionId,
          responseQuery: entry.responseQuery,
          expectedQueryHash: entry.expectedQueryHash,
          expectedResultHash: entry.expectedResultHash,
        );
        final digest = sha256
            .convert(
              utf8.encode(
                [
                  entry.organizerId,
                  entry.formId,
                  entry.requestId,
                ].join('\u001f'),
              ),
            )
            .toString()
            .substring(0, 32);
        if (receipt.exportId != 'formexport_$digest' ||
            receipt.format != entry.format) {
          throw const FormatException('Response export receipt is invalid.');
        }
        if (receipt.status == HostFormExportStatus.pending ||
            receipt.status == HostFormExportStatus.running) {
          throw _ExportStillPreparing(receipt);
        }
        terminal = receipt;
      });
    } on _ExportStillPreparing catch (waiting) {
      return waiting.receipt;
    }
    if (terminal == null) {
      throw StateError('Response export is already being checked.');
    }
    return terminal!;
  }
}

// keepalive: account-free: one facade is shared by every Forms route. It
// keeps only the revisions its own commands returned, and it is rebuilt with
// the signed-in session, so none reach another account.
@Riverpod(keepAlive: true)
HostFormsRepository hostFormsRepository(Ref ref) {
  ref.watch(authenticatedSessionProvider);
  return HostFormsRepository(
    ref.watch(firebaseFunctionsProvider),
    responses: HostResponseSummaryReads(
      ScopedReadModelReader(
        ref.watch(firebaseFirestoreProvider),
        family: hostReadModels,
        actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
      ),
    ),
    summaries: HostFormSummaryReads(
      ScopedReadModelReader(
        ref.watch(firebaseFirestoreProvider),
        family: hostReadModels,
        actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
      ),
    ),
    views: HostFormViewReads(
      ScopedReadModelReader(
        ref.watch(firebaseFirestoreProvider),
        family: hostReadModels,
        actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
      ),
    ),
  );
}

Map<Object?, Object?> _requiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

List<Map<Object?, Object?>> _mapList(Object? value, String label) {
  if (value is! List<Object?>) throw FormatException('Invalid $label.');
  return value.map((item) => _requiredMap(item, label)).toList(growable: false);
}
