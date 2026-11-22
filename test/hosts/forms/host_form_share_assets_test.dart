import 'dart:math';

import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_embed.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_share.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

// The exact strings `organizerFormEmbedAssets` (functions/src/organizers/
// organizerFormEmbed.ts) returns for this URL, title and id, captured from
// the server builder. A change to either builder must change both.
const _site = 'https://forms.example';
const _canonical = '$_site/f/public_form_1234567890/';
const _title = 'Run & "Brunch" <Sign-up> it\'s on';
const _embedId = 'embed_Fixed-ID_123';
const _serverEmbedUrl =
    '$_site/f/public_form_1234567890/?embed=1&embedId=embed_Fixed-ID_123';
const _serverSnippet =
    '<iframe id="catch-form-embed_Fixed-ID_123" '
    'src="https://forms.example/f/public_form_1234567890/'
    '?embed=1&amp;embedId=embed_Fixed-ID_123" '
    'title="Run &amp; &quot;Brunch&quot; &lt;Sign-up&gt; it&#39;s on" '
    'loading="lazy" style="display:block;width:100%;height:720px;border:0" '
    'referrerpolicy="strict-origin-when-cross-origin" allow="payment" '
    'scrolling="auto"></iframe>'
    '<script src="https://forms.example/form-embed-resize.js"></script>'
    '<p><a href="https://forms.example/f/public_form_1234567890/">'
    'Open the form directly</a></p>';

Map<String, Object?> _summary({
  String organizerId = 'org',
  String status = 'published',
  String? activeVersionId = 'version-1',
  int publishedVersion = 1,
}) => {
  'organizerId': organizerId,
  'formId': 'form-1',
  'version': 1,
  'status': status,
  'purpose': 'survey',
  'updatedAtMillis': 1,
  'row': {
    'organizerId': organizerId,
    'formId': 'form-1',
    'title': _title,
    'description': null,
    'purpose': 'survey',
    'status': status,
    'templateId': 'blank',
    'publicFormId': 'public_form_1234567890',
    'defaultTargetKind': 'organizer',
    'defaultTargetId': null,
    'activeVersionId': activeVersionId,
    'draftRevision': 1,
    'publishedVersion': publishedVersion,
    'submittedResponseCount': 0,
    'consequences': {
      'coverage': 'unavailable',
      'identityPolicy': null,
      'enabledAutomationActionKinds': <String>[],
    },
    'updatedAtMillis': 1,
    'publishedAtMillis': 1,
    'lastResponseAtMillis': null,
  },
};

void main() {
  group('embed builder', () {
    test('matches the server builder string for string', () {
      final assets = HostFormShareAssets.forPublicForm(
        site: Uri.parse(_site),
        publicFormId: 'public_form_1234567890',
        title: _title,
        embedId: _embedId,
      );

      expect(assets.canonicalUrl, _canonical);
      expect(assets.embedUrl, _serverEmbedUrl);
      expect(assets.embedSnippet, _serverSnippet);
    });

    test('draws 12 random bytes as a 16-character base64url id', () {
      final id = newHostFormEmbedId(Random(7));

      expect(id, matches(RegExp(r'^[A-Za-z0-9_-]{16}$')));
      expect(newHostFormEmbedId(), isNot(newHostFormEmbedId()));
    });

    test('rejects an unsafe embed id and a non-HTTPS link', () {
      expect(
        () => hostFormEmbedAssets(
          canonicalUrl: Uri.parse(_canonical),
          title: 'Form',
          embedId: 'bad id"',
        ),
        throwsArgumentError,
      );
      expect(
        () => hostFormEmbedAssets(
          canonicalUrl: Uri.parse('http://forms.example/f/x/'),
          title: 'Form',
          embedId: _embedId,
        ),
        throwsArgumentError,
      );
    });
  });

  group('HostFormsRepository.getShareAssets', () {
    late FakeFirebaseFirestore db;
    late HostFormsRepository repository;

    setUp(() {
      db = FakeFirebaseFirestore();
      repository = HostFormsRepository(
        _UnusedFunctions(),
        summaries: HostFormSummaryReads(
          ScopedReadModelReader(
            db,
            family: hostReadModels,
            actorId: () => 'host',
          ),
        ),
      );
    });

    Future<HostFormShareAssets> read() => repository.getShareAssets(
      organizerId: 'org',
      formId: 'form-1',
      embedId: _embedId,
    );

    test('builds the link on the public site from the summary row', () async {
      await db.collection('hostFormSummaries').doc('form-1').set(_summary());

      final assets = await read();
      final site = AppConfig.publicSiteUrl;

      expect(assets.canonicalUrl, '${site.origin}/f/public_form_1234567890/');
      expect(
        assets.embedUrl,
        '${site.origin}/f/public_form_1234567890/'
        '?embed=1&embedId=$_embedId',
      );
      expect(
        assets.embedSnippet,
        contains('<script src="${site.origin}/form-embed-resize.js">'),
      );
    });

    test('draws a fresh embed id on each read', () async {
      await db.collection('hostFormSummaries').doc('form-1').set(_summary());

      final first = await repository.getShareAssets(
        organizerId: 'org',
        formId: 'form-1',
      );
      final second = await repository.getShareAssets(
        organizerId: 'org',
        formId: 'form-1',
      );

      expect(first.canonicalUrl, second.canonicalUrl);
      expect(first.embedUrl, isNot(second.embedUrl));
    });

    for (final (label, summary) in [
      (
        'a draft',
        _summary(status: 'draft', activeVersionId: null, publishedVersion: 0),
      ),
      ('an archived form', _summary(status: 'archived')),
    ]) {
      test('refuses $label as the callable did', () async {
        await db.collection('hostFormSummaries').doc('form-1').set(summary);

        await expectLater(
          read(),
          throwsA(
            isA<BackendOperationException>()
                .having((e) => e.code, 'code', 'failed-precondition')
                .having(
                  (e) => e.message,
                  'message',
                  'Publish this form before sharing it.',
                ),
          ),
        );
      });
    }

    test('reads a missing or foreign form as not found', () async {
      await expectLater(read(), throwsA(isA<DocumentNotFoundException>()));

      await db
          .collection('hostFormSummaries')
          .doc('form-1')
          .set(_summary(organizerId: 'other-org'));
      await expectLater(read(), throwsA(isA<DocumentNotFoundException>()));
    });
  });
}
