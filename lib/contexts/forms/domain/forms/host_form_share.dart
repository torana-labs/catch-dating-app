import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:meta/meta.dart';

@immutable
class HostFormShareAssets {
  const HostFormShareAssets({
    required this.canonicalUrl,
    required this.embedUrl,
    required this.embedSnippet,
  });

  factory HostFormShareAssets.fromCallableData(Object? data) {
    final map = formDefinitionRequiredMap(data, 'form share assets');
    return HostFormShareAssets(
      canonicalUrl: formDefinitionRequiredString(map, 'canonicalUrl'),
      embedUrl: formDefinitionRequiredString(map, 'embedUrl'),
      embedSnippet: formDefinitionRequiredString(map, 'embedSnippet'),
    );
  }

  final String canonicalUrl;
  final String embedUrl;
  final String embedSnippet;
}

@immutable
class HostFormShareLink {
  const HostFormShareLink({
    required this.linkId,
    required this.label,
    required this.source,
    required this.sourceToken,
    required this.url,
  });

  factory HostFormShareLink.fromCallableData(Object? data) {
    final map = formDefinitionRequiredMap(data, 'form share link');
    return HostFormShareLink(
      linkId: formDefinitionRequiredString(map, 'linkId'),
      label: formDefinitionRequiredString(map, 'label'),
      source: formDefinitionNullableString(map['source']),
      sourceToken: formDefinitionRequiredString(map, 'sourceToken'),
      url: formDefinitionRequiredString(map, 'url'),
    );
  }

  final String linkId;
  final String label;
  final String? source;
  final String sourceToken;
  final String url;
}
