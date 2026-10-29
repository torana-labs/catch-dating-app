import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_audience_controller.g.dart';

@riverpod
HostAudienceController hostAudienceController(Ref ref) =>
    HostAudienceController(
      ref.watch(hostContactsRepositoryProvider),
      ref.watch(hostCommunicationRepositoryProvider),
      ref.watch(hostSavedAudienceRepositoryProvider),
      ref.watch(hostWhatsappRepositoryProvider),
      ref.watch(hostCampaignRepositoryProvider),
    );

class HostAudienceController {
  const HostAudienceController(
    this._contacts,
    this._communication,
    this._savedAudiences,
    this._whatsapp,
    this._campaign,
  );

  final HostContactsRepository _contacts;
  final HostCommunicationRepository _communication;
  final HostSavedAudienceRepository _savedAudiences;
  final HostWhatsappRepository _whatsapp;
  final HostCampaignRepository _campaign;

  Future<HostAudienceContactDetail> getContactDetail({
    required String organizerId,
    required String contactId,
  }) => _contacts.getContactDetail(organizerId, contactId);

  Future<void> mutateContact({
    required String organizerId,
    required String contactId,
    required int expectedRevision,
    String? displayNameOverride,
    bool clearDisplayNameOverride = false,
    bool? whatsappAdminSuppressed,
    bool? hidden,
  }) => _contacts.mutateContact(
    organizerId: organizerId,
    contactId: contactId,
    expectedRevision: expectedRevision,
    displayNameOverride: displayNameOverride,
    clearDisplayNameOverride: clearDisplayNameOverride,
    whatsappAdminSuppressed: whatsappAdminSuppressed,
    hidden: hidden,
  );

  Future<HostAudienceExport> exportContacts({
    required String organizerId,
    HostAudienceSegment? segment,
  }) => _contacts.exportContacts(organizerId, segment: segment);

  Future<HostMessagingSetup> completeWhatsappConnection({
    required String organizerId,
    required HostWhatsappSignupResult result,
  }) => _whatsapp.completeWhatsappConnection(organizerId, result);

  Future<HostMessagingSetup> syncWhatsappTemplates({
    required String organizerId,
    required String connectionId,
  }) => _whatsapp.syncWhatsappTemplates(organizerId, connectionId);

  Future<HostMessagingSetup> disconnectWhatsapp({
    required String organizerId,
    required String connectionId,
  }) => _whatsapp.disconnectWhatsapp(organizerId, connectionId);

  Future<HostMessagingSetup> sendWhatsappTest({
    required String organizerId,
    required String connectionId,
    required String templateId,
    required String toE164,
    required Map<String, String> templateVariables,
  }) => _whatsapp.sendWhatsappTest(
    organizerId: organizerId,
    connectionId: connectionId,
    templateId: templateId,
    toE164: toE164,
    templateVariables: templateVariables,
  );

  Future<HostSavedAudience> saveAudience({
    required String organizerId,
    required String requestId,
    required String name,
    required HostSavedAudienceDefinition definition,
    String? audienceId,
    int? expectedRevision,
  }) => _savedAudiences.upsertSavedAudience(
    organizerId: organizerId,
    requestId: requestId,
    name: name,
    definition: definition,
    audienceId: audienceId,
    expectedRevision: expectedRevision,
  );

  Future<HostSavedAudiencePreview> previewAudience({
    required String organizerId,
    required HostSavedAudience audience,
  }) => _savedAudiences.previewSavedAudience(
    organizerId: organizerId,
    audience: audience,
  );

  Future<HostSavedAudiencePreview> refreshAudiencePreview({
    required String organizerId,
    required HostSavedAudience audience,
    required bool Function() isCurrent,
  }) async {
    final authoritative = await _savedAudiences.reloadSavedAudience(
      organizerId: organizerId,
      audienceId: audience.audienceId,
      isCurrent: isCurrent,
    );
    if (!isCurrent()) throw StateError('Saved group refresh was superseded.');
    return _savedAudiences.previewSavedAudience(
      organizerId: organizerId,
      audience: authoritative,
    );
  }

  Future<HostSavedAudience> archiveAudience({
    required String organizerId,
    required HostSavedAudience audience,
  }) => _savedAudiences.archiveSavedAudience(
    organizerId: organizerId,
    audience: audience,
  );

  Future<HostCampaign> saveAndPreviewCampaign({
    required String organizerId,
    required HostCampaignDraft draft,
  }) async {
    final saved = await _campaign.upsertCampaign(organizerId, draft);
    return _campaign.previewCampaign(organizerId, saved);
  }

  Future<HostCampaign> approveCampaign({
    required String organizerId,
    required HostCampaign campaign,
  }) => _campaign.approveCampaign(organizerId, campaign);

  Future<HostCampaign> dispatchCampaign({
    required String organizerId,
    required HostCampaign campaign,
  }) => _campaign.dispatchCampaign(organizerId, campaign);

  Future<HostCampaign> cancelCampaign({
    required String organizerId,
    required HostCampaign campaign,
  }) => _campaign.cancelCampaign(organizerId, campaign);

  Future<HostCampaign> getCampaignReport({
    required String organizerId,
    required String campaignId,
  }) => _campaign.getCampaignReport(organizerId, campaignId);

  Future<HostSendsPage> listSends({
    required String organizerId,
    String? cursor,
  }) => _campaign.listCampaigns(organizerId, cursor: cursor);

  Future<HostManualSendTask> prepareManualSendTask({
    required String organizerId,
    required String contactId,
    required String requestId,
    required String prefillText,
  }) => _communication.prepareManualSendTask(
    organizerId: organizerId,
    contactId: contactId,
    requestId: requestId,
    prefillText: prefillText,
  );

  Future<HostManualSendTask> recordManualHandoffOpened(
    HostManualSendTask task,
  ) => _communication.recordManualHandoffOpened(task);

  Future<HostManualSendTask> validateManualSendTaskLaunch(
    HostManualSendTask task,
  ) => _communication.validateManualSendTaskLaunch(task);

  Future<HostManualSendTask> markManualSendTask(
    HostManualSendTask task,
    HostManualSendTaskAction action,
  ) => _communication.markManualSendTask(task, action);

  Future<HostManualSendTaskReplan> replanManualSendTasks({
    required String organizerId,
    required List<String> taskIds,
  }) => _communication.replanManualSendTasks(
    organizerId: organizerId,
    taskIds: taskIds,
  );

  Future<HostManualSendTaskPage> listManualSendTasks({
    required String organizerId,
    String? cursor,
  }) => _communication.listManualSendTasks(
    organizerId: organizerId,
    cursor: cursor,
  );

  Future<HostWhatsappThreadDetail> getWhatsappThread({
    required String organizerId,
    required String threadId,
  }) =>
      _whatsapp.getWhatsappThread(organizerId: organizerId, threadId: threadId);

  Future<void> sendWhatsappReply({
    required String organizerId,
    required HostWhatsappThreadDetail thread,
    required String body,
    required String idempotencyKey,
  }) => _whatsapp.sendWhatsappReply(
    organizerId: organizerId,
    thread: thread,
    body: body,
    idempotencyKey: idempotencyKey,
  );
}
