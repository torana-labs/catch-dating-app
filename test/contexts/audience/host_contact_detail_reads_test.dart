import 'package:catch_dating_app/contexts/audience/data/read_models/host_contact_detail_reads.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../hosts/support/host_crm_response_fixtures.dart';

Map<String, Object?> _row({int revision = 4}) => {
  'contactId': 'contact-1',
  'displayName': 'Asha Iyer',
  'phoneE164': '+919800000001',
  'email': null,
  'identityState': 'verified',
  'identityConfidence': 'verified',
  'ambiguousCandidateCount': 0,
  'attendedEventCount': 2,
  'expectedEventCount': 3,
  'lastAttendedAtMillis': 1786500000000,
  'segmentIds': ['past_attendee'],
  'manualTags': [
    {'tagId': 'tag-1', 'label': 'Brings friends'},
  ],
  'whatsappStatus': 'optedIn',
  'whatsappAdminSuppressed': false,
  'smsStatus': 'unknown',
  'sourceCoverage': 'exact',
  'revision': revision,
};

Map<String, Object?> _note(String body, int millis) => {
  'organizerId': 'org-1',
  'contactId': 'contact-1',
  'authorUid': 'host-1',
  'body': body,
  'revision': 1,
  'createdAt': Timestamp.fromMillisecondsSinceEpoch(millis),
  'updatedAt': Timestamp.fromMillisecondsSinceEpoch(millis),
  'updatedByUid': 'host-1',
};

void main() {
  test('the directory row carries name, tags and revision live', () async {
    final db = FakeFirebaseFirestore();
    final ref = db
        .collection(HostContactDetailReads.summaries)
        .doc('contact-1');
    await ref.set({
      'organizerId': 'org-1',
      'contactId': 'contact-1',
      'linkedAccount': true,
      'row': _row(),
    });
    final rows = HostContactDetailReads(db).watchSummary('org-1', 'contact-1');
    final first = await rows.first;
    expect(first.contact.displayName, 'Asha Iyer');
    expect(first.contact.manualTags.single.label, 'Brings friends');
    expect(first.contact.revision, 4);
    expect(first.linkedAccount, isTrue);

    final later = rows.skip(1).first;
    await ref.update({'row': _row(revision: 5)});
    expect((await later).contact.revision, 5);
  });

  test('a row of another organizer is not this directory', () async {
    final db = FakeFirebaseFirestore();
    await db.collection(HostContactDetailReads.summaries).doc('contact-1').set({
      'organizerId': 'org-2',
      'row': _row(),
    });
    await expectLater(
      HostContactDetailReads(db).watchSummary('org-1', 'contact-1').first,
      throwsA(anything),
    );
  });

  test(
    'the detail facts parse the callable traits, revenue and rows',
    () async {
      final db = FakeFirebaseFirestore();
      final detail = crmContactDetailData();
      await db.collection(HostContactDetailReads.views).doc('contact-1').set({
        'organizerId': 'org-1',
        'contactId': 'contact-1',
        'traits': detail['traits'],
        'revenue': detail['revenue'],
        'events': detail['events'],
        'eventsTruncated': false,
        'version': 1,
      });
      final facts = await HostContactDetailReads(
        db,
      ).watchFacts('org-1', 'contact-1').first;
      expect(facts.events, isNotEmpty);
      expect(facts.eventsTruncated, isFalse);
      expect(facts.revenue.amounts, isNotEmpty);
    },
  );

  test('a detail view the server has not written yet is an error', () async {
    await expectLater(
      HostContactDetailReads(
        FakeFirebaseFirestore(),
      ).watchFacts('org-1', 'contact-1').first,
      throwsA(anything),
    );
  });

  test('the newest note is read, older ones only counted', () async {
    final db = FakeFirebaseFirestore();
    final notes = db.collection(HostContactDetailReads.notes);
    await notes.doc('note-1').set(_note('First visit', 1000));
    await notes.doc('note-2').set(_note('Brings friends', 2000));
    await notes.doc('note-other').set({
      ..._note('Not this contact', 3000),
      'contactId': 'contact-2',
    });
    final latest = await HostContactDetailReads(
      db,
    ).watchNotes('org-1', 'contact-1').first;
    expect(latest.notes.single.noteId, 'note-2');
    expect(latest.notes.single.body, 'Brings friends');
    expect(latest.notes.single.authorUid, 'host-1');
    expect(latest.truncated, isTrue);
  });
}
