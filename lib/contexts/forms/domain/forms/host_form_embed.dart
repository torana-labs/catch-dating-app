import 'dart:convert';
import 'dart:math';

/// The public link and hosted embed code of one published form, built on the
/// device exactly as `getOrganizerFormShareAssets` built them on the server
/// (`publicFormUrl` and `organizerFormEmbedAssets` in
/// functions/src/organizers). Test `host_form_share_assets_test.dart` pins
/// the output to the server builder's strings.

final _embedIdPattern = RegExp(r'^[A-Za-z0-9_-]{1,80}$');

/// The form's canonical public URL: `<site>/f/<publicFormId>/`.
Uri hostFormPublicUrl(Uri site, String publicFormId) =>
    site.resolve('/f/$publicFormId/');

/// A fresh embed frame id: 12 random bytes, base64url (16 characters).
String newHostFormEmbedId([Random? random]) {
  final source = random ?? Random.secure();
  return base64Url.encode([for (var i = 0; i < 12; i++) source.nextInt(256)]);
}

/// The embed URL and installer snippet for [canonicalUrl]. The snippet holds
/// only public URLs, the escaped [title] and the frame id; the external
/// resize script finds its own iframe, so it works on sites that disallow
/// inline scripts and for repeated installs.
({String embedUrl, String embedSnippet}) hostFormEmbedAssets({
  required Uri canonicalUrl,
  required String title,
  required String embedId,
}) {
  if (!_embedIdPattern.hasMatch(embedId)) {
    throw ArgumentError.value(embedId, 'embedId', 'Invalid embed ID');
  }
  if (canonicalUrl.scheme != 'https') {
    throw ArgumentError.value(
      canonicalUrl,
      'canonicalUrl',
      'Embed URL must use HTTPS',
    );
  }
  final embedUri = canonicalUrl.replace(
    queryParameters: {
      ...canonicalUrl.queryParameters,
      'embed': '1',
      'embedId': embedId,
    },
  );
  final url = embedUri.toString();
  final snippet =
      '<iframe id="catch-form-$embedId" src="${_escapeHtml(url)}" '
      'title="${_escapeHtml(title)}" loading="lazy" '
      'style="display:block;width:100%;height:720px;border:0" '
      'referrerpolicy="strict-origin-when-cross-origin" '
      'allow="payment" scrolling="auto"></iframe>'
      '<script src="${embedUri.origin}/form-embed-resize.js"></script>'
      '<p><a href="${_escapeHtml(canonicalUrl.toString())}">'
      'Open the form directly</a></p>';
  return (embedUrl: url, embedSnippet: snippet);
}

String _escapeHtml(String value) => value.replaceAllMapped(
  RegExp('[&<>"\']'),
  (match) => switch (match[0]) {
    '&' => '&amp;',
    '<' => '&lt;',
    '>' => '&gt;',
    '"' => '&quot;',
    _ => '&#39;',
  },
);
