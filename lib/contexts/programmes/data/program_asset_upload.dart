import 'dart:math' as math;

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/errors/app_error_context.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_asset_upload.g.dart';

/// What a programme file is for. Guest IDs and porter hamper photos are
/// uploaded from the web pages (P4.10); the app uploads function photos and
/// the guest page cover.
enum ProgramAssetKind { photo, cover }

/// An uploaded programme file, ready to pass to the command that uses it.
typedef ProgramUploadedAsset = ({String assetId, String storagePath});

/// Picks an image and uploads it to private programme Storage through a
/// backend-signed POST policy (`createProgramAssetUpload`). Storage rules
/// deny direct SDK access to these paths.
class ProgramAssetUploader {
  ProgramAssetUploader(
    this._functions, {
    ImagePicker? picker,
    http.Client? client,
  }) : _picker = picker ?? ImagePicker(),
       _client = client ?? http.Client();

  final FirebaseFunctions _functions;
  final ImagePicker _picker;
  final http.Client _client;

  static String _requestId() {
    final random = math.Random.secure();
    return 'asset-${DateTime.now().microsecondsSinceEpoch}-'
        '${random.nextInt(1 << 30)}';
  }

  /// Picks one image from the gallery; null when the planner cancels.
  Future<ProgramUploadedAsset?> pickAndUpload({
    required String programId,
    required ProgramAssetKind kind,
  }) async {
    final image = await withAppErrorContext(
      () => _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2000,
        maxHeight: 2000,
        imageQuality: 82,
        requestFullMetadata: false,
      ),
      context: const AppErrorContext(
        operation: AppOperation.plugin,
        action: 'pick a photo',
        resource: 'image_picker',
      ),
    );
    if (image == null) return null;
    final bytes = await image.readAsBytes();
    final name = image.name.toLowerCase();
    final contentType = name.endsWith('.png')
        ? 'image/png'
        : name.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';
    return withBackendErrorContext(
      () async {
        final result = await _functions
            .httpsCallable('createProgramAssetUpload')
            .call<Object?>(
              CreateProgramAssetUploadCallableRequest(
                programId: programId,
                kind: kind.name,
                contentType: contentType,
                sizeBytes: bytes.length,
                requestId: _requestId(),
              ).toJson(),
            );
        final intent = requiredMap(result.data, 'upload');
        final fields = requiredMap(intent['uploadFields'], 'upload fields');
        final request =
            http.MultipartRequest(
                'POST',
                Uri.parse(requiredString(intent, 'uploadUrl')),
              )
              ..fields.addAll({
                for (final entry in fields.entries)
                  '${entry.key}': '${entry.value}',
              })
              ..files.add(
                http.MultipartFile.fromBytes('file', bytes, filename: name),
              );
        final response = await _client.send(request);
        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw StateError('Upload failed (${response.statusCode}).');
        }
        return (
          assetId: requiredString(intent, 'assetId'),
          storagePath: requiredString(intent, 'storagePath'),
        );
      },
      context: const BackendErrorContext(
        service: BackendService.storage,
        action: 'upload the photo',
        resource: 'createProgramAssetUpload',
      ),
    );
  }
}

// keepalive: a stateless uploader shared by the planner photo screens.
@Riverpod(keepAlive: true)
ProgramAssetUploader programAssetUploader(Ref ref) =>
    ProgramAssetUploader(ref.watch(firebaseFunctionsProvider));
