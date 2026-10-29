import 'dart:convert';

import 'package:catch_dating_app/contexts/audience/data/host_roster_file_parser.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_import_sheet.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

void main() => runApp(
  ProviderScope(
    child: MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: const ImportDemo(),
    ),
  ),
);

class ImportDemo extends StatefulWidget {
  const ImportDemo({super.key});
  @override
  State<ImportDemo> createState() => _ImportDemoState();
}

class _ImportDemoState extends State<ImportDemo> {
  Map<String, Object?>? _result;
  HostRosterImportPlan? _plan;
  String? _error;
  bool _busy = false;
  Map<String, Object?>? _lastPayload;

  Future<Map<String, Object?>> _post(Map<String, Object?> payload) async {
    final response = await http.post(
      Uri.parse('http://127.0.0.1:8792/import'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    final parsed = jsonDecode(response.body) as Map<String, Object?>;
    if (response.statusCode != 200) throw StateError('${parsed['error']}');
    return parsed;
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final response = await http.get(
        Uri.parse('http://127.0.0.1:8792/workbook'),
      );
      if (response.statusCode != 200) throw StateError('Workbook unavailable');
      final data = jsonDecode(response.body) as Map<String, Object?>;
      final table = parseHostRosterFile(
        fileName: data['fileName']! as String,
        bytes: base64Decode(data['base64']! as String),
      );
      if (!mounted) return;
      final plan = await showHostRosterMapping(context, table);
      if (plan == null || !mounted) return;
      final payload = <String, Object?>{
        'eventId': data['eventId'],
        'fileName': plan.fileName,
        'format': plan.format.name,
        'importKey': hostRosterImportKey(format: plan.format, rows: plan.rows),
        'rows': plan.rows.map((row) => row.toJson()).toList(),
      };
      final result = await _post(payload);
      if (mounted) {
        setState(() {
          _plan = plan;
          _lastPayload = payload;
          _result = result;
        });
      }
    } on Object catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _replay() async {
    final payload = _lastPayload;
    if (payload == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await _post(payload);
      if (mounted) setState(() => _result = result);
    } on Object catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = _result;
    final receipt = result?['receipt'] as Map<String, Object?>?;
    final attendees = (result?['attendees'] as List<Object?>? ?? [])
        .cast<Map<String, Object?>>();
    return Scaffold(
      appBar: AppBar(title: const Text('RSVP Escape · spreadsheet import')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text(
            'LOCAL DEMO · Synthetic bookings · No live account writes',
          ),
          const SizedBox(height: 24),
          Text(
            'Keep checkout. Bring the guest list into Catch.',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 12),
          const Text(
            'Load a real XLSX fixture through Catch’s parser and mapping sheet. '
            'This demonstrates the generic import path; an Urbanot export still needs format review.',
          ),
          const SizedBox(height: 24),
          CatchButton(
            label: _busy ? 'Working…' : 'Load synthetic Excel file',
            onPressed: _busy ? null : _load,
          ),
          if (_error != null) ...[const SizedBox(height: 16), Text(_error!)],
          if (receipt != null) ...[
            const SizedBox(height: 32),
            Text(
              receipt['replayed'] == true
                  ? 'Import replay verified'
                  : 'Import complete',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            Text(
              '${attendees.length} roster records · ${result!['contactCount']} CRM people',
            ),
            Text(
              '${_plan!.readyCount} ready · ${_plan!.needsReviewCount} need review · ${_plan!.excludedCount} excluded before import',
            ),
            const SizedBox(height: 16),
            CatchSection.containedRows(
              children: [
                for (final row in attendees)
                  CatchField.read(
                    content: CatchPersonLayout(
                      name: row['displayName']! as String,
                      supportingText:
                          '${row['status']} · ${row['phoneE164']} · '
                          '${row['revenueAmountMinor'] == null ? 'Revenue not supplied' : '${row['revenueCurrency']} ${(row['revenueAmountMinor']! as num) / 100} imported revenue'}',
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Imported revenue is source-reported. These records do not create Catch payment transactions or messaging permission.',
            ),
            const SizedBox(height: 24),
            CatchButton(
              label: 'Repeat the same import',
              onPressed: _busy ? null : _replay,
            ),
          ],
        ],
      ),
    );
  }
}
