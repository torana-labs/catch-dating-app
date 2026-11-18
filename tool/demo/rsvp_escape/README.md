# RSVP Escape local demonstration

This harness renders the production Flutter Host widgets and React public form
with eight fictional applicants. The local API runs normal organizer/form/review
handlers against `AudienceTestStore`; it never initializes Firebase Admin or
writes a live account. It does not send messages or accept payments. Fixture
identity tokens are synthetic test inputs, never production authentication.

From the repository root (with existing dependencies installed):

```sh
npm --prefix functions run build
node tool/demo/rsvp_escape/build_fixture.cjs --serve
```

In separate terminals:

```sh
flutter build web --release --target=tool/demo/rsvp_escape/main.dart --output=build/rsvp-demo-web
python3 -m http.server 8788 --bind 127.0.0.1 --directory build/rsvp-demo-web
node website/node_modules/vite/bin/vite.js --config tool/demo/rsvp_escape/vite.config.mjs
```

Host: http://127.0.0.1:8788. Public renderer:
http://127.0.0.1:5173/public.html. The local API binds only 127.0.0.1:8789,
accepts only the synthetic organizer, and permits only named demo operations.
Generated fixture JSON is ignored. Restarting the API resets all
synthetic decisions. The Host entrypoint loads the initial fixture from the local API.

The public renderer uses the actual questionnaire layout, conditional questions,
validation and review. Submission, withdrawal, Host review and conversion use
the in-memory handlers. Image upload remains a synthetic asset stub; it is not
evidence of a real storage upload.
The live, separately published Neemwood Run Club form is not served by this harness.

The definition consolidates Mumbai, Bangalore, Hyderabad, Ahmedabad and Dubai.
Only Dubai shows the Dubai residency and singles-trip questions. The data uses
example.com addresses and reserved fictional North American phone numbers.

The optional `/rehearsal` route displays a read-only snapshot from an isolated
account rehearsal, if `rehearsal_fixture.json` has been supplied locally. It does
not operate the live console. The signed-in Host app owns live controls.
