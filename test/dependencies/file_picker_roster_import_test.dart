import 'dart:typed_data';

import 'package:catch_dating_app/contexts/audience/data/host_roster_file_service.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late FilePickerPlatform original;
  late _RosterPicker picker;
  const service = PluginHostRosterFileService();

  setUp(() {
    original = FilePickerPlatform.instance;
    picker = _RosterPicker();
    FilePickerPlatform.instance = picker;
  });

  tearDown(() => FilePickerPlatform.instance = original);

  test(
    'single roster selection reads bytes through the v12 file API',
    () async {
      final bytes = Uint8List.fromList('name\nAnanya'.codeUnits);
      picker.file = _RosterFile(bytes);

      final result = await service.pickRosterFile();

      expect(result!.name, 'customers.csv');
      expect(result.bytes, bytes);
      expect(picker.type, FileType.custom);
      expect(picker.extensions, ['csv', 'xlsx']);
    },
  );

  test('canceling a single-file picker returns no roster', () async {
    expect(await service.pickRosterFile(), isNull);
  });

  test(
    'file read failure retains its cause in a roster import error',
    () async {
      final cause = Exception('File access expired');
      picker.file = _RosterFile(Uint8List(0), failure: cause);

      await expectLater(
        service.pickRosterFile(),
        throwsA(
          isA<HostRosterImportException>()
              .having(
                (error) => error.issue,
                'issue',
                HostRosterImportIssue.unreadableXlsx,
              )
              .having((error) => error.cause, 'cause', same(cause)),
        ),
      );
    },
  );
}

class _RosterPicker extends FilePickerPlatform {
  PlatformFile? file;
  FileType? type;
  List<String>? extensions;

  @override
  Future<PlatformFile?> pickFile({
    String? dialogTitle,
    String? initialDirectory,
    FileType type = FileType.any,
    List<String>? allowedExtensions,
    void Function(FilePickerStatus)? onFileLoading,
    int compressionQuality = 0,
    AndroidOptions androidOptions = const AndroidOptions(),
    DarwinOptions darwinOptions = const DarwinOptions(),
    WindowsOptions windowsOptions = const WindowsOptions(),
    LinuxOptions linuxOptions = const LinuxOptions(),
    WebOptions webOptions = const WebOptions(),
  }) async {
    this.type = type;
    extensions = allowedExtensions;
    return file;
  }
}

final class _RosterFile extends PlatformFile {
  _RosterFile(this.bytes, {this.failure});

  final Uint8List bytes;
  final Exception? failure;

  @override
  String get name => 'customers.csv';

  @override
  Future<Uint8List> readAsBytes() async {
    if (failure case final error?) throw error;
    return bytes;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
