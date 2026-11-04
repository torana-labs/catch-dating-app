import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_platform/cryptography/content_hash.dart';

/// Document ids of the live console's movement views. The server names each
/// view after the record it projects (`progressIdentity`, `checkpointIdentity`
/// in Functions): SHA-256 of the canonical JSON of the scope, keys sorted.
/// Vectors pinned on both sides keep the two derivations equal.
String groupProgressViewId(EventAssistanceGroupScope scope) =>
    'progress:${operationContentHash([scope.context, scope.groupId])}';

String checkpointViewId(EventAssistanceCheckpointScope scope) =>
    'checkpoint:${operationContentHash([scope.group.context, scope.group.groupId, scope.progressRevision, scope.checkpointId])}';
