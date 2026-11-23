import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_platform/cache/cache_policies.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// A form's editor and analytics from the trigger-kept views (#2306):
/// `hostFormEditorViews/{formId}` holds what `getOrganizerFormEditor`
/// returned, `hostFormAnalyticsViews/{versionId}` and
/// `hostFormSourceViews/{formId}` what `getOrganizerFormAnalytics` returned.
/// Rules admit the organizer's current managers, as the callables did.
class HostFormViewReads {
  const HostFormViewReads(this.reader);
  final ScopedReadModelReader reader;

  static const editors = 'hostFormEditorViews';
  static const analytics = 'hostFormAnalyticsViews';
  static const sources = 'hostFormSourceViews';

  /// How long an open waits for the editor view to catch up with this
  /// device's own last save before it shows the newest view it has.
  static final ownWriteWait = CachePolicies.listener.firstLoad;

  /// One form's editor, read once. With [reached], a view that does not
  /// satisfy it is followed for up to [ownWriteWait], so a form this device
  /// just created or saved opens at that revision rather than the one
  /// before the trigger caught up; it then takes the newest view it saw.
  /// Null when the form has no view. A row of another organizer fails with a
  /// [FormatException].
  Future<HostFormEditor?> editor({
    required String organizerId,
    required String formId,
    bool Function(HostFormEditor editor)? reached,
  }) async {
    final doc = await reader.document(
      collection: editors,
      scopeId: organizerId,
      id: formId,
    );
    var latest = doc == null ? null : editorFromView(doc);
    if (reached == null || (latest != null && reached(latest))) return latest;
    try {
      return await reader
          .watchDocument(collection: editors, scopeId: organizerId, id: formId)
          .map((doc) => latest = doc == null ? latest : editorFromView(doc))
          .firstWhere((editor) => editor != null && reached(editor))
          .timeout(ownWriteWait);
    } on TimeoutException {
      return latest;
    }
  }

  /// One published version's analytics, with its form's share-link funnel,
  /// while listened to. A version whose view the server has not written
  /// fails as not found, as the callable did; the listener then delivers the
  /// view once its trigger writes it.
  Stream<HostFormAnalytics> watchAnalytics({
    required String organizerId,
    required String formId,
    required String versionId,
  }) => combineLatest(
    reader.watchDocument(
      collection: analytics,
      scopeId: organizerId,
      id: versionId,
    ),
    reader.watchDocument(collection: sources, scopeId: organizerId, id: formId),
    (Map<String, dynamic>? version, Map<String, dynamic>? links) {
      if (version == null || version['formId'] != formId) {
        throw const DocumentNotFoundException(
          'form analytics',
          context: BackendErrorContext(
            service: BackendService.firestore,
            action: 'watch form analytics',
            resource: analytics,
          ),
        );
      }
      return analyticsFromViews(version, links);
    },
  );

  /// The editor a view holds, with its Firestore timestamps back in the
  /// callable's wire shape.
  static HostFormEditor editorFromView(Map<String, dynamic> view) =>
      HostFormEditor.fromCallableData(_wire(view));

  /// The analytics a version view and its form's funnel view hold, in the
  /// callable's shape: the view's `formVersion` is the callable's `version`,
  /// and a form with no funnel view has no sources.
  static HostFormAnalytics analyticsFromViews(
    Map<String, dynamic> version,
    Map<String, dynamic>? links,
  ) => HostFormAnalytics.fromCallableData({
    ...version,
    'version': version['formVersion'],
    'sources': links?['sources'] ?? const <Object?>[],
  });

  static Object? _wire(Object? value) => switch (value) {
    Timestamp() => {
      '_seconds': value.seconds,
      '_nanoseconds': value.nanoseconds,
    },
    Map() => {for (final entry in value.entries) entry.key: _wire(entry.value)},
    List() => [for (final item in value) _wire(item)],
    _ => value,
  };
}
