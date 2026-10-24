/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node functions/scripts/generate-suvbot-worlds.mjs

import type {SuvbotWorldBundle} from "../demoWorld";

export const suvbotWorldBundle: SuvbotWorldBundle = {
  "worlds": [
    {
      "schemaVersion": 2,
      "id": "host-marketing-india",
      "label": "India Host Marketing",
      "description": "Fictional Mumbai trivia night used by the Host marketing captures. Draft capture input, never a seed world or an availability claim.",
      "uses": [
        "marketing-capture"
      ],
      "locale": "en-IN",
      "timeZone": "Asia/Kolkata",
      "currency": "INR",
      "moments": {
        "planning": "2026-10-16T12:00:00",
        "today": "2026-10-17T16:00:00",
        "live": "2026-10-17T19:00:00",
        "followUp": "2026-10-18T10:00:00"
      },
      "host": {
        "uid": "sales-demo-host",
        "personaId": "in_meher_bhatia_001",
        "displayName": "Meher Bhatia",
        "firstName": "Meher",
        "phoneNumber": "+919000000001",
        "email": "host@example.test"
      },
      "organizer": {
        "id": "club-host-marketing-india",
        "name": "Evening Club",
        "description": "Fictional Mumbai organizer for a host workflow demonstration.",
        "city": "mumbai",
        "area": "Bandra West",
        "tags": [
          "trivia",
          "hosted"
        ],
        "memberCount": 0,
        "rating": 0,
        "reviewCount": 0
      },
      "venues": [
        {
          "id": "harbour-room",
          "name": "Harbour Room",
          "area": "Bandra West",
          "lat": 19.0607,
          "lng": 72.8362,
          "directions": "Meet the host at the entrance."
        }
      ],
      "people": [
        {
          "id": "p01",
          "personaId": "in_ananya_kulkarni_002"
        },
        {
          "id": "p02",
          "personaId": "in_rohan_desai_003"
        },
        {
          "id": "p03",
          "personaId": "in_tanvi_shetty_004"
        },
        {
          "id": "p04",
          "personaId": "in_kabir_malhotra_005"
        },
        {
          "id": "p05",
          "personaId": "in_zoya_merchant_006"
        },
        {
          "id": "p06",
          "personaId": "in_nikhil_joshi_007"
        },
        {
          "id": "p07",
          "personaId": "in_ishita_rao_008"
        },
        {
          "id": "p08",
          "personaId": "in_siddharth_menon_009"
        },
        {
          "id": "p09",
          "personaId": "in_riya_fernandes_010"
        },
        {
          "id": "p10",
          "personaId": "in_aditya_bhosale_011"
        },
        {
          "id": "p11",
          "personaId": "in_sana_qureshi_012"
        },
        {
          "id": "p12",
          "personaId": "in_vikram_nair_013"
        },
        {
          "id": "p13",
          "personaId": "in_neha_gupta_014"
        },
        {
          "id": "p14",
          "personaId": "in_farhan_shaikh_015"
        },
        {
          "id": "p15",
          "personaId": "in_pooja_iyer_016"
        },
        {
          "id": "p16",
          "personaId": "in_karan_mehra_017"
        },
        {
          "id": "p17",
          "personaId": "in_aarti_patil_018"
        },
        {
          "id": "p18",
          "personaId": "in_dev_sharma_019"
        },
        {
          "id": "p19",
          "personaId": "in_leela_dsouza_020"
        },
        {
          "id": "p20",
          "personaId": "in_rahil_contractor_021"
        },
        {
          "id": "p21",
          "personaId": "in_gauri_deshpande_022"
        },
        {
          "id": "p22",
          "personaId": "in_omkar_jadhav_023"
        },
        {
          "id": "p23",
          "personaId": "in_shruti_kale_024"
        },
        {
          "id": "p24",
          "personaId": "in_yash_thakur_025"
        }
      ],
      "events": [
        {
          "id": "event-host-trivia-store-demo",
          "name": "Saturday Trivia Social",
          "description": "A fictional hosted trivia social with a welcome and a simple run of show.",
          "venueId": "harbour-room",
          "civilDate": "2026-10-17",
          "startTime": "18:30",
          "endTime": "20:30",
          "activityKind": "openActivity",
          "customActivityLabel": "Trivia social",
          "format": {
            "interactionModel": "hostLedProgram",
            "admissionPreset": "openCapacity",
            "playbookId": "host_led_social",
            "selectedModuleIds": [
              "host_script",
              "safety_controls"
            ],
            "hostGoal": "Welcome guests and explain the trivia format."
          },
          "capacity": 30,
          "priceInPaise": 0,
          "guestPerspective": {
            "viewer": "p01",
            "wingmanTarget": "p03"
          },
          "attendance": [
            {
              "personId": "p01",
              "bookedAt": "2026-10-16T12:30:00",
              "checkedInAt": "2026-10-17T18:20:00"
            },
            {
              "personId": "p02",
              "bookedAt": "2026-10-16T13:25:00",
              "checkedInAt": "2026-10-17T18:22:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-10-16T14:20:00",
              "checkedInAt": "2026-10-17T18:24:00"
            },
            {
              "personId": "p04",
              "bookedAt": "2026-10-16T15:15:00",
              "checkedInAt": "2026-10-17T18:26:00"
            },
            {
              "personId": "p05",
              "bookedAt": "2026-10-16T16:10:00",
              "checkedInAt": "2026-10-17T18:28:00"
            },
            {
              "personId": "p06",
              "bookedAt": "2026-10-16T17:05:00",
              "checkedInAt": "2026-10-17T18:30:00"
            },
            {
              "personId": "p07",
              "bookedAt": "2026-10-16T18:00:00",
              "checkedInAt": "2026-10-17T18:32:00"
            },
            {
              "personId": "p08",
              "bookedAt": "2026-10-16T18:55:00",
              "checkedInAt": "2026-10-17T18:34:00"
            },
            {
              "personId": "p09",
              "bookedAt": "2026-10-16T19:50:00",
              "checkedInAt": "2026-10-17T18:36:00"
            },
            {
              "personId": "p10",
              "bookedAt": "2026-10-16T20:45:00",
              "checkedInAt": "2026-10-17T18:38:00"
            },
            {
              "personId": "p11",
              "bookedAt": "2026-10-16T21:40:00",
              "checkedInAt": "2026-10-17T18:40:00"
            },
            {
              "personId": "p12",
              "bookedAt": "2026-10-16T22:35:00",
              "checkedInAt": "2026-10-17T18:42:00"
            },
            {
              "personId": "p13",
              "bookedAt": "2026-10-16T23:30:00",
              "checkedInAt": "2026-10-17T18:44:00"
            },
            {
              "personId": "p14",
              "bookedAt": "2026-10-17T00:25:00",
              "checkedInAt": "2026-10-17T18:46:00"
            },
            {
              "personId": "p15",
              "bookedAt": "2026-10-17T01:20:00",
              "checkedInAt": "2026-10-17T18:48:00"
            },
            {
              "personId": "p16",
              "bookedAt": "2026-10-17T02:15:00",
              "checkedInAt": "2026-10-17T18:50:00"
            },
            {
              "personId": "p17",
              "bookedAt": "2026-10-17T03:10:00",
              "checkedInAt": "2026-10-17T18:52:00"
            },
            {
              "personId": "p18",
              "bookedAt": "2026-10-17T04:05:00",
              "checkedInAt": "2026-10-17T18:54:00"
            },
            {
              "personId": "p19",
              "bookedAt": "2026-10-17T05:00:00"
            },
            {
              "personId": "p20",
              "bookedAt": "2026-10-17T05:55:00"
            },
            {
              "personId": "p21",
              "bookedAt": "2026-10-17T06:50:00"
            },
            {
              "personId": "p22",
              "bookedAt": "2026-10-17T07:45:00"
            },
            {
              "personId": "p23",
              "bookedAt": "2026-10-17T08:40:00"
            },
            {
              "personId": "p24",
              "bookedAt": "2026-10-17T09:35:00"
            }
          ]
        }
      ]
    }
  ],
  "personas": [
    {
      "id": "in_aarti_patil_018",
      "firstName": "Aarti",
      "lastName": "Patil",
      "displayName": "Aarti Patil",
      "gender": "woman",
      "dateOfBirth": "1998-08-07",
      "heightCm": 166,
      "occupation": "Journalist",
      "company": "Digital news outlet",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Strangers with stories and enough time to hear one properly."
        },
        {
          "promptId": "afterEvent",
          "answer": "Writing down the best line I heard all night."
        },
        {
          "promptId": "greenFlag",
          "answer": "You ask me something nobody has asked before."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aarti-patil/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aarti-patil/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aarti-patil/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aarti-patil/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "city_museum",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aarti-patil/02-city-museum.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aarti-patil/thumbs/02-city-museum.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aarti-patil/02-city-museum.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aarti-patil/thumbs/02-city-museum.jpg"
        },
        {
          "id": "work_cafe",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aarti-patil/03-work-cafe.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aarti-patil/thumbs/03-work-cafe.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aarti-patil/03-work-cafe.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aarti-patil/thumbs/03-work-cafe.jpg"
        },
        {
          "id": "lane_candid",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aarti-patil/04-lane-candid.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aarti-patil/thumbs/04-lane-candid.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aarti-patil/04-lane-candid.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aarti-patil/thumbs/04-lane-candid.jpg"
        }
      ]
    },
    {
      "id": "in_aditya_bhosale_011",
      "firstName": "Aditya",
      "lastName": "Bhosale",
      "displayName": "Aditya Bhosale",
      "gender": "man",
      "dateOfBirth": "1992-07-16",
      "heightCm": 176,
      "occupation": "Restaurant operations lead",
      "company": "Hospitality group",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Great food, mixed tables, and a host who knows when to step back."
        },
        {
          "promptId": "afterEvent",
          "answer": "Recommending three restaurants nobody asked about."
        },
        {
          "promptId": "greenFlag",
          "answer": "You order something you cannot pronounce just to try it."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditya-bhosale/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditya-bhosale/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aditya-bhosale/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aditya-bhosale/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "doubles_match",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditya-bhosale/02-doubles-match.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditya-bhosale/thumbs/02-doubles-match.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aditya-bhosale/02-doubles-match.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aditya-bhosale/thumbs/02-doubles-match.jpg"
        },
        {
          "id": "chef_counter",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditya-bhosale/03-chef-counter.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditya-bhosale/thumbs/03-chef-counter.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aditya-bhosale/03-chef-counter.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aditya-bhosale/thumbs/03-chef-counter.jpg"
        },
        {
          "id": "fort_steps",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditya-bhosale/04-fort-steps.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditya-bhosale/thumbs/04-fort-steps.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aditya-bhosale/04-fort-steps.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aditya-bhosale/thumbs/04-fort-steps.jpg"
        }
      ]
    },
    {
      "id": "in_ananya_kulkarni_002",
      "firstName": "Ananya",
      "lastName": "Kulkarni",
      "displayName": "Ananya Kulkarni",
      "gender": "woman",
      "dateOfBirth": "1997-06-02",
      "heightCm": 160,
      "occupation": "UX researcher",
      "company": "Fintech startup",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A quiz round where my useless facts finally matter, then a long walk to find vada pav."
        },
        {
          "promptId": "afterEvent",
          "answer": "Asking the host how they planned the night, because I cannot help myself."
        },
        {
          "promptId": "greenFlag",
          "answer": "You ask a follow-up question instead of waiting for your turn to talk."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ananya-kulkarni/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ananya-kulkarni/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ananya-kulkarni/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ananya-kulkarni/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "cafe_notes",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ananya-kulkarni/02-cafe-notes.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ananya-kulkarni/thumbs/02-cafe-notes.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ananya-kulkarni/02-cafe-notes.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ananya-kulkarni/thumbs/02-cafe-notes.jpg"
        },
        {
          "id": "seaface_run",
          "position": 2,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ananya-kulkarni/03-seaface-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ananya-kulkarni/thumbs/03-seaface-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ananya-kulkarni/03-seaface-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ananya-kulkarni/thumbs/03-seaface-run.jpg"
        },
        {
          "id": "bookshop_aisle",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ananya-kulkarni/04-bookshop-aisle.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ananya-kulkarni/thumbs/04-bookshop-aisle.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ananya-kulkarni/04-bookshop-aisle.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ananya-kulkarni/thumbs/04-bookshop-aisle.jpg"
        }
      ]
    },
    {
      "id": "in_dev_sharma_019",
      "firstName": "Dev",
      "lastName": "Sharma",
      "displayName": "Dev Sharma",
      "gender": "man",
      "dateOfBirth": "1994-10-29",
      "heightCm": 181,
      "occupation": "Product designer",
      "company": "Travel startup",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A loose plan, a good view, and the right people to share it with."
        },
        {
          "promptId": "afterEvent",
          "answer": "Sorting out who is coming on Saturday's trek."
        },
        {
          "promptId": "greenFlag",
          "answer": "You pack snacks for everyone without being asked."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/dev-sharma/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/dev-sharma/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/dev-sharma/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/dev-sharma/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "monsoon_trek",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/dev-sharma/02-monsoon-trek.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/dev-sharma/thumbs/02-monsoon-trek.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/dev-sharma/02-monsoon-trek.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/dev-sharma/thumbs/02-monsoon-trek.jpg"
        },
        {
          "id": "design_studio",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/dev-sharma/03-design-studio.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/dev-sharma/thumbs/03-design-studio.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/dev-sharma/03-design-studio.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/dev-sharma/thumbs/03-design-studio.jpg"
        },
        {
          "id": "park_afternoon",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/dev-sharma/04-park-afternoon.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/dev-sharma/thumbs/04-park-afternoon.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/dev-sharma/04-park-afternoon.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/dev-sharma/thumbs/04-park-afternoon.jpg"
        }
      ]
    },
    {
      "id": "in_farhan_shaikh_015",
      "firstName": "Farhan",
      "lastName": "Shaikh",
      "displayName": "Farhan Shaikh",
      "gender": "man",
      "dateOfBirth": "1995-06-19",
      "heightCm": 179,
      "occupation": "Video editor",
      "company": "Production house",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A short film, a long discussion, and everyone too invested in the ending."
        },
        {
          "promptId": "afterEvent",
          "answer": "Finding the best late-night chai within walking distance."
        },
        {
          "promptId": "greenFlag",
          "answer": "You will watch the credits with me."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/farhan-shaikh/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/farhan-shaikh/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/farhan-shaikh/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/farhan-shaikh/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "film_screening",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/farhan-shaikh/02-film-screening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/farhan-shaikh/thumbs/02-film-screening.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/farhan-shaikh/02-film-screening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/farhan-shaikh/thumbs/02-film-screening.jpg"
        },
        {
          "id": "late_set",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/farhan-shaikh/03-late-set.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/farhan-shaikh/thumbs/03-late-set.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/farhan-shaikh/03-late-set.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/farhan-shaikh/thumbs/03-late-set.jpg"
        },
        {
          "id": "chai_stall",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/farhan-shaikh/04-chai-stall.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/farhan-shaikh/thumbs/04-chai-stall.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/farhan-shaikh/04-chai-stall.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/farhan-shaikh/thumbs/04-chai-stall.jpg"
        }
      ]
    },
    {
      "id": "in_gauri_deshpande_022",
      "firstName": "Gauri",
      "lastName": "Deshpande",
      "displayName": "Gauri Deshpande",
      "gender": "woman",
      "dateOfBirth": "1995-07-23",
      "heightCm": 162,
      "occupation": "Biotech researcher",
      "company": "Research institute",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A friendly competition and a host who mixes the teams fairly."
        },
        {
          "promptId": "afterEvent",
          "answer": "Planning a cycling route for next Sunday."
        },
        {
          "promptId": "greenFlag",
          "answer": "You are on time, or you text before you are late."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gauri-deshpande/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gauri-deshpande/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/gauri-deshpande/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/gauri-deshpande/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "hill_ride",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gauri-deshpande/02-hill-ride.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gauri-deshpande/thumbs/02-hill-ride.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/gauri-deshpande/02-hill-ride.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/gauri-deshpande/thumbs/02-hill-ride.jpg"
        },
        {
          "id": "cafe_morning",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gauri-deshpande/03-cafe-morning.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gauri-deshpande/thumbs/03-cafe-morning.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/gauri-deshpande/03-cafe-morning.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/gauri-deshpande/thumbs/03-cafe-morning.jpg"
        },
        {
          "id": "river_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gauri-deshpande/04-river-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gauri-deshpande/thumbs/04-river-picnic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/gauri-deshpande/04-river-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/gauri-deshpande/thumbs/04-river-picnic.jpg"
        }
      ]
    },
    {
      "id": "in_ishita_rao_008",
      "firstName": "Ishita",
      "lastName": "Rao",
      "displayName": "Ishita Rao",
      "gender": "woman",
      "dateOfBirth": "1995-02-09",
      "heightCm": 167,
      "occupation": "Architect",
      "company": "Small practice",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Good light, good food, and people who actually show up."
        },
        {
          "promptId": "afterEvent",
          "answer": "Sketching the venue's ceiling because it was too good not to."
        },
        {
          "promptId": "greenFlag",
          "answer": "You notice buildings and will stop to look at one with me."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishita-rao/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishita-rao/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ishita-rao/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ishita-rao/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "model_making",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishita-rao/02-model-making.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishita-rao/thumbs/02-model-making.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ishita-rao/02-model-making.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ishita-rao/thumbs/02-model-making.jpg"
        },
        {
          "id": "rooftop_table",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishita-rao/03-rooftop-table.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishita-rao/thumbs/03-rooftop-table.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ishita-rao/03-rooftop-table.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ishita-rao/thumbs/03-rooftop-table.jpg"
        },
        {
          "id": "friends_table",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishita-rao/04-friends-table.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishita-rao/thumbs/04-friends-table.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ishita-rao/04-friends-table.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ishita-rao/thumbs/04-friends-table.jpg"
        }
      ]
    },
    {
      "id": "in_kabir_malhotra_005",
      "firstName": "Kabir",
      "lastName": "Malhotra",
      "displayName": "Kabir Malhotra",
      "gender": "man",
      "dateOfBirth": "1994-04-05",
      "heightCm": 182,
      "occupation": "Brand strategist",
      "company": "Independent agency",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A good room, a better playlist, and one conversation that runs past closing."
        },
        {
          "promptId": "afterEvent",
          "answer": "Walking to the nearest Irani café and arguing about typefaces."
        },
        {
          "promptId": "greenFlag",
          "answer": "You have one strong opinion about chai and can defend it."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kabir-malhotra/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kabir-malhotra/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kabir-malhotra/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kabir-malhotra/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "gallery_opening",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kabir-malhotra/02-gallery-opening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kabir-malhotra/thumbs/02-gallery-opening.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kabir-malhotra/02-gallery-opening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kabir-malhotra/thumbs/02-gallery-opening.jpg"
        },
        {
          "id": "irani_cafe",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kabir-malhotra/03-irani-cafe.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kabir-malhotra/thumbs/03-irani-cafe.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kabir-malhotra/03-irani-cafe.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kabir-malhotra/thumbs/03-irani-cafe.jpg"
        },
        {
          "id": "heritage_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kabir-malhotra/04-heritage-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kabir-malhotra/thumbs/04-heritage-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kabir-malhotra/04-heritage-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kabir-malhotra/thumbs/04-heritage-walk.jpg"
        }
      ]
    },
    {
      "id": "in_karan_mehra_017",
      "firstName": "Karan",
      "lastName": "Mehra",
      "displayName": "Karan Mehra",
      "gender": "man",
      "dateOfBirth": "1997-03-03",
      "heightCm": 177,
      "occupation": "Startup founder",
      "company": "Sports coaching app",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Mixed-level teams, a fair rotation, and nobody sitting out for long."
        },
        {
          "promptId": "afterEvent",
          "answer": "Asking people what would make them come back next week."
        },
        {
          "promptId": "greenFlag",
          "answer": "You try the new thing even if you are bad at it."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karan-mehra/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karan-mehra/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/karan-mehra/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/karan-mehra/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "social_round",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karan-mehra/02-social-round.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karan-mehra/thumbs/02-social-round.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/karan-mehra/02-social-round.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/karan-mehra/thumbs/02-social-round.jpg"
        },
        {
          "id": "startup_meetup",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karan-mehra/03-startup-meetup.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karan-mehra/thumbs/03-startup-meetup.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/karan-mehra/03-startup-meetup.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/karan-mehra/thumbs/03-startup-meetup.jpg"
        },
        {
          "id": "park_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karan-mehra/04-park-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karan-mehra/thumbs/04-park-picnic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/karan-mehra/04-park-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/karan-mehra/thumbs/04-park-picnic.jpg"
        }
      ]
    },
    {
      "id": "in_leela_dsouza_020",
      "firstName": "Leela",
      "lastName": "D'Souza",
      "displayName": "Leela D'Souza",
      "gender": "woman",
      "dateOfBirth": "1995-05-14",
      "heightCm": 163,
      "occupation": "Bakery owner",
      "company": "Neighbourhood bakery",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Something homemade on the table and everyone staying for one more round."
        },
        {
          "promptId": "afterEvent",
          "answer": "Handing out leftover cookies in paper bags."
        },
        {
          "promptId": "greenFlag",
          "answer": "You have a favourite bakery and will defend it."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/leela-dsouza/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/leela-dsouza/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/leela-dsouza/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/leela-dsouza/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "market_stall",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/leela-dsouza/02-market-stall.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/leela-dsouza/thumbs/02-market-stall.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/leela-dsouza/02-market-stall.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/leela-dsouza/thumbs/02-market-stall.jpg"
        },
        {
          "id": "bakery_brunch",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/leela-dsouza/03-bakery-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/leela-dsouza/thumbs/03-bakery-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/leela-dsouza/03-bakery-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/leela-dsouza/thumbs/03-bakery-brunch.jpg"
        },
        {
          "id": "rooftop_supper",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/leela-dsouza/04-rooftop-supper.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/leela-dsouza/thumbs/04-rooftop-supper.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/leela-dsouza/04-rooftop-supper.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/leela-dsouza/thumbs/04-rooftop-supper.jpg"
        }
      ]
    },
    {
      "id": "in_meher_bhatia_001",
      "firstName": "Meher",
      "lastName": "Bhatia",
      "displayName": "Meher Bhatia",
      "gender": "woman",
      "dateOfBirth": "1993-03-18",
      "heightCm": 165,
      "occupation": "Community events producer",
      "company": "Evening Club",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Name tags nobody needs by the second hour, one good question per table, and everyone swapping numbers on the way out."
        },
        {
          "promptId": "afterEvent",
          "answer": "Stacking chairs, then ordering cutting chai for whoever is still around."
        },
        {
          "promptId": "greenFlag",
          "answer": "I remember what you said you were nervous about and ask how it went."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meher-bhatia/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meher-bhatia/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/meher-bhatia/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/meher-bhatia/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "supper_club",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meher-bhatia/02-supper-club.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meher-bhatia/thumbs/02-supper-club.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/meher-bhatia/02-supper-club.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/meher-bhatia/thumbs/02-supper-club.jpg"
        },
        {
          "id": "event_briefing",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meher-bhatia/03-event-briefing.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meher-bhatia/thumbs/03-event-briefing.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/meher-bhatia/03-event-briefing.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/meher-bhatia/thumbs/03-event-briefing.jpg"
        },
        {
          "id": "beach_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meher-bhatia/04-beach-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meher-bhatia/thumbs/04-beach-picnic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/meher-bhatia/04-beach-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/meher-bhatia/thumbs/04-beach-picnic.jpg"
        }
      ]
    },
    {
      "id": "in_neha_gupta_014",
      "firstName": "Neha",
      "lastName": "Gupta",
      "displayName": "Neha Gupta",
      "gender": "woman",
      "dateOfBirth": "1996-04-25",
      "heightCm": 161,
      "occupation": "Marketing manager",
      "company": "Skincare brand",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A theme everyone half commits to and a host who hands out the first icebreaker."
        },
        {
          "promptId": "afterEvent",
          "answer": "Making a group chat with everyone at my table."
        },
        {
          "promptId": "greenFlag",
          "answer": "You send the photos the same night."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/neha-gupta/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/neha-gupta/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/neha-gupta/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/neha-gupta/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "brunch_plate",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/neha-gupta/02-brunch-plate.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/neha-gupta/thumbs/02-brunch-plate.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/neha-gupta/02-brunch-plate.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/neha-gupta/thumbs/02-brunch-plate.jpg"
        },
        {
          "id": "launch_event",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/neha-gupta/03-launch-event.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/neha-gupta/thumbs/03-launch-event.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/neha-gupta/03-launch-event.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/neha-gupta/thumbs/03-launch-event.jpg"
        },
        {
          "id": "reunion_brunch",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/neha-gupta/04-reunion-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/neha-gupta/thumbs/04-reunion-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/neha-gupta/04-reunion-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/neha-gupta/thumbs/04-reunion-brunch.jpg"
        }
      ]
    },
    {
      "id": "in_nikhil_joshi_007",
      "firstName": "Nikhil",
      "lastName": "Joshi",
      "displayName": "Nikhil Joshi",
      "gender": "man",
      "dateOfBirth": "1993-08-21",
      "heightCm": 175,
      "occupation": "Software engineer",
      "company": "Cloud infrastructure company",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A clear plan, a little chaos, and a debrief over misal afterwards."
        },
        {
          "promptId": "afterEvent",
          "answer": "Already planning the next monsoon trek in the group chat."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "A sea breeze, one long flat stretch, and a chai stall at the turnaround."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikhil-joshi/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikhil-joshi/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nikhil-joshi/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nikhil-joshi/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "morning_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikhil-joshi/02-morning-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikhil-joshi/thumbs/02-morning-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nikhil-joshi/02-morning-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nikhil-joshi/thumbs/02-morning-run.jpg"
        },
        {
          "id": "thali_dinner",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikhil-joshi/03-thali-dinner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikhil-joshi/thumbs/03-thali-dinner.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nikhil-joshi/03-thali-dinner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nikhil-joshi/thumbs/03-thali-dinner.jpg"
        },
        {
          "id": "ghat_viewpoint",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikhil-joshi/04-ghat-viewpoint.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikhil-joshi/thumbs/04-ghat-viewpoint.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nikhil-joshi/04-ghat-viewpoint.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nikhil-joshi/thumbs/04-ghat-viewpoint.jpg"
        }
      ]
    },
    {
      "id": "in_omkar_jadhav_023",
      "firstName": "Omkar",
      "lastName": "Jadhav",
      "displayName": "Omkar Jadhav",
      "gender": "man",
      "dateOfBirth": "1994-03-30",
      "heightCm": 177,
      "occupation": "Automotive engineer",
      "company": "Vehicle manufacturer",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A good start, a fair finish, and misal pav afterwards."
        },
        {
          "promptId": "afterEvent",
          "answer": "Comparing splits and pretending not to care."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "Up the hill early, before the city wakes, and back down for breakfast."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/omkar-jadhav/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/omkar-jadhav/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/omkar-jadhav/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/omkar-jadhav/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "hill_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/omkar-jadhav/02-hill-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/omkar-jadhav/thumbs/02-hill-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/omkar-jadhav/02-hill-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/omkar-jadhav/thumbs/02-hill-run.jpg"
        },
        {
          "id": "family_dinner",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/omkar-jadhav/03-family-dinner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/omkar-jadhav/thumbs/03-family-dinner.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/omkar-jadhav/03-family-dinner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/omkar-jadhav/thumbs/03-family-dinner.jpg"
        },
        {
          "id": "fort_trip",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/omkar-jadhav/04-fort-trip.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/omkar-jadhav/thumbs/04-fort-trip.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/omkar-jadhav/04-fort-trip.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/omkar-jadhav/thumbs/04-fort-trip.jpg"
        }
      ]
    },
    {
      "id": "in_pooja_iyer_016",
      "firstName": "Pooja",
      "lastName": "Iyer",
      "displayName": "Pooja Iyer",
      "gender": "woman",
      "dateOfBirth": "1993-01-12",
      "heightCm": 159,
      "occupation": "Pediatric dentist",
      "company": "Family clinic",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "An early start, a strong coffee, and people who cheer for strangers."
        },
        {
          "promptId": "afterEvent",
          "answer": "Eating idli at the nearest Udupi place with whoever is hungry."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "A long loop past the sea, a hill I complain about, and coconut water at the end."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pooja-iyer/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pooja-iyer/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pooja-iyer/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pooja-iyer/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "long_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pooja-iyer/02-long-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pooja-iyer/thumbs/02-long-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pooja-iyer/02-long-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pooja-iyer/thumbs/02-long-run.jpg"
        },
        {
          "id": "south_indian_brunch",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pooja-iyer/03-south-indian-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pooja-iyer/thumbs/03-south-indian-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pooja-iyer/03-south-indian-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pooja-iyer/thumbs/03-south-indian-brunch.jpg"
        },
        {
          "id": "sunday_cooking",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pooja-iyer/04-sunday-cooking.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pooja-iyer/thumbs/04-sunday-cooking.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pooja-iyer/04-sunday-cooking.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pooja-iyer/thumbs/04-sunday-cooking.jpg"
        }
      ]
    },
    {
      "id": "in_rahil_contractor_021",
      "firstName": "Rahil",
      "lastName": "Contractor",
      "displayName": "Rahil Contractor",
      "gender": "man",
      "dateOfBirth": "1996-02-18",
      "heightCm": 174,
      "occupation": "Sound engineer",
      "company": "Recording studio",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Good sound, a crowd that listens, and a set that runs a little long."
        },
        {
          "promptId": "afterEvent",
          "answer": "Telling the band their levels were great, because they were."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "Flat, by the sea, and quiet enough to hear the waves before the traffic."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahil-contractor/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahil-contractor/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rahil-contractor/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rahil-contractor/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "mixing_desk",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahil-contractor/02-mixing-desk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahil-contractor/thumbs/02-mixing-desk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rahil-contractor/02-mixing-desk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rahil-contractor/thumbs/02-mixing-desk.jpg"
        },
        {
          "id": "jazz_bar",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahil-contractor/03-jazz-bar.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahil-contractor/thumbs/03-jazz-bar.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rahil-contractor/03-jazz-bar.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rahil-contractor/thumbs/03-jazz-bar.jpg"
        },
        {
          "id": "seaface_dawn",
          "position": 3,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahil-contractor/04-seaface-dawn.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahil-contractor/thumbs/04-seaface-dawn.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rahil-contractor/04-seaface-dawn.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rahil-contractor/thumbs/04-seaface-dawn.jpg"
        }
      ]
    },
    {
      "id": "in_riya_fernandes_010",
      "firstName": "Riya",
      "lastName": "Fernandes",
      "displayName": "Riya Fernandes",
      "gender": "woman",
      "dateOfBirth": "1997-10-03",
      "heightCm": 162,
      "occupation": "Music teacher",
      "company": "Music school",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Live music, a dance floor that fills slowly, and nobody leaving early."
        },
        {
          "promptId": "afterEvent",
          "answer": "Humming the last song all the way to the station."
        },
        {
          "promptId": "greenFlag",
          "answer": "You will try karaoke at least once, badly and happily."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/riya-fernandes/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/riya-fernandes/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/riya-fernandes/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/riya-fernandes/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "piano_room",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/riya-fernandes/02-piano-room.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/riya-fernandes/thumbs/02-piano-room.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/riya-fernandes/02-piano-room.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/riya-fernandes/thumbs/02-piano-room.jpg"
        },
        {
          "id": "jazz_night",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/riya-fernandes/03-jazz-night.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/riya-fernandes/thumbs/03-jazz-night.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/riya-fernandes/03-jazz-night.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/riya-fernandes/thumbs/03-jazz-night.jpg"
        },
        {
          "id": "garden_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/riya-fernandes/04-garden-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/riya-fernandes/thumbs/04-garden-picnic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/riya-fernandes/04-garden-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/riya-fernandes/thumbs/04-garden-picnic.jpg"
        }
      ]
    },
    {
      "id": "in_rohan_desai_003",
      "firstName": "Rohan",
      "lastName": "Desai",
      "displayName": "Rohan Desai",
      "gender": "man",
      "dateOfBirth": "1995-01-27",
      "heightCm": 178,
      "occupation": "Product manager",
      "company": "Payments startup",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Teams that mix strangers on purpose and a host who keeps it moving."
        },
        {
          "promptId": "afterEvent",
          "answer": "Pitching a pickleball rematch to anyone who will listen."
        },
        {
          "promptId": "greenFlag",
          "answer": "I will split the bill to the rupee and still offer to drop you home."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohan-desai/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohan-desai/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rohan-desai/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rohan-desai/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "pickleball_rally",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohan-desai/02-pickleball-rally.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohan-desai/thumbs/02-pickleball-rally.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rohan-desai/02-pickleball-rally.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rohan-desai/thumbs/02-pickleball-rally.jpg"
        },
        {
          "id": "live_set",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohan-desai/03-live-set.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohan-desai/thumbs/03-live-set.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rohan-desai/03-live-set.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rohan-desai/thumbs/03-live-set.jpg"
        },
        {
          "id": "long_brunch",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohan-desai/04-long-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohan-desai/thumbs/04-long-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rohan-desai/04-long-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rohan-desai/thumbs/04-long-brunch.jpg"
        }
      ]
    },
    {
      "id": "in_sana_qureshi_012",
      "firstName": "Sana",
      "lastName": "Qureshi",
      "displayName": "Sana Qureshi",
      "gender": "woman",
      "dateOfBirth": "1994-11-22",
      "heightCm": 164,
      "occupation": "Corporate lawyer",
      "company": "Law firm",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A debate that stays friendly and a group that keeps talking after it ends."
        },
        {
          "promptId": "afterEvent",
          "answer": "Walking the promenade, settling arguments with ice cream."
        },
        {
          "promptId": "greenFlag",
          "answer": "You can admit you were wrong and still order dessert."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sana-qureshi/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sana-qureshi/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sana-qureshi/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sana-qureshi/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "coffee_catchup",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sana-qureshi/02-coffee-catchup.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sana-qureshi/thumbs/02-coffee-catchup.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sana-qureshi/02-coffee-catchup.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sana-qureshi/thumbs/02-coffee-catchup.jpg"
        },
        {
          "id": "gallery_thursday",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sana-qureshi/03-gallery-thursday.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sana-qureshi/thumbs/03-gallery-thursday.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sana-qureshi/03-gallery-thursday.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sana-qureshi/thumbs/03-gallery-thursday.jpg"
        },
        {
          "id": "promenade_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sana-qureshi/04-promenade-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sana-qureshi/thumbs/04-promenade-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sana-qureshi/04-promenade-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sana-qureshi/thumbs/04-promenade-walk.jpg"
        }
      ]
    },
    {
      "id": "in_shruti_kale_024",
      "firstName": "Shruti",
      "lastName": "Kale",
      "displayName": "Shruti Kale",
      "gender": "woman",
      "dateOfBirth": "1997-11-05",
      "heightCm": 165,
      "occupation": "Classical dancer and choreographer",
      "company": "Dance academy",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Music, movement, and people who are not afraid to look a little silly."
        },
        {
          "promptId": "afterEvent",
          "answer": "Teaching someone the one step they liked."
        },
        {
          "promptId": "greenFlag",
          "answer": "You clap for everyone, not just your friends."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/shruti-kale/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/shruti-kale/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/shruti-kale/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/shruti-kale/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "rehearsal_room",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/shruti-kale/02-rehearsal-room.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/shruti-kale/thumbs/02-rehearsal-room.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/shruti-kale/02-rehearsal-room.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/shruti-kale/thumbs/02-rehearsal-room.jpg"
        },
        {
          "id": "art_evening",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/shruti-kale/03-art-evening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/shruti-kale/thumbs/03-art-evening.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/shruti-kale/03-art-evening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/shruti-kale/thumbs/03-art-evening.jpg"
        },
        {
          "id": "old_city_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/shruti-kale/04-old-city-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/shruti-kale/thumbs/04-old-city-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/shruti-kale/04-old-city-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/shruti-kale/thumbs/04-old-city-walk.jpg"
        }
      ]
    },
    {
      "id": "in_siddharth_menon_009",
      "firstName": "Siddharth",
      "lastName": "Menon",
      "displayName": "Siddharth Menon",
      "gender": "man",
      "dateOfBirth": "1996-05-30",
      "heightCm": 180,
      "occupation": "Data scientist",
      "company": "Healthtech company",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A trivia night where the categories are weird enough to level the field."
        },
        {
          "promptId": "afterEvent",
          "answer": "Explaining the answer I got wrong, at length, to anyone patient."
        },
        {
          "promptId": "greenFlag",
          "answer": "You laugh at your own bad puns before anyone else does."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddharth-menon/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddharth-menon/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/siddharth-menon/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/siddharth-menon/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "dawn_ride",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddharth-menon/02-dawn-ride.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddharth-menon/thumbs/02-dawn-ride.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/siddharth-menon/02-dawn-ride.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/siddharth-menon/thumbs/02-dawn-ride.jpg"
        },
        {
          "id": "pour_over",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddharth-menon/03-pour-over.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddharth-menon/thumbs/03-pour-over.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/siddharth-menon/03-pour-over.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/siddharth-menon/thumbs/03-pour-over.jpg"
        },
        {
          "id": "bookshop_find",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddharth-menon/04-bookshop-find.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddharth-menon/thumbs/04-bookshop-find.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/siddharth-menon/04-bookshop-find.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/siddharth-menon/thumbs/04-bookshop-find.jpg"
        }
      ]
    },
    {
      "id": "in_tanvi_shetty_004",
      "firstName": "Tanvi",
      "lastName": "Shetty",
      "displayName": "Tanvi Shetty",
      "gender": "woman",
      "dateOfBirth": "1996-09-11",
      "heightCm": 163,
      "occupation": "Physiotherapist",
      "company": "Sports clinic",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Something active, then a long lunch where nobody checks their phone."
        },
        {
          "promptId": "afterEvent",
          "answer": "Stretching on the pavement while everyone else orders dessert."
        },
        {
          "promptId": "greenFlag",
          "answer": "You are kind to waiters and to yourself on a bad day."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tanvi-shetty/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tanvi-shetty/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tanvi-shetty/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tanvi-shetty/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "morning_yoga",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tanvi-shetty/02-morning-yoga.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tanvi-shetty/thumbs/02-morning-yoga.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tanvi-shetty/02-morning-yoga.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tanvi-shetty/thumbs/02-morning-yoga.jpg"
        },
        {
          "id": "coffee_window",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tanvi-shetty/03-coffee-window.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tanvi-shetty/thumbs/03-coffee-window.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tanvi-shetty/03-coffee-window.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tanvi-shetty/thumbs/03-coffee-window.jpg"
        },
        {
          "id": "flower_market",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tanvi-shetty/04-flower-market.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tanvi-shetty/thumbs/04-flower-market.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tanvi-shetty/04-flower-market.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tanvi-shetty/thumbs/04-flower-market.jpg"
        }
      ]
    },
    {
      "id": "in_vikram_nair_013",
      "firstName": "Vikram",
      "lastName": "Nair",
      "displayName": "Vikram Nair",
      "gender": "man",
      "dateOfBirth": "1991-12-08",
      "heightCm": 183,
      "occupation": "Investment analyst",
      "company": "Asset management firm",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A tight schedule, a relaxed host, and enough time to actually talk."
        },
        {
          "promptId": "afterEvent",
          "answer": "Rebooking the court for Saturday before I forget."
        },
        {
          "promptId": "greenFlag",
          "answer": "You keep your plans and tell me when you cannot."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vikram-nair/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vikram-nair/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/vikram-nair/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/vikram-nair/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "tennis_serve",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vikram-nair/02-tennis-serve.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vikram-nair/thumbs/02-tennis-serve.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/vikram-nair/02-tennis-serve.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/vikram-nair/thumbs/02-tennis-serve.jpg"
        },
        {
          "id": "rooftop_dinner",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vikram-nair/03-rooftop-dinner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vikram-nair/thumbs/03-rooftop-dinner.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/vikram-nair/03-rooftop-dinner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/vikram-nair/thumbs/03-rooftop-dinner.jpg"
        },
        {
          "id": "farmers_market",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vikram-nair/04-farmers-market.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vikram-nair/thumbs/04-farmers-market.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/vikram-nair/04-farmers-market.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/vikram-nair/thumbs/04-farmers-market.jpg"
        }
      ]
    },
    {
      "id": "in_yash_thakur_025",
      "firstName": "Yash",
      "lastName": "Thakur",
      "displayName": "Yash Thakur",
      "gender": "man",
      "dateOfBirth": "1993-09-17",
      "heightCm": 180,
      "occupation": "Cybersecurity consultant",
      "company": "Consulting firm",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A good game, mixed partners, and someone keeping score honestly."
        },
        {
          "promptId": "afterEvent",
          "answer": "Recommending a book that matches the conversation."
        },
        {
          "promptId": "greenFlag",
          "answer": "You are curious about how things work."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/yash-thakur/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/yash-thakur/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/yash-thakur/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/yash-thakur/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "evening_game",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/yash-thakur/02-evening-game.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/yash-thakur/thumbs/02-evening-game.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/yash-thakur/02-evening-game.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/yash-thakur/thumbs/02-evening-game.jpg"
        },
        {
          "id": "rooftop_evening",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/yash-thakur/03-rooftop-evening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/yash-thakur/thumbs/03-rooftop-evening.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/yash-thakur/03-rooftop-evening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/yash-thakur/thumbs/03-rooftop-evening.jpg"
        },
        {
          "id": "bookshop_browse",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/yash-thakur/04-bookshop-browse.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/yash-thakur/thumbs/04-bookshop-browse.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/yash-thakur/04-bookshop-browse.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/yash-thakur/thumbs/04-bookshop-browse.jpg"
        }
      ]
    },
    {
      "id": "in_zoya_merchant_006",
      "firstName": "Zoya",
      "lastName": "Merchant",
      "displayName": "Zoya Merchant",
      "gender": "woman",
      "dateOfBirth": "1998-12-14",
      "heightCm": 158,
      "occupation": "Illustrator",
      "company": "Freelance",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A small group, a creative prompt, and nobody pretending to be cool."
        },
        {
          "promptId": "afterEvent",
          "answer": "Drawing the evening from memory on the train home."
        },
        {
          "promptId": "greenFlag",
          "answer": "You still get excited about stationery shops."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/zoya-merchant/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/zoya-merchant/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/zoya-merchant/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/zoya-merchant/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "studio_desk",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/zoya-merchant/02-studio-desk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/zoya-merchant/thumbs/02-studio-desk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/zoya-merchant/02-studio-desk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/zoya-merchant/thumbs/02-studio-desk.jpg"
        },
        {
          "id": "museum_gallery",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/zoya-merchant/03-museum-gallery.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/zoya-merchant/thumbs/03-museum-gallery.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/zoya-merchant/03-museum-gallery.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/zoya-merchant/thumbs/03-museum-gallery.jpg"
        },
        {
          "id": "home_kitchen",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/zoya-merchant/04-home-kitchen.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/zoya-merchant/thumbs/04-home-kitchen.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/zoya-merchant/04-home-kitchen.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/zoya-merchant/thumbs/04-home-kitchen.jpg"
        }
      ]
    }
  ]
};
