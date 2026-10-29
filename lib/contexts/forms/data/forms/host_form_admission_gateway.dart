import 'dart:convert';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/core/persistence/local_command_journal.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';

abstract interface class HostFormAdmissionGateway {
  Future<HostFormAdmissionPreview> preview(HostFormAdmissionScope scope);
  Future<HostFormAdmissionReceipt> commit(HostFormAdmissionCommand command);
}

class CallableHostFormAdmissionGateway implements HostFormAdmissionGateway {
  const CallableHostFormAdmissionGateway(this.functions);
  final FirebaseFunctions functions;

  Future<Object?> _call(String name, Map<String, Object?> payload) =>
      withBackendErrorContext(
        () async =>
            (await functions.httpsCallable(name).call<Object?>(payload)).data,
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'review form admission',
          resource: 'form_admissions',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );

  @override
  Future<HostFormAdmissionPreview> preview(
    HostFormAdmissionScope scope,
  ) async => HostFormAdmissionPreview.fromData(
    await _call('previewOrganizerFormAdmission', scope.toJson()),
    scope,
  );

  @override
  Future<HostFormAdmissionReceipt> commit(
    HostFormAdmissionCommand command,
  ) async => HostFormAdmissionReceipt.fromData(
    await _call('commitOrganizerFormAdmission', command.toJson()),
    command,
  );
}

final class PendingFormAdmission {
  const PendingFormAdmission({
    required this.command,
    required this.createdAtMillis,
    this.needsReview = false,
  });
  factory PendingFormAdmission.fromJson(Map<String, Object?> map) =>
      PendingFormAdmission(
        command: HostFormAdmissionCommand.fromJson(
          (map['command']! as Map).cast<String, Object?>(),
        ),
        createdAtMillis: map['createdAtMillis']! as int,
        needsReview: map['status'] == 'needsReview',
      );

  final HostFormAdmissionCommand command;
  final int createdAtMillis;
  final bool needsReview;
  Map<String, Object?> toJson() => {
    'clientOperationId': command.requestId,
    'createdAtMillis': createdAtMillis,
    'status': needsReview ? 'needsReview' : 'pending',
    'command': command.toJson(),
  };
}

/// Saves the exact reviewed command before I/O; ambiguous retries reuse its ID.
class JournalHostFormAdmissionOutbox {
  JournalHostFormAdmissionOutbox({
    required this.gateway,
    required Future<CommandJournalStorage> Function() storage,
    required String? Function() currentAccountId,
  }) : _journal = LocalCommandJournal<PendingFormAdmission>(
         storage: storage,
         namespace: 'host_form_admission',
         currentAccountId: currentAccountId,
         codec: LocalCommandCodec(
           encode: (entry) => entry.toJson(),
           decode: PendingFormAdmission.fromJson,
           scope: (entry) => entry.command.scope.journalScope,
           resources: (entry) => {'response:${entry.command.scope.responseId}'},
         ),
       );

  final HostFormAdmissionGateway gateway;
  final LocalCommandJournal<PendingFormAdmission> _journal;

  Future<PendingFormAdmission?> pending(
    String accountId,
    HostFormAdmissionScope scope,
  ) async {
    final entries = await _journal.load(accountId, scope: scope.journalScope);
    if (entries.length > 1) {
      throw StateError('Multiple saved admissions need review.');
    }
    return entries.singleOrNull;
  }

  Future<void> reviewAgain(
    String accountId,
    HostFormAdmissionScope scope,
  ) async {
    final saved = await pending(accountId, scope);
    if (saved?.needsReview != true) {
      throw StateError('Resolve the uncertain admission before changing it.');
    }
    await _journal.dismissReview(
      accountId,
      scope.journalScope,
      commandId: saved!.command.requestId,
    );
  }

  Future<HostFormAdmissionReceipt> submit(
    String accountId,
    HostFormAdmissionCommand command,
  ) async {
    final saved = await pending(accountId, command.scope);
    if (saved != null &&
        jsonEncode(saved.command.toJson()) != jsonEncode(command.toJson())) {
      throw StateError('Resolve the saved admission before changing it.');
    }
    if (saved == null) {
      await _journal.append(
        accountId,
        PendingFormAdmission(
          command: command,
          createdAtMillis: DateTime.now().millisecondsSinceEpoch,
        ),
      );
    }
    HostFormAdmissionReceipt? receipt;
    await _journal.flush(accountId, command.scope.journalScope, (entry) async {
      receipt = await gateway.commit(entry.command);
    });
    if (receipt == null) {
      throw StateError('Admission is unresolved. Review the saved operation.');
    }
    return receipt!;
  }
}
