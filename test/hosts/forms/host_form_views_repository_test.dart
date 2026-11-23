import 'package:catch_dating_app/contexts/forms/data/host_form_template_catalog.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_view_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_async/fake_async.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

/// Answers `createOrganizerForm` with a fixed editor and fails any other
/// callable, so a test proves the reads never reach Functions.
class _Functions extends Fake implements FirebaseFunctions {
  _Functions(this.created);
  final Map<String, Object?> created;
  final calls = <String>[];

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    calls.add(name);
    if (name != 'createOrganizerForm') {
      throw StateError('The read called $name.');
    }
    return _Callable(created);
  }
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.data);
  final Map<String, Object?> data;

  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async =>
      _Result<T>(data as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}

const _definition = <String, Object?>{
  'title': 'Community intake',
  'description': null,
  'purpose': 'application',
  'identityPolicy': 'phoneVerified',
  'defaultTargetKind': 'organizer',
  'defaultTargetId': null,
  'sections': <Object?>[],
  'logicRules': <Object?>[],
  'appearance': {'preset': 'minimal'},
  'availability': <String, Object?>{
    'opensAt': null,
    'closesAt': null,
    'responseLimit': null,
    'closedMessage': null,
  },
  'consent': {
    'consentCopy': 'I consent.',
    'consentVersion': 'v1',
    'retentionCopy': 'Retained for this purpose.',
  },
  'completion': {'title': 'Thanks', 'actionKind': 'none'},
};

Map<String, Object?> _summary({
  String organizerId = 'org',
  int draftRevision = 2,
  int updatedAtMillis = 1,
}) => {
  'organizerId': organizerId,
  'formId': 'form-1',
  'title': 'Community intake',
  'description': null,
  'purpose': 'application',
  'status': 'draft',
  'templateId': 'blank',
  'publicFormId': 'public_form_1234567890',
  'defaultTargetKind': 'organizer',
  'defaultTargetId': null,
  'activeVersionId': null,
  'draftRevision': draftRevision,
  'publishedVersion': 0,
  'submittedResponseCount': 0,
  'consequences': {
    'coverage': 'exact',
    'identityPolicy': 'phoneVerified',
    'enabledAutomationActionKinds': <Object?>[],
  },
  'updatedAtMillis': updatedAtMillis,
  'publishedAtMillis': null,
  'lastResponseAtMillis': null,
};

Map<String, Object?> _editorView({
  String organizerId = 'org',
  int draftRevision = 2,
  int updatedAtMillis = 1,
  Object? closesAt,
}) => {
  'organizerId': organizerId,
  'formId': 'form-1',
  'form': _summary(
    organizerId: organizerId,
    draftRevision: draftRevision,
    updatedAtMillis: updatedAtMillis,
  ),
  'definition': {
    ..._definition,
    'availability': {
      ...(_definition['availability']! as Map<String, Object?>),
      'closesAt': closesAt,
    },
  },
  'validationIssues': [
    {
      'code': 'emptySections',
      'path': 'sections',
      'message': 'Add a question.',
      'severity': 'error',
    },
  ],
  'version': 1,
};

Map<String, Object?> _analyticsView({String formId = 'form-1'}) => {
  'organizerId': 'org',
  'formId': formId,
  'versionId': 'version-1',
  'formVersion': 3,
  'opens': 40,
  'starts': 20,
  'submissions': 10,
  'withdrawals': 1,
  'completionRate': 0.5,
  'medianCompletionMillis': 60000,
  'questions': [
    {
      'questionId': 'q1',
      'label': 'How many?',
      'kind': 'number',
      'privacyClass': 'organizerCustom',
      'responseCount': 4,
      'choiceCounts': <Object?>[],
      'numericCount': 0,
      'numericSum': 0,
      'numericMin': null,
      'numericMax': null,
    },
  ],
  'privacyThreshold': 5,
  'version': 1,
};

