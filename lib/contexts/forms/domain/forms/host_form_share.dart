import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_embed.dart';
import 'package:meta/meta.dart';

@immutable
class HostFormShareAssets {
  const HostFormShareAssets({
    required this.canonicalUrl,
    required this.embedUrl,
    required this.embedSnippet,
  });

  /// The share assets of a published form with [publicFormId] and [title]
  /// on [site], with the embed frame [embedId] ([hostFormEmbedAssets]).
  factory HostFormShareAssets.forPublicForm({
    required Uri site,
    required String publicFormId,
    required String title,
    required String embedId,
  }) {
    final canonical = hostFormPublicUrl(site, publicFormId);
    final embed = hostFormEmbedAssets(
      canonicalUrl: canonical,
      title: title,
      embedId: embedId,
    );
    return HostFormShareAssets(
      canonicalUrl: canonical.toString(),
      embedUrl: embed.embedUrl,
      embedSnippet: embed.embedSnippet,
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
