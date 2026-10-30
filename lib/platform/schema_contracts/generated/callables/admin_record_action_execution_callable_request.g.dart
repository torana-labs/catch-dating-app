// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_record_action_execution_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminRecordActionExecutionCallableRequest {
  const AdminRecordActionExecutionCallableRequest({
    required this.executionId,
    required this.actionId,
    required this.callable,
    required this.status,
    required this.requestHash,
    this.responseHash,
    this.target,
    this.errorCode,
    this.errorMessage,
    this.cliVersion,
  });

  final String executionId;
  final String actionId;
  final String callable;
  final String status;
  final String requestHash;
  final String? responseHash;
  final String? target;
  final String? errorCode;
  final String? errorMessage;
  final String? cliVersion;

  Map<String, Object?> toJson() => {
    'executionId': executionId,
    'actionId': actionId,
    'callable': callable,
    'status': status,
    'requestHash': requestHash,
    'responseHash': ?responseHash,
    'target': ?target,
    'errorCode': ?errorCode,
    'errorMessage': ?errorMessage,
    'cliVersion': ?cliVersion,
  };
}