void main() {
  late FakeFirebaseFirestore db;
  late _Functions functions;
  late HostFormsRepository repository;

  setUp(() {
    db = FakeFirebaseFirestore();
    functions = _Functions({
      'form': _summary(draftRevision: 1, updatedAtMillis: 5),
      'definition': _definition,
      'validationIssues': <Object?>[],
    });
    repository = HostFormsRepository(
      functions,
      views: HostFormViewReads(
        ScopedReadModelReader(
          db,
          family: hostReadModels,
          actorId: () => 'host',
        ),
      ),
    );
  });

  group('getEditor', () {
    test('reads the editor view, timestamps in the wire shape', () async {
      final closesAt = Timestamp.fromMillisecondsSinceEpoch(1790000000000);
      await db
          .collection('hostFormEditorViews')
          .doc('form-1')
          .set(_editorView(closesAt: closesAt));

      final editor = await repository.getEditor(
        organizerId: 'org',
        formId: 'form-1',
      );

      expect(editor.form.draftRevision, 2);
      expect(editor.definition.title, 'Community intake');
      expect((editor.definition.toJson()['availability']! as Map)['closesAt'], {
        '_seconds': closesAt.seconds,
        '_nanoseconds': closesAt.nanoseconds,
      });
      expect(editor.validationIssues.single.code, 'emptySections');
      expect(functions.calls, isEmpty);
    });

    test('a missing view or one of another organizer is not found', () async {
      await expectLater(
        repository.getEditor(organizerId: 'org', formId: 'form-1'),
        throwsA(isA<DocumentNotFoundException>()),
      );
      await db
          .collection('hostFormEditorViews')
          .doc('form-1')
          .set(_editorView(organizerId: 'other'));
      await expectLater(
        repository.getEditor(organizerId: 'org', formId: 'form-1'),
        throwsA(isA<DocumentNotFoundException>()),
      );
    });

    test(
      'a form this device just created opens once its view is written',
      () async {
        await repository.createForm(
          organizerId: 'org',
          templateId: 'blank',
          requestId: 'r',
        );
        final opening = repository.getEditor(
          organizerId: 'org',
          formId: 'form-1',
        );
        // The trigger writes the view a moment later.
        await db
            .collection('hostFormEditorViews')
            .doc('form-1')
            .set(_editorView(draftRevision: 1, updatedAtMillis: 5));
        expect((await opening).form.draftRevision, 1);
      },
    );

    test('a stale view waits for the revision this device saved', () async {
      await db
          .collection('hostFormEditorViews')
          .doc('form-1')
          .set(_editorView(draftRevision: 0, updatedAtMillis: 1));
      await repository.createForm(
        organizerId: 'org',
        templateId: 'blank',
        requestId: 'r',
      );
      HostFormEditor? opened;
      final opening = repository
          .getEditor(organizerId: 'org', formId: 'form-1')
          .then((editor) => opened = editor);
      await pumpEventQueue();
      expect(opened, isNull, reason: 'the view is behind the create');
      await db
          .collection('hostFormEditorViews')
          .doc('form-1')
          .set(_editorView(draftRevision: 1, updatedAtMillis: 5));
      await opening;
      expect(opened?.form.draftRevision, 1);
    });

    test('a view that never catches up opens as the newest one seen', () {
      fakeAsync((async) {
        db
            .collection('hostFormEditorViews')
            .doc('form-1')
            .set(_editorView(draftRevision: 0, updatedAtMillis: 1));
        HostFormEditor? opened;
        repository
            .createForm(organizerId: 'org', templateId: 'blank', requestId: 'r')
            .then(
              (_) => repository
                  .getEditor(organizerId: 'org', formId: 'form-1')
                  .then((editor) => opened = editor),
            );
        async.elapse(
          HostFormViewReads.ownWriteWait + const Duration(seconds: 1),
        );
        expect(opened?.form.draftRevision, 0);
      });
    });
  });

  group('watchAnalytics', () {
    test('joins the version view with the form funnel view', () async {
      await db
          .collection('hostFormAnalyticsViews')
          .doc('version-1')
          .set(_analyticsView());
      await db.collection('hostFormSourceViews').doc('form-1').set({
        'organizerId': 'org',
        'formId': 'form-1',
        'sources': [
          {
            'sourceLinkId': 'link-1',
            'label': 'Poster',
            'opens': 9,
            'starts': 4,
            'submissions': 2,
          },
        ],
        'version': 1,
      });

      final analytics = await repository
          .watchAnalytics(
            organizerId: 'org',
            formId: 'form-1',
            versionId: 'version-1',
          )
          .first;

      expect(analytics.version, 3);
      expect(analytics.opens, 40);
      expect(analytics.questions.single.choiceCounts, isEmpty);
      expect(analytics.sources.single.label, 'Poster');
      expect(functions.calls, isEmpty);
    });

    test('a form with no links has no sources', () async {
      await db
          .collection('hostFormAnalyticsViews')
          .doc('version-1')
          .set(_analyticsView());

      final analytics = await repository
          .watchAnalytics(
            organizerId: 'org',
            formId: 'form-1',
            versionId: 'version-1',
          )
          .first;

      expect(analytics.sources, isEmpty);
    });

    test('a missing view or a version of another form is not found', () async {
      final watch = repository.watchAnalytics(
        organizerId: 'org',
        formId: 'form-1',
        versionId: 'version-1',
      );
      await expectLater(watch.first, throwsA(isA<DocumentNotFoundException>()));
      await db
          .collection('hostFormAnalyticsViews')
          .doc('version-1')
          .set(_analyticsView(formId: 'form-2'));
      await expectLater(
        repository
            .watchAnalytics(
              organizerId: 'org',
              formId: 'form-1',
              versionId: 'version-1',
            )
            .first,
        throwsA(isA<DocumentNotFoundException>()),
      );
    });
  });

  test('the template gallery ships every catalog template', () {
    expect(
      hostFormTemplateCatalog.map((template) => template.templateId),
      containsAll(['event-application', 'post-event-feedback', 'blank']),
    );
    final blank = hostFormTemplateCatalog.singleWhere(
      (template) => template.templateId == 'blank',
    );
    expect(blank.questionCount, 0);
  });
}
