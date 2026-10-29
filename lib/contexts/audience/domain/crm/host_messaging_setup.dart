import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

class HostWhatsappEmbeddedSignupConfig {
  const HostWhatsappEmbeddedSignupConfig({
    required this.appId,
    required this.configId,
    required this.graphVersion,
  });

  final String? appId;
  final String? configId;
  final String? graphVersion;

  bool get isConfigured =>
      appId != null && configId != null && graphVersion != null;
}

enum HostWhatsappCampaignReadiness {
  providerUnavailable,
  senderNotConnected,
  senderNeedsAttention,
  approvedTemplateRequired,
  ready,
}

class HostWhatsappConnection {
  const HostWhatsappConnection({
    required this.connectionId,
    required this.status,
    required this.displayPhoneNumber,
    required this.verifiedName,
    required this.qualityRating,
    required this.messagingLimitTier,
    required this.templateSyncStatus,
    required this.webhookStatus,
    required this.testStatus,
    required this.revision,
  });

  factory HostWhatsappConnection.fromMap(Map<Object?, Object?> map) =>
      HostWhatsappConnection(
        connectionId: crmRequiredString(map, 'connectionId'),
        status: crmRequiredString(map, 'status'),
        displayPhoneNumber: crmNullableString(map['displayPhoneNumber']),
        verifiedName: crmNullableString(map['verifiedName']),
        qualityRating: crmNullableString(map['qualityRating']),
        messagingLimitTier: crmNullableString(map['messagingLimitTier']),
        templateSyncStatus: crmRequiredString(map, 'templateSyncStatus'),
        webhookStatus: crmRequiredString(map, 'webhookStatus'),
        testStatus: crmRequiredString(map, 'testStatus'),
        revision: crmRequiredInt(map, 'revision'),
      );

  final String connectionId;
  final String status;
  final String? displayPhoneNumber;
  final String? verifiedName;
  final String? qualityRating;
  final String? messagingLimitTier;
  final String templateSyncStatus;
  final String webhookStatus;
  final String testStatus;
  final int revision;

  bool get isActive => status == 'active';
}

class HostWhatsappTemplate {
  const HostWhatsappTemplate({
    required this.templateId,
    required this.name,
    required this.language,
    required this.category,
    required this.status,
    required this.variableNames,
    required this.hasMediaHeader,
    required this.buttonKinds,
  });

  factory HostWhatsappTemplate.fromMap(Map<Object?, Object?> map) =>
      HostWhatsappTemplate(
        templateId: crmRequiredString(map, 'templateId'),
        name: crmRequiredString(map, 'name'),
        language: crmRequiredString(map, 'language'),
        category: crmRequiredString(map, 'category'),
        status: crmRequiredString(map, 'status'),
        variableNames: crmStringList(map['variableNames']),
        hasMediaHeader: crmRequiredBool(map, 'hasMediaHeader'),
        buttonKinds: crmStringList(map['buttonKinds']),
      );

  final String templateId;
  final String name;
  final String language;
  final String category;
  final String status;
  final List<String> variableNames;
  final bool hasMediaHeader;
  final List<String> buttonKinds;

  bool get isApproved => status == 'APPROVED';
}

class HostMessagingSetup {
  const HostMessagingSetup({
    required this.organizerId,
    required this.providerConfigured,
    required this.embeddedSignup,
    required this.connection,
    required this.templates,
  });

  factory HostMessagingSetup.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'organizer messaging setup response');
    final signup = crmRequiredMap(map['embeddedSignup'], 'embeddedSignup');
    final connectionValue = map['connection'];
    return HostMessagingSetup(
      organizerId: crmRequiredString(map, 'organizerId'),
      providerConfigured: crmRequiredBool(map, 'providerConfigured'),
      embeddedSignup: HostWhatsappEmbeddedSignupConfig(
        appId: crmNullableString(signup['appId']),
        configId: crmNullableString(signup['configId']),
        graphVersion: crmNullableString(signup['graphVersion']),
      ),
      connection: connectionValue == null
          ? null
          : HostWhatsappConnection.fromMap(
              crmRequiredMap(connectionValue, 'connection'),
            ),
      templates: crmMapList(
        map['templates'],
        'templates',
      ).map(HostWhatsappTemplate.fromMap).toList(growable: false),
    );
  }

  final String organizerId;
  final bool providerConfigured;
  final HostWhatsappEmbeddedSignupConfig embeddedSignup;
  final HostWhatsappConnection? connection;
  final List<HostWhatsappTemplate> templates;

  List<HostWhatsappTemplate> get approvedTemplates => templates
      .where((template) => template.isApproved)
      .toList(growable: false);

  HostWhatsappCampaignReadiness get campaignReadiness {
    if (!providerConfigured) {
      return HostWhatsappCampaignReadiness.providerUnavailable;
    }
    final sender = connection;
    if (sender == null) {
      return HostWhatsappCampaignReadiness.senderNotConnected;
    }
    if (!sender.isActive) {
      return HostWhatsappCampaignReadiness.senderNeedsAttention;
    }
    if (approvedTemplates.isEmpty) {
      return HostWhatsappCampaignReadiness.approvedTemplateRequired;
    }
    return HostWhatsappCampaignReadiness.ready;
  }

  bool get canComposeCampaign =>
      campaignReadiness == HostWhatsappCampaignReadiness.ready;

  /// Whether this client can show sender management for the organizer.
  ///
  /// Connecting a new sender requires Meta Embedded Signup, so a client without
  /// it can only manage a sender that is already connected.
  bool canManageWhatsappSender({required bool embeddedSignupSupported}) =>
      providerConfigured && (embeddedSignupSupported || connection != null);
}

class HostWhatsappSignupResult {
  const HostWhatsappSignupResult({
    required this.authorizationCode,
    required this.wabaId,
    required this.phoneNumberId,
    this.businessId,
  });

  final String authorizationCode;
  final String wabaId;
  final String phoneNumberId;
  final String? businessId;
}
