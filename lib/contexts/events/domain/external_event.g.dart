// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'external_event.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ExternalEventLink _$ExternalEventLinkFromJson(Map<String, dynamic> json) =>
    _ExternalEventLink(
      platform: json['platform'] as String? ?? '',
      url: json['url'] as String? ?? '',
      linkType: json['linkType'] as String? ?? '',
      sourceEventKey: json['sourceEventKey'] as String? ?? '',
      candidateId: json['candidateId'] as String? ?? '',
      primary: json['primary'] as bool,
    );

Map<String, dynamic> _$ExternalEventLinkToJson(_ExternalEventLink instance) =>
    <String, dynamic>{
      'platform': instance.platform,
      'url': instance.url,
      'linkType': instance.linkType,
      'sourceEventKey': instance.sourceEventKey,
      'candidateId': instance.candidateId,
      'primary': instance.primary,
    };
