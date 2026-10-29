import 'dart:typed_data';

import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus/share_plus.dart';

void main() {
  test('shareJsonFile preserves recovery bytes and file metadata', () async {
    ShareParams? params;
    final controller = ExternalShareController((value) async {
      params = value;
    });
    const raw = '{"journalRaw":"broken JSON: {"}';
    await controller.shareJsonFile(
      json: raw,
      fileName: 'recovery.json',
      subject: 'Recovery',
    );
    expect(params!.fileNameOverrides, ['recovery.json']);
    expect(params!.subject, 'Recovery');
    expect(params!.files!.single.mimeType, 'application/json');
    expect(await params!.files!.single.readAsString(), raw);
  });
  test(
    'shareText forwards text, subject, and origin to share launcher',
    () async {
      ShareParams? sharedParams;
      final controller = ExternalShareController((params) async {
        sharedParams = params;
      });

      await controller.shareText(text: 'Hello', subject: 'Subject');

      expect(sharedParams?.text, 'Hello');
      expect(sharedParams?.subject, 'Subject');
    },
  );

  test('shareCsvFile forwards a named csv file to share launcher', () async {
    ShareParams? sharedParams;
    final controller = ExternalShareController((params) async {
      sharedParams = params;
    });

    await controller.shareCsvFile(
      csv: 'name,amount\nAsha,400\n',
      fileName: 'revenue.csv',
      subject: 'Revenue',
    );

    expect(sharedParams?.subject, 'Revenue');
    expect(sharedParams?.fileNameOverrides, ['revenue.csv']);
    expect(sharedParams?.files, hasLength(1));
    expect(
      await sharedParams!.files!.single.readAsString(),
      'name,amount\nAsha,400\n',
    );
  });

  test('sharePngFile forwards a named png file to share launcher', () async {
    ShareParams? sharedParams;
    final controller = ExternalShareController((params) async {
      sharedParams = params;
    });
    final bytes = Uint8List.fromList([1, 2, 3]);

    await controller.sharePngFile(
      pngBytes: bytes,
      fileName: 'chat-card.png',
      subject: 'Chat card',
    );

    expect(sharedParams?.subject, 'Chat card');
    expect(sharedParams?.fileNameOverrides, ['chat-card.png']);
    expect(sharedParams?.files, hasLength(1));
    expect(await sharedParams!.files!.single.readAsBytes(), bytes);
  });
}
