import 'dart:typed_data';

import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:file_picker/file_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_roster_file_service.g.dart';

class PickedHostRosterFile {
  const PickedHostRosterFile({required this.name, required this.bytes});

  final String name;
  final Uint8List bytes;
}

abstract interface class HostRosterFileService {
  Future<PickedHostRosterFile?> pickRosterFile();
}

class PluginHostRosterFileService implements HostRosterFileService {
  const PluginHostRosterFileService();

  @override
  Future<PickedHostRosterFile?> pickRosterFile() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: const ['csv', 'xlsx'],
    );
    if (file == null) return null;
    try {
      return PickedHostRosterFile(
        name: file.name,
        bytes: await file.readAsBytes(),
      );
    } on Exception catch (error) {
      throw HostRosterImportException(
        HostRosterImportIssue.unreadableXlsx,
        cause: error,
      );
    }
  }
}

// keepalive: Host workflows share one process-wide file-picker boundary.
@Riverpod(keepAlive: true)
HostRosterFileService hostRosterFileService(Ref ref) =>
    const PluginHostRosterFileService();
