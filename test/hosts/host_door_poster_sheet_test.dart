import 'package:catch_dating_app/hosts/presentation/widgets/host_door_poster_sheet.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus/share_plus.dart';

// Every name and link below is fictional.

final _joinLink = Uri.parse('https://catch.example/join/runtime-1');

void main() {
  testWidgets('the poster QR is the plain join link, with no venue token', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: HostDoorPoster(
            eventName: 'Sunday Sea-Face Run',
            joinLink: _joinLink,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Sunday Sea-Face Run'), findsOneWidget);
    expect(find.text('On the guest list? Get ready here'), findsOneWidget);
    expect(
      find.text('At the door, scan the host’s live code to check in.'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('host_door_poster_qr')), findsOneWidget);
    expect(
      hostDoorPosterQrData(_joinLink),
      'https://catch.example/join/runtime-1',
    );
    // A link that still carries a venue token loses it on the poster.
    expect(
      hostDoorPosterQrData(
        Uri.parse(
          'https://catch.example/join/runtime-1#eventId=e1&venueSession=t',
        ),
      ),
      'https://catch.example/join/runtime-1',
    );
  });

  testWidgets('sharing the poster exports one png with the join link', (
    tester,
  ) async {
    ShareParams? shared;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          externalShareLauncherProvider.overrideWithValue((params) async {
            shared = params;
          }),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Consumer(
            builder: (context, ref, _) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  onPressed: () => showHostDoorPoster(
                    context,
                    eventName: 'Sunday Sea-Face Run',
                    joinLink: _joinLink,
                    share: ref.read(externalShareControllerProvider),
                  ),
                  child: const Text('open'),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await pumpFeatureUi(tester);
    expect(find.byType(HostDoorPoster), findsOneWidget);

    await ensureCentered(
      tester,
      find.byKey(CatchShareCardSheet.shareButtonKey),
    );
    await tester.tap(find.byKey(CatchShareCardSheet.shareButtonKey));
    await pumpFeatureUi(tester);
    await tester.runAsync(() async {
      for (var attempt = 0; attempt < 20 && shared == null; attempt++) {
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }
    });

    expect(shared?.subject, 'Door poster');
    expect(shared?.text, 'https://catch.example/join/runtime-1');
    expect(shared?.files, hasLength(1));
  });
}
