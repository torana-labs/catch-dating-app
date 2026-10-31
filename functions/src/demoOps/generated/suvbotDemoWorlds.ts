/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node functions/scripts/generate-suvbot-worlds.mjs

import type {SuvbotWorldBundle} from "../demoWorld";

export const suvbotWorldBundle: SuvbotWorldBundle = {
  "worlds": [
    {
      "schemaVersion": 2,
      "id": "dinner-indiranagar",
      "label": "Indiranagar Supper Club",
      "description": "Fictional Indiranagar supper club seating ten strangers at one table, each approved before booking, used by the dinner launch-format captures. Draft capture input, never a seed world or an availability claim.",
      "uses": [
        "marketing-capture"
      ],
      "locale": "en-IN",
      "timeZone": "Asia/Kolkata",
      "currency": "INR",
      "moments": {
        "planning": "2026-10-20T11:00:00",
        "today": "2026-10-24T15:00:00",
        "live": "2026-10-24T20:15:00",
        "followUp": "2026-10-25T10:00:00"
      },
      "host": {
        "uid": "dinner-indiranagar-host",
        "personaId": "in_nitin_bhat_040",
        "displayName": "Nitin Bhat",
        "firstName": "Nitin",
        "phoneNumber": "+919000000301",
        "email": "host@example.test"
      },
      "organizer": {
        "id": "club-dinner-indiranagar",
        "name": "Second Helping Supper Club",
        "description": "Fictional Indiranagar supper club where the host approves each request and seats strangers at one table.",
        "city": "bangalore",
        "area": "Indiranagar",
        "tags": [
          "dinner",
          "supper-club",
          "hosted"
        ],
        "memberCount": 0,
        "rating": 0,
        "reviewCount": 0
      },
      "venues": [
        {
          "id": "second-helping-dining-room",
          "name": "Second Helping Dining Room",
          "area": "Indiranagar",
          "lat": 12.9698,
          "lng": 77.6389,
          "directions": "Ring the bell at the blue gate. Dinner is on the first floor."
        }
      ],
      "people": [
        {
          "id": "p01",
          "personaId": "in_pallavi_gowda_039"
        },
        {
          "id": "p02",
          "personaId": "in_karthik_subramanian_038"
        },
        {
          "id": "p03",
          "personaId": "in_meghana_shenoy_037"
        },
        {
          "id": "p04",
          "personaId": "in_anirudh_iyengar_042"
        },
        {
          "id": "p05",
          "personaId": "in_divya_reddy_026"
        },
        {
          "id": "p06",
          "personaId": "in_rahul_krishnan_027"
        },
        {
          "id": "p07",
          "personaId": "in_lavanya_hegde_028"
        },
        {
          "id": "p08",
          "personaId": "in_akash_gowda_029"
        },
        {
          "id": "p09",
          "personaId": "in_fatima_siddiqui_041"
        },
        {
          "id": "p10",
          "personaId": "in_rohit_kamath_044"
        },
        {
          "id": "p11",
          "personaId": "in_tara_nambiar_043"
        }
      ],
      "events": [
        {
          "id": "event-dinner-table-for-ten",
          "name": "Table for Ten",
          "description": "A fictional Saturday supper for ten strangers who asked to join. Guests share food and seating notes when they book, change seats once between courses, and leave private feedback the next morning.",
          "venueId": "second-helping-dining-room",
          "civilDate": "2026-10-24",
          "startTime": "19:30",
          "endTime": "22:30",
          "activityKind": "dinner",
          "format": {
            "interactionModel": "seatedTable",
            "admissionPreset": "openCapacity",
            "playbookId": "dinner_table_mixer",
            "selectedModuleIds": [
              "qr_check_in",
              "host_script",
              "guided_rotations",
              "decomposed_feedback",
              "safety_controls"
            ],
            "hostGoal": "Approve a table of ten strangers, cook around every food note from booking, and move seats once between courses."
          },
          "capacity": 10,
          "priceInPaise": 250000,
          "attendance": [
            {
              "personId": "p01",
              "bookedAt": "2026-10-19T21:10:00",
              "checkedInAt": "2026-10-24T19:06:00"
            },
            {
              "personId": "p02",
              "bookedAt": "2026-10-19T21:40:00",
              "checkedInAt": "2026-10-24T19:12:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-10-20T08:45:00",
              "checkedInAt": "2026-10-24T19:09:00"
            },
            {
              "personId": "p04",
              "bookedAt": "2026-10-20T09:30:00",
              "checkedInAt": "2026-10-24T19:18:00"
            },
            {
              "personId": "p05",
              "bookedAt": "2026-10-20T19:15:00",
              "checkedInAt": "2026-10-24T19:15:00"
            },
            {
              "personId": "p06",
              "bookedAt": "2026-10-21T08:20:00",
              "checkedInAt": "2026-10-24T19:24:00"
            },
            {
              "personId": "p07",
              "bookedAt": "2026-10-21T13:05:00",
              "checkedInAt": "2026-10-24T19:21:00"
            },
            {
              "personId": "p08",
              "bookedAt": "2026-10-21T20:50:00",
              "checkedInAt": "2026-10-24T20:25:00"
            },
            {
              "personId": "p09",
              "bookedAt": "2026-10-22T09:40:00",
              "checkedInAt": "2026-10-24T19:27:00"
            },
            {
              "personId": "p10",
              "bookedAt": "2026-10-22T18:30:00",
              "cancelledAt": "2026-10-23T12:15:00"
            },
            {
              "personId": "p11",
              "bookedAt": "2026-10-23T17:45:00",
              "checkedInAt": "2026-10-24T19:33:00"
            }
          ]
        }
      ]
    },
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
    },
    {
      "schemaVersion": 2,
      "id": "mixer-pune",
      "label": "Pune Games Night Mixer",
      "description": "Fictional Baner games-night mixer where teams rotate between game tables each round, with one mission and a recap. Draft capture input, never a seed world or an availability claim.",
      "uses": [
        "marketing-capture"
      ],
      "locale": "en-IN",
      "timeZone": "Asia/Kolkata",
      "currency": "INR",
      "moments": {
        "planning": "2026-10-20T11:00:00",
        "today": "2026-10-23T16:00:00",
        "live": "2026-10-23T20:40:00",
        "followUp": "2026-10-24T10:00:00"
      },
      "host": {
        "uid": "demo-host-mixer-pune",
        "personaId": "in_saurabh_kelkar_048",
        "displayName": "Saurabh Kelkar",
        "firstName": "Saurabh",
        "phoneNumber": "+919000000401",
        "email": "host@example.test"
      },
      "organizer": {
        "id": "club-mixer-pune",
        "name": "Third Turn Games Club",
        "description": "Fictional Baner board-games café club that runs a weekly games night for people new to the city.",
        "city": "pune",
        "area": "Baner",
        "tags": [
          "games-night",
          "board-games",
          "mixer"
        ],
        "memberCount": 0,
        "rating": 0,
        "reviewCount": 0
      },
      "venues": [
        {
          "id": "third-turn-cafe",
          "name": "Third Turn Café",
          "area": "Baner",
          "lat": 18.5612,
          "lng": 73.7838,
          "directions": "First floor, above the bakery. The host is at the games shelf by the window."
        }
      ],
      "people": [
        {
          "id": "p01",
          "personaId": "in_sayali_gokhale_045"
        },
        {
          "id": "p02",
          "personaId": "in_chinmay_paranjape_052"
        },
        {
          "id": "p03",
          "personaId": "in_gauri_deshpande_022"
        },
        {
          "id": "p04",
          "personaId": "in_omkar_jadhav_023"
        },
        {
          "id": "p05",
          "personaId": "in_rutuja_bapat_047"
        },
        {
          "id": "p06",
          "personaId": "in_yash_thakur_025"
        },
        {
          "id": "p07",
          "personaId": "in_shruti_kale_024"
        },
        {
          "id": "p08",
          "personaId": "in_aniket_pawar_046"
        },
        {
          "id": "p09",
          "personaId": "in_mrunal_joshi_049"
        },
        {
          "id": "p10",
          "personaId": "in_harsh_agarwal_050"
        },
        {
          "id": "p11",
          "personaId": "in_nikita_pereira_051"
        }
      ],
      "events": [
        {
          "id": "event-mixer-pune-games-night",
          "name": "Friday Games Night Mixer",
          "description": "A fictional games night with three tables and three games. Teams of three move to a new table and new teammates each round, then everyone gets one mission before the last round.",
          "venueId": "third-turn-cafe",
          "civilDate": "2026-10-23",
          "startTime": "19:30",
          "endTime": "22:00",
          "activityKind": "openActivity",
          "customActivityLabel": "Games night",
          "format": {
            "interactionModel": "teamRotations",
            "admissionPreset": "openCapacity",
            "playbookId": "pub_quiz_team_mixer",
            "selectedModuleIds": [
              "qr_check_in",
              "host_script",
              "social_missions",
              "decomposed_feedback",
              "host_analytics",
              "safety_controls"
            ],
            "hostGoal": "Reshuffle teams every round so each guest plays with most of the room, and give everyone one mission before the last game."
          },
          "capacity": 12,
          "priceInPaise": 0,
          "guestPerspective": {
            "viewer": "p01",
            "wingmanTarget": "p02"
          },
          "attendance": [
            {
              "personId": "p01",
              "bookedAt": "2026-10-20T12:20:00",
              "checkedInAt": "2026-10-23T19:06:00"
            },
            {
              "personId": "p02",
              "bookedAt": "2026-10-20T13:05:00",
              "checkedInAt": "2026-10-23T19:12:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-10-20T18:40:00",
              "checkedInAt": "2026-10-23T19:09:00"
            },
            {
              "personId": "p04",
              "bookedAt": "2026-10-20T21:15:00",
              "checkedInAt": "2026-10-23T19:18:00"
            },
            {
              "personId": "p05",
              "bookedAt": "2026-10-21T09:30:00",
              "checkedInAt": "2026-10-23T19:15:00"
            },
            {
              "personId": "p06",
              "bookedAt": "2026-10-21T13:10:00",
              "checkedInAt": "2026-10-23T19:24:00"
            },
            {
              "personId": "p07",
              "bookedAt": "2026-10-21T19:45:00",
              "checkedInAt": "2026-10-23T19:21:00"
            },
            {
              "personId": "p08",
              "bookedAt": "2026-10-22T08:50:00",
              "checkedInAt": "2026-10-23T19:28:00"
            },
            {
              "personId": "p09",
              "bookedAt": "2026-10-22T12:35:00",
              "checkedInAt": "2026-10-23T19:33:00"
            },
            {
              "personId": "p10",
              "bookedAt": "2026-10-22T20:05:00"
            },
            {
              "personId": "p11",
              "bookedAt": "2026-10-22T22:30:00",
              "cancelledAt": "2026-10-23T13:40:00"
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": 2,
      "id": "pickleball-gurugram",
      "label": "Gurugram Pickleball Social",
      "description": "Fictional Gurugram after-work pickleball social with rotating doubles partners, used by the launch-format captures. Draft capture input, never a seed world or an availability claim.",
      "uses": [
        "marketing-capture"
      ],
      "locale": "en-IN",
      "timeZone": "Asia/Kolkata",
      "currency": "INR",
      "moments": {
        "planning": "2026-10-27T11:00:00",
        "today": "2026-10-29T15:00:00",
        "live": "2026-10-29T19:40:00",
        "followUp": "2026-10-30T10:00:00"
      },
      "host": {
        "uid": "pickleball-gurugram-host",
        "personaId": "in_aryan_mathur_056",
        "displayName": "Aryan Mathur",
        "firstName": "Aryan",
        "phoneNumber": "+919000000501",
        "email": "host@example.test"
      },
      "organizer": {
        "id": "club-kitchen-line-social",
        "name": "Kitchen Line Social",
        "description": "Fictional Gurugram pickleball club that runs a weekly after-work social doubles session off Golf Course Road.",
        "city": "delhi",
        "area": "Golf Course Road, Gurugram",
        "tags": [
          "pickleball",
          "social-doubles",
          "beginner-friendly"
        ],
        "memberCount": 0,
        "rating": 0,
        "reviewCount": 0
      },
      "venues": [
        {
          "id": "kikar-courts",
          "name": "Kikar Courts",
          "area": "Sector 54, Gurugram",
          "lat": 28.4383,
          "lng": 77.1032,
          "directions": "Enter from the Sector 54 service lane; the courts are behind the clubhouse. Check in at the paddle rack."
        }
      ],
      "people": [
        {
          "id": "p01",
          "personaId": "in_kunal_arora_054"
        },
        {
          "id": "p02",
          "personaId": "in_ishani_kapoor_053"
        },
        {
          "id": "p03",
          "personaId": "in_arnav_bose_033"
        },
        {
          "id": "p04",
          "personaId": "in_raghav_tandon_060"
        },
        {
          "id": "p05",
          "personaId": "in_gurleen_sandhu_059"
        },
        {
          "id": "p06",
          "personaId": "in_siddhant_bhalla_058"
        },
        {
          "id": "p07",
          "personaId": "in_kritika_bansal_057"
        },
        {
          "id": "p08",
          "personaId": "in_aditi_chawla_032"
        },
        {
          "id": "p09",
          "personaId": "in_varun_khanna_031"
        },
        {
          "id": "p10",
          "personaId": "in_simran_kaur_030"
        },
        {
          "id": "p11",
          "personaId": "in_noor_rizvi_055"
        }
      ],
      "events": [
        {
          "id": "event-pickleball-doubles-2026-10-29",
          "name": "Thursday Social Doubles",
          "description": "A fictional after-work pickleball social. Guests share their playing level when they book, then play timed doubles rounds with a new partner each round. Paddles and balls are at the courts.",
          "venueId": "kikar-courts",
          "civilDate": "2026-10-29",
          "startTime": "19:00",
          "endTime": "21:00",
          "activityKind": "pickleball",
          "format": {
            "interactionModel": "pairedRotations",
            "admissionPreset": "openCapacity",
            "playbookId": "pickleball_rotations",
            "selectedModuleIds": [
              "host_script",
              "guided_rotations",
              "live_reveal",
              "safety_controls"
            ],
            "hostGoal": "Rotate doubles partners every round so everyone plays with someone new at a similar level."
          },
          "capacity": 12,
          "priceInPaise": 49900,
          "guestPerspective": {
            "viewer": "p07",
            "wingmanTarget": "p01"
          },
          "attendance": [
            {
              "personId": "p01",
              "bookedAt": "2026-10-22T21:14:00",
              "checkedInAt": "2026-10-29T18:34:00"
            },
            {
              "personId": "p02",
              "bookedAt": "2026-10-22T21:36:00",
              "checkedInAt": "2026-10-29T18:37:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-10-23T13:20:00",
              "checkedInAt": "2026-10-29T18:44:00"
            },
            {
              "personId": "p04",
              "bookedAt": "2026-10-24T18:05:00",
              "checkedInAt": "2026-10-29T18:58:00"
            },
            {
              "personId": "p05",
              "bookedAt": "2026-10-25T10:40:00",
              "cancelledAt": "2026-10-29T09:10:00"
            },
            {
              "personId": "p06",
              "bookedAt": "2026-10-26T20:15:00",
              "checkedInAt": "2026-10-29T18:52:00"
            },
            {
              "personId": "p07",
              "bookedAt": "2026-10-27T12:40:00",
              "checkedInAt": "2026-10-29T18:41:00"
            },
            {
              "personId": "p08",
              "bookedAt": "2026-10-28T09:30:00",
              "checkedInAt": "2026-10-29T18:50:00"
            },
            {
              "personId": "p09",
              "bookedAt": "2026-10-28T12:50:00",
              "checkedInAt": "2026-10-29T18:47:00"
            },
            {
              "personId": "p10",
              "bookedAt": "2026-10-28T19:25:00",
              "checkedInAt": "2026-10-29T18:55:00"
            },
            {
              "personId": "p11",
              "bookedAt": "2026-10-29T08:05:00",
              "checkedInAt": "2026-10-29T19:03:00"
            }
          ]
        },
        {
          "id": "event-pickleball-doubles-2026-11-05",
          "name": "Thursday Social Doubles",
          "description": "The following week's session of the same fictional after-work doubles social, which the follow-up invites guests to book.",
          "venueId": "kikar-courts",
          "civilDate": "2026-11-05",
          "startTime": "19:00",
          "endTime": "21:00",
          "activityKind": "pickleball",
          "format": {
            "interactionModel": "pairedRotations",
            "admissionPreset": "openCapacity",
            "playbookId": "pickleball_rotations",
            "selectedModuleIds": [
              "host_script",
              "guided_rotations",
              "live_reveal",
              "safety_controls"
            ],
            "hostGoal": "Rotate doubles partners every round so everyone plays with someone new at a similar level."
          },
          "capacity": 12,
          "priceInPaise": 49900,
          "attendance": [
            {
              "personId": "p01",
              "bookedAt": "2026-10-29T21:18:00"
            },
            {
              "personId": "p07",
              "bookedAt": "2026-10-29T21:42:00"
            },
            {
              "personId": "p02",
              "bookedAt": "2026-10-30T07:55:00"
            },
            {
              "personId": "p05",
              "bookedAt": "2026-10-30T08:20:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-10-30T09:05:00"
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": 2,
      "id": "pub-crawl-hyderabad",
      "label": "Hyderabad Pub Crawl",
      "description": "Fictional Friday pub crawl in Hyderabad: small groups walk four stops from Jubilee Hills to Banjara Hills. Draft capture input, never a seed world or an availability claim.",
      "uses": [
        "marketing-capture"
      ],
      "locale": "en-IN",
      "timeZone": "Asia/Kolkata",
      "currency": "INR",
      "moments": {
        "planning": "2026-10-20T11:00:00",
        "today": "2026-10-23T16:00:00",
        "live": "2026-10-23T21:05:00",
        "followUp": "2026-10-24T10:30:00"
      },
      "host": {
        "uid": "pub-crawl-hyderabad-host",
        "personaId": "in_sameer_hussain_062",
        "displayName": "Sameer Hussain",
        "firstName": "Sameer",
        "phoneNumber": "+919000000601",
        "email": "host@example.test"
      },
      "organizer": {
        "id": "club-pub-crawl-hyderabad",
        "name": "Deccan Evening Socials",
        "description": "Fictional Hyderabad organizer that hosts small-group evenings across Jubilee Hills and Banjara Hills.",
        "city": "hyderabad",
        "area": "Jubilee Hills",
        "tags": [
          "pub-crawl",
          "hosted",
          "small-groups"
        ],
        "memberCount": 0,
        "rating": 0,
        "reviewCount": 0
      },
      "venues": [
        {
          "id": "kesar-courtyard",
          "name": "Kesar Courtyard",
          "area": "Jubilee Hills",
          "lat": 17.4318,
          "lng": 78.4074,
          "directions": "First stop. Come in through the courtyard gate; the host is at the long table with the group list."
        },
        {
          "id": "lantern-terrace",
          "name": "Lantern Terrace",
          "area": "Jubilee Hills",
          "lat": 17.429,
          "lng": 78.413,
          "directions": "Second stop, about ten minutes on foot. The terrace is up the stairs on the left."
        },
        {
          "id": "monsoon-room",
          "name": "Monsoon Room",
          "area": "Jubilee Hills",
          "lat": 17.4258,
          "lng": 78.4192,
          "directions": "Third stop, about ten minutes on foot. Groups meet again at the front door before going in."
        },
        {
          "id": "banyan-rooftop",
          "name": "Banyan Rooftop",
          "area": "Banjara Hills",
          "lat": 17.4215,
          "lng": 78.4258,
          "directions": "Last stop, about twelve minutes on foot. Take the lift to the top floor; cabs home leave from the front gate."
        }
      ],
      "people": [
        {
          "id": "p01",
          "personaId": "in_harini_kondapalli_061"
        },
        {
          "id": "p02",
          "personaId": "in_vamsi_kodali_064"
        },
        {
          "id": "p03",
          "personaId": "in_pranavi_gunda_065"
        },
        {
          "id": "p04",
          "personaId": "in_lakshmi_pothula_067"
        },
        {
          "id": "p05",
          "personaId": "in_sindhu_chowdary_034"
        },
        {
          "id": "p06",
          "personaId": "in_abhinav_varma_035"
        },
        {
          "id": "p07",
          "personaId": "in_ayesha_baig_063"
        },
        {
          "id": "p08",
          "personaId": "in_tejas_naidu_068"
        },
        {
          "id": "p09",
          "personaId": "in_rishi_malpani_066"
        }
      ],
      "events": [
        {
          "id": "event-friday-pub-crawl-hyderabad",
          "name": "Friday Pub Crawl",
          "description": "A fictional hosted pub crawl in small groups of four. Four stops, each a short walk apart: Kesar Courtyard in Jubilee Hills at 19:30 for the welcome and groups, Lantern Terrace at 20:25, Monsoon Room at 21:20, and Banyan Rooftop in Banjara Hills at 22:15 for the recap. Free to join: order what you like at each stop, and every stop has food and a full zero-proof menu. The host books cabs home at the end.",
          "venueId": "kesar-courtyard",
          "civilDate": "2026-10-23",
          "startTime": "19:30",
          "endTime": "23:00",
          "activityKind": "barCrawl",
          "customActivityLabel": "Pub crawl",
          "format": {
            "interactionModel": "freeFormMixer",
            "admissionPreset": "openCapacity",
            "playbookId": "host_led_social",
            "selectedModuleIds": [
              "host_script",
              "micro_pods",
              "social_missions"
            ],
            "hostGoal": "Keep each group together between stops, so everyone has talked with their whole group before the last stop."
          },
          "capacity": 12,
          "priceInPaise": 0,
          "guestPerspective": {
            "viewer": "p03",
            "wingmanTarget": "p08"
          },
          "attendance": [
            {
              "personId": "p01",
              "bookedAt": "2026-10-20T11:40:00",
              "checkedInAt": "2026-10-23T19:04:00"
            },
            {
              "personId": "p02",
              "bookedAt": "2026-10-20T13:05:00",
              "checkedInAt": "2026-10-23T19:09:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-10-20T18:20:00",
              "checkedInAt": "2026-10-23T19:12:00"
            },
            {
              "personId": "p04",
              "bookedAt": "2026-10-20T21:45:00",
              "checkedInAt": "2026-10-23T19:15:00"
            },
            {
              "personId": "p05",
              "bookedAt": "2026-10-21T08:15:00",
              "cancelledAt": "2026-10-22T22:10:00"
            },
            {
              "personId": "p06",
              "bookedAt": "2026-10-21T19:30:00",
              "checkedInAt": "2026-10-23T19:21:00"
            },
            {
              "personId": "p07",
              "bookedAt": "2026-10-22T12:50:00",
              "checkedInAt": "2026-10-23T19:24:00"
            },
            {
              "personId": "p08",
              "bookedAt": "2026-10-22T20:05:00",
              "checkedInAt": "2026-10-23T19:28:00"
            },
            {
              "personId": "p09",
              "bookedAt": "2026-10-23T10:25:00",
              "checkedInAt": "2026-10-23T19:36:00"
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": 2,
      "id": "run-club-bandra",
      "label": "Bandra Run Club",
      "description": "Fictional Bandra West run club's Sunday 5K: pace preference at booking, pace pods on the morning and the invite to the next run. Draft capture input, never a seed world or an availability claim.",
      "uses": [
        "marketing-capture"
      ],
      "locale": "en-IN",
      "timeZone": "Asia/Kolkata",
      "currency": "INR",
      "moments": {
        "planning": "2026-11-06T19:00:00",
        "today": "2026-11-08T05:30:00",
        "live": "2026-11-08T06:55:00",
        "followUp": "2026-11-08T11:00:00"
      },
      "host": {
        "uid": "run-club-bandra-host",
        "personaId": "in_pooja_iyer_016",
        "displayName": "Pooja Iyer",
        "firstName": "Pooja",
        "phoneNumber": "+919000000201",
        "email": "host@example.test"
      },
      "organizer": {
        "id": "club-run-club-bandra",
        "name": "Salt Air Run Club",
        "description": "Fictional Bandra West run club: an easy Sunday 5K along the sea in pace pods, then breakfast together.",
        "city": "mumbai",
        "area": "Bandra West",
        "tags": [
          "running",
          "social-run",
          "pace-pods"
        ],
        "memberCount": 0,
        "rating": 0,
        "reviewCount": 0
      },
      "venues": [
        {
          "id": "seaface-steps",
          "name": "Seaface Steps",
          "area": "Bandra West",
          "lat": 19.0668,
          "lng": 72.8231,
          "directions": "Meet by the orange club flag at the north end of the sea-facing promenade. Bag drop is with the host."
        }
      ],
      "people": [
        {
          "id": "p01",
          "personaId": "in_ananya_kulkarni_002"
        },
        {
          "id": "p02",
          "personaId": "in_nikhil_joshi_007"
        },
        {
          "id": "p03",
          "personaId": "in_tanvi_shetty_004"
        },
        {
          "id": "p04",
          "personaId": "in_rahil_contractor_021"
        },
        {
          "id": "p05",
          "personaId": "in_sana_qureshi_012"
        },
        {
          "id": "p06",
          "personaId": "in_siddharth_menon_009"
        },
        {
          "id": "p07",
          "personaId": "in_leela_dsouza_020"
        },
        {
          "id": "p08",
          "personaId": "in_karan_mehra_017"
        },
        {
          "id": "p09",
          "personaId": "in_ishita_rao_008"
        },
        {
          "id": "p10",
          "personaId": "in_vikram_nair_013"
        },
        {
          "id": "p11",
          "personaId": "in_riya_fernandes_010"
        },
        {
          "id": "p12",
          "personaId": "in_dev_sharma_019"
        }
      ],
      "events": [
        {
          "id": "event-run-club-bandra-sunday-5k",
          "name": "Sunday Seaface 5K",
          "description": "A fictional easy 5K along the Bandra West seafront, run in pace pods, with a cooldown prompt and breakfast after.",
          "venueId": "seaface-steps",
          "civilDate": "2026-11-08",
          "startTime": "06:30",
          "endTime": "07:45",
          "activityKind": "socialRun",
          "format": {
            "interactionModel": "pacePods",
            "admissionPreset": "openCapacity",
            "playbookId": "social_run_light",
            "selectedModuleIds": [
              "host_script",
              "micro_pods",
              "social_missions"
            ],
            "hostGoal": "Put every runner in a pace pod so nobody runs alone, and have each of them talking to two new people by breakfast."
          },
          "capacity": 20,
          "priceInPaise": 0,
          "attendance": [
            {
              "personId": "p01",
              "bookedAt": "2026-11-06T19:12:00",
              "checkedInAt": "2026-11-08T06:04:00"
            },
            {
              "personId": "p02",
              "bookedAt": "2026-11-06T19:26:00",
              "checkedInAt": "2026-11-08T06:06:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-11-06T20:05:00",
              "checkedInAt": "2026-11-08T06:09:00"
            },
            {
              "personId": "p04",
              "bookedAt": "2026-11-06T20:48:00",
              "checkedInAt": "2026-11-08T06:11:00"
            },
            {
              "personId": "p05",
              "bookedAt": "2026-11-06T21:30:00",
              "cancelledAt": "2026-11-07T21:15:00"
            },
            {
              "personId": "p06",
              "bookedAt": "2026-11-06T22:10:00",
              "checkedInAt": "2026-11-08T06:14:00"
            },
            {
              "personId": "p07",
              "bookedAt": "2026-11-07T07:40:00",
              "checkedInAt": "2026-11-08T06:17:00"
            },
            {
              "personId": "p08",
              "bookedAt": "2026-11-07T09:05:00",
              "checkedInAt": "2026-11-08T06:19:00"
            },
            {
              "personId": "p09",
              "bookedAt": "2026-11-07T11:20:00",
              "checkedInAt": "2026-11-08T06:22:00"
            },
            {
              "personId": "p10",
              "bookedAt": "2026-11-07T14:45:00",
              "checkedInAt": "2026-11-08T06:26:00"
            },
            {
              "personId": "p11",
              "bookedAt": "2026-11-07T18:30:00"
            },
            {
              "personId": "p12",
              "bookedAt": "2026-11-07T22:10:00"
            }
          ]
        },
        {
          "id": "event-run-club-bandra-next-5k",
          "name": "Sunday Seaface 5K",
          "description": "Next week's fictional easy 5K from the same spot; the run Sunday's runners are invited to.",
          "venueId": "seaface-steps",
          "civilDate": "2026-11-15",
          "startTime": "06:30",
          "endTime": "07:45",
          "activityKind": "socialRun",
          "format": {
            "interactionModel": "pacePods",
            "admissionPreset": "openCapacity",
            "playbookId": "social_run_light",
            "selectedModuleIds": [
              "host_script",
              "micro_pods",
              "social_missions"
            ],
            "hostGoal": "Put every runner in a pace pod so nobody runs alone, and have each of them talking to two new people by breakfast."
          },
          "capacity": 20,
          "priceInPaise": 0,
          "attendance": [
            {
              "personId": "p02",
              "bookedAt": "2026-11-08T08:20:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-11-08T09:05:00"
            },
            {
              "personId": "p08",
              "bookedAt": "2026-11-08T10:15:00"
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": 2,
      "id": "us-nyc-host-demo",
      "label": "New York Host Demo",
      "description": "Fictional Sunday Table Club in New York, the host sales demo. Host app captures, the website's demo organiser listing and seeded demo environments read it. Never an availability claim.",
      "uses": [
        "marketing-capture",
        "web-story",
        "demo-seed"
      ],
      "locale": "en-US",
      "timeZone": "America/New_York",
      "currency": "INR",
      "moments": {
        "live": "2026-05-31T05:00:00"
      },
      "host": {
        "uid": "sales-demo-host",
        "personaId": "nyc_victor_alvarez_024",
        "displayName": "Victor Alvarez",
        "firstName": "Victor",
        "phoneNumber": "+12125550101",
        "email": "victor.host@example.test"
      },
      "organizer": {
        "id": "club-sales-sunday-table",
        "name": "Sunday Table Club",
        "description": "Small hosted dinners and mixers with prompts that keep the room moving.",
        "city": "new-york",
        "area": "West Village",
        "tags": [
          "dinner",
          "singles mixer",
          "hosted"
        ],
        "memberCount": 76,
        "rating": 4.8,
        "reviewCount": 29
      },
      "venues": [
        {
          "id": "cervos-private-table",
          "name": "Cervo's private table",
          "area": "Lower East Side",
          "lat": 40.7143,
          "lng": -73.9912,
          "directions": "Ask for the Catch table near the back banquette."
        }
      ],
      "people": [
        {
          "id": "p01",
          "personaId": "nyc_maya_shah_001"
        },
        {
          "id": "p02",
          "personaId": "nyc_jordan_ellis_002"
        },
        {
          "id": "p03",
          "personaId": "nyc_sofia_martinez_003"
        },
        {
          "id": "p04",
          "personaId": "nyc_ethan_brooks_004"
        },
        {
          "id": "p05",
          "personaId": "nyc_aisha_williams_005"
        },
        {
          "id": "p06",
          "personaId": "nyc_daniel_kim_006"
        },
        {
          "id": "p07",
          "personaId": "nyc_priya_desai_007"
        },
        {
          "id": "p08",
          "personaId": "nyc_marcus_chen_008"
        },
        {
          "id": "p09",
          "personaId": "nyc_chloe_bennett_009"
        },
        {
          "id": "p10",
          "personaId": "nyc_noah_patel_010"
        },
        {
          "id": "p11",
          "personaId": "nyc_olivia_nguyen_011"
        },
        {
          "id": "p12",
          "personaId": "nyc_caleb_johnson_012"
        },
        {
          "id": "p13",
          "personaId": "nyc_emma_rodriguez_013"
        },
        {
          "id": "p14",
          "personaId": "nyc_liam_oconnor_014"
        },
        {
          "id": "p15",
          "personaId": "nyc_nia_okafor_015"
        },
        {
          "id": "p16",
          "personaId": "nyc_arjun_mehta_016"
        },
        {
          "id": "p17",
          "personaId": "nyc_grace_liu_017"
        },
        {
          "id": "p18",
          "personaId": "nyc_miles_anderson_018"
        },
        {
          "id": "p19",
          "personaId": "nyc_hannah_cohen_019"
        },
        {
          "id": "p20",
          "personaId": "nyc_andre_baptiste_020"
        },
        {
          "id": "p21",
          "personaId": "nyc_isabella_romano_021"
        },
        {
          "id": "p22",
          "personaId": "nyc_samir_khan_022"
        },
        {
          "id": "p23",
          "personaId": "nyc_taylor_reed_023"
        }
      ],
      "events": [
        {
          "id": "event-host-setup-sales-demo",
          "name": "Hosted long-table dinner",
          "description": "A hosted long-table dinner with arrivals, prompts, and a warm close.",
          "venueId": "cervos-private-table",
          "civilDate": "2026-06-07",
          "startTime": "16:00",
          "endTime": "18:00",
          "activityKind": "dinner",
          "format": {
            "interactionModel": "seatedTable",
            "admissionPreset": "balancedSingles",
            "playbookId": "dinner_table_mixer",
            "selectedModuleIds": [
              "host_script",
              "social_missions"
            ],
            "hostGoal": "Help attendees meet at least two new people."
          },
          "capacity": 20,
          "priceInPaise": 120000,
          "attendance": []
        },
        {
          "id": "event-host-live-console",
          "name": "Hosted singles mixer",
          "description": "A hosted mixer with live rotations, compatibility questions, and host-facing reveal controls.",
          "venueId": "cervos-private-table",
          "civilDate": "2026-05-31",
          "startTime": "04:30",
          "endTime": "06:30",
          "activityKind": "singlesMixer",
          "format": {
            "interactionModel": "freeFormMixer",
            "admissionPreset": "balancedSingles",
            "playbookId": "algorithmic_mixer_reveal",
            "selectedModuleIds": [
              "compatibility_questionnaire",
              "guided_rotations",
              "host_script",
              "live_reveal",
              "social_missions"
            ],
            "hostGoal": "Help attendees meet at least two new people."
          },
          "capacity": 20,
          "priceInPaise": 120000,
          "guestPerspective": {
            "viewer": "p01",
            "wingmanTarget": "p03"
          },
          "attendance": [
            {
              "personId": "p01",
              "bookedAt": "2026-05-28T10:00:00",
              "checkedInAt": "2026-05-31T04:20:00"
            },
            {
              "personId": "p02",
              "bookedAt": "2026-05-28T10:07:00",
              "checkedInAt": "2026-05-31T04:25:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-05-28T10:14:00",
              "checkedInAt": "2026-05-31T04:30:00"
            },
            {
              "personId": "p04",
              "bookedAt": "2026-05-28T10:21:00",
              "checkedInAt": "2026-05-31T04:35:00"
            },
            {
              "personId": "p05",
              "bookedAt": "2026-05-28T10:28:00",
              "checkedInAt": "2026-05-31T04:40:00"
            },
            {
              "personId": "p06",
              "bookedAt": "2026-05-28T10:35:00",
              "checkedInAt": "2026-05-31T04:45:00"
            },
            {
              "personId": "p07",
              "bookedAt": "2026-05-28T10:42:00",
              "checkedInAt": "2026-05-31T04:50:00"
            },
            {
              "personId": "p08",
              "bookedAt": "2026-05-28T10:49:00",
              "checkedInAt": "2026-05-31T05:05:00"
            },
            {
              "personId": "p09",
              "bookedAt": "2026-05-28T10:56:00",
              "checkedInAt": "2026-05-31T05:09:00"
            },
            {
              "personId": "p10",
              "bookedAt": "2026-05-28T11:03:00",
              "checkedInAt": "2026-05-31T05:13:00"
            },
            {
              "personId": "p11",
              "bookedAt": "2026-05-28T11:10:00",
              "checkedInAt": "2026-05-31T05:17:00"
            },
            {
              "personId": "p12",
              "bookedAt": "2026-05-28T11:17:00",
              "checkedInAt": "2026-05-31T05:21:00"
            },
            {
              "personId": "p13",
              "bookedAt": "2026-05-28T11:24:00",
              "checkedInAt": "2026-05-31T05:25:00"
            },
            {
              "personId": "p14",
              "bookedAt": "2026-05-28T11:31:00",
              "checkedInAt": "2026-05-31T05:29:00"
            },
            {
              "personId": "p15",
              "bookedAt": "2026-05-28T11:38:00",
              "checkedInAt": "2026-05-31T05:33:00"
            },
            {
              "personId": "p16",
              "bookedAt": "2026-05-28T11:45:00",
              "checkedInAt": "2026-05-31T05:37:00"
            },
            {
              "personId": "p17",
              "bookedAt": "2026-05-28T11:52:00",
              "checkedInAt": "2026-05-31T05:41:00"
            }
          ],
          "waitlist": [
            {
              "personId": "p18",
              "joinedAt": "2026-05-28T11:59:00"
            },
            {
              "personId": "p19",
              "joinedAt": "2026-05-28T12:06:00"
            },
            {
              "personId": "p20",
              "joinedAt": "2026-05-28T12:13:00"
            }
          ]
        },
        {
          "id": "event-host-post-report",
          "name": "Hosted singles mixer",
          "description": "A completed hosted mixer with enough feedback and matches for the sales report.",
          "venueId": "cervos-private-table",
          "civilDate": "2026-05-30",
          "startTime": "16:00",
          "endTime": "18:00",
          "activityKind": "singlesMixer",
          "format": {
            "interactionModel": "freeFormMixer",
            "admissionPreset": "balancedSingles",
            "playbookId": "algorithmic_mixer_reveal",
            "selectedModuleIds": [
              "compatibility_questionnaire",
              "guided_rotations",
              "host_script",
              "live_reveal",
              "social_missions"
            ],
            "hostGoal": "Help attendees meet at least two new people."
          },
          "capacity": 20,
          "priceInPaise": 120000,
          "attendance": [
            {
              "personId": "p01",
              "bookedAt": "2026-05-26T09:00:00",
              "checkedInAt": "2026-05-30T15:40:00"
            },
            {
              "personId": "p02",
              "bookedAt": "2026-05-26T09:23:00",
              "checkedInAt": "2026-05-30T15:43:00"
            },
            {
              "personId": "p03",
              "bookedAt": "2026-05-26T09:46:00",
              "checkedInAt": "2026-05-30T15:46:00"
            },
            {
              "personId": "p04",
              "bookedAt": "2026-05-26T10:09:00",
              "checkedInAt": "2026-05-30T15:49:00"
            },
            {
              "personId": "p05",
              "bookedAt": "2026-05-26T10:32:00",
              "checkedInAt": "2026-05-30T15:52:00"
            },
            {
              "personId": "p06",
              "bookedAt": "2026-05-26T10:55:00",
              "checkedInAt": "2026-05-30T15:55:00"
            },
            {
              "personId": "p07",
              "bookedAt": "2026-05-26T11:18:00",
              "checkedInAt": "2026-05-30T15:58:00"
            },
            {
              "personId": "p08",
              "bookedAt": "2026-05-26T11:41:00",
              "checkedInAt": "2026-05-30T16:01:00"
            },
            {
              "personId": "p09",
              "bookedAt": "2026-05-26T12:04:00",
              "checkedInAt": "2026-05-30T16:04:00"
            },
            {
              "personId": "p10",
              "bookedAt": "2026-05-26T12:27:00",
              "checkedInAt": "2026-05-30T16:07:00"
            },
            {
              "personId": "p11",
              "bookedAt": "2026-05-26T12:50:00",
              "checkedInAt": "2026-05-30T16:10:00"
            },
            {
              "personId": "p12",
              "bookedAt": "2026-05-26T13:13:00",
              "checkedInAt": "2026-05-30T16:13:00"
            },
            {
              "personId": "p13",
              "bookedAt": "2026-05-26T13:36:00",
              "checkedInAt": "2026-05-30T16:16:00"
            },
            {
              "personId": "p20",
              "bookedAt": "2026-05-26T13:59:00"
            },
            {
              "personId": "p21",
              "bookedAt": "2026-05-26T14:22:00"
            },
            {
              "personId": "p22",
              "bookedAt": "2026-05-26T14:45:00"
            },
            {
              "personId": "p23",
              "bookedAt": "2026-05-26T15:08:00"
            }
          ],
          "waitlist": [
            {
              "personId": "p18",
              "joinedAt": "2026-05-28T14:00:00"
            },
            {
              "personId": "p19",
              "joinedAt": "2026-05-28T14:11:00"
            }
          ],
          "catches": [
            {
              "personId": "p01",
              "targetId": "p02",
              "sentAt": "2026-05-30T18:05:00"
            },
            {
              "personId": "p02",
              "targetId": "p01",
              "sentAt": "2026-05-30T18:07:00"
            },
            {
              "personId": "p01",
              "targetId": "p04",
              "sentAt": "2026-05-30T18:12:00"
            },
            {
              "personId": "p04",
              "targetId": "p01",
              "sentAt": "2026-05-30T18:14:00"
            },
            {
              "personId": "p01",
              "targetId": "p06",
              "sentAt": "2026-05-30T18:19:00"
            },
            {
              "personId": "p06",
              "targetId": "p01",
              "sentAt": "2026-05-30T18:21:00"
            },
            {
              "personId": "p01",
              "targetId": "p10",
              "sentAt": "2026-05-30T18:26:00"
            },
            {
              "personId": "p10",
              "targetId": "p01",
              "sentAt": "2026-05-30T18:28:00"
            },
            {
              "personId": "p01",
              "targetId": "p12",
              "sentAt": "2026-05-30T18:33:00"
            },
            {
              "personId": "p12",
              "targetId": "p01",
              "sentAt": "2026-05-30T18:35:00"
            },
            {
              "personId": "p03",
              "targetId": "p04",
              "sentAt": "2026-05-30T18:40:00"
            },
            {
              "personId": "p04",
              "targetId": "p03",
              "sentAt": "2026-05-30T18:42:00"
            },
            {
              "personId": "p03",
              "targetId": "p06",
              "sentAt": "2026-05-30T18:47:00"
            },
            {
              "personId": "p06",
              "targetId": "p03",
              "sentAt": "2026-05-30T18:49:00"
            },
            {
              "personId": "p03",
              "targetId": "p08",
              "sentAt": "2026-05-30T18:54:00"
            },
            {
              "personId": "p08",
              "targetId": "p03",
              "sentAt": "2026-05-30T18:56:00"
            },
            {
              "personId": "p03",
              "targetId": "p12",
              "sentAt": "2026-05-30T19:01:00"
            },
            {
              "personId": "p12",
              "targetId": "p03",
              "sentAt": "2026-05-30T19:03:00"
            },
            {
              "personId": "p05",
              "targetId": "p02",
              "sentAt": "2026-05-30T19:08:00"
            },
            {
              "personId": "p02",
              "targetId": "p05",
              "sentAt": "2026-05-30T19:10:00"
            },
            {
              "personId": "p05",
              "targetId": "p06",
              "sentAt": "2026-05-30T19:15:00"
            },
            {
              "personId": "p06",
              "targetId": "p05",
              "sentAt": "2026-05-30T19:17:00"
            },
            {
              "personId": "p05",
              "targetId": "p08",
              "sentAt": "2026-05-30T19:22:00"
            },
            {
              "personId": "p08",
              "targetId": "p05",
              "sentAt": "2026-05-30T19:24:00"
            },
            {
              "personId": "p05",
              "targetId": "p10",
              "sentAt": "2026-05-30T19:29:00"
            },
            {
              "personId": "p10",
              "targetId": "p05",
              "sentAt": "2026-05-30T19:31:00"
            },
            {
              "personId": "p07",
              "targetId": "p02",
              "sentAt": "2026-05-30T19:36:00"
            },
            {
              "personId": "p02",
              "targetId": "p07",
              "sentAt": "2026-05-30T19:38:00"
            },
            {
              "personId": "p07",
              "targetId": "p04",
              "sentAt": "2026-05-30T19:43:00"
            },
            {
              "personId": "p04",
              "targetId": "p07",
              "sentAt": "2026-05-30T19:45:00"
            },
            {
              "personId": "p07",
              "targetId": "p08",
              "sentAt": "2026-05-30T19:50:00"
            },
            {
              "personId": "p08",
              "targetId": "p07",
              "sentAt": "2026-05-30T19:52:00"
            },
            {
              "personId": "p07",
              "targetId": "p10",
              "sentAt": "2026-05-30T19:57:00"
            },
            {
              "personId": "p10",
              "targetId": "p07",
              "sentAt": "2026-05-30T19:59:00"
            },
            {
              "personId": "p07",
              "targetId": "p12",
              "sentAt": "2026-05-30T20:04:00"
            },
            {
              "personId": "p12",
              "targetId": "p07",
              "sentAt": "2026-05-30T20:06:00"
            },
            {
              "personId": "p08",
              "targetId": "p01",
              "sentAt": "2026-05-30T20:11:00"
            },
            {
              "personId": "p02",
              "targetId": "p03",
              "sentAt": "2026-05-30T20:17:00"
            },
            {
              "personId": "p10",
              "targetId": "p03",
              "sentAt": "2026-05-30T20:23:00"
            },
            {
              "personId": "p04",
              "targetId": "p05",
              "sentAt": "2026-05-30T20:29:00"
            },
            {
              "personId": "p12",
              "targetId": "p05",
              "sentAt": "2026-05-30T20:35:00"
            }
          ],
          "chats": [
            {
              "personIds": [
                "p01",
                "p02"
              ],
              "startedAt": "2026-05-30T21:00:00"
            },
            {
              "personIds": [
                "p01",
                "p04"
              ],
              "startedAt": "2026-05-30T21:09:00"
            },
            {
              "personIds": [
                "p01",
                "p06"
              ],
              "startedAt": "2026-05-30T21:18:00"
            },
            {
              "personIds": [
                "p01",
                "p10"
              ],
              "startedAt": "2026-05-30T21:27:00"
            },
            {
              "personIds": [
                "p01",
                "p12"
              ],
              "startedAt": "2026-05-30T21:36:00"
            },
            {
              "personIds": [
                "p03",
                "p04"
              ],
              "startedAt": "2026-05-30T21:45:00"
            },
            {
              "personIds": [
                "p03",
                "p06"
              ],
              "startedAt": "2026-05-30T21:54:00"
            },
            {
              "personIds": [
                "p03",
                "p08"
              ],
              "startedAt": "2026-05-30T22:03:00"
            },
            {
              "personIds": [
                "p03",
                "p12"
              ],
              "startedAt": "2026-05-30T22:12:00"
            },
            {
              "personIds": [
                "p05",
                "p02"
              ],
              "startedAt": "2026-05-30T22:21:00"
            },
            {
              "personIds": [
                "p05",
                "p06"
              ],
              "startedAt": "2026-05-30T22:30:00"
            },
            {
              "personIds": [
                "p05",
                "p08"
              ],
              "startedAt": "2026-05-30T22:39:00"
            }
          ],
          "reviews": [
            {
              "personId": "p01",
              "rating": 5,
              "comment": "The host kept the night moving without making it feel forced. Easy arrivals, good prompts, and useful follow-up after.",
              "createdAt": "2026-05-30T22:30:00",
              "anonymous": false
            },
            {
              "personId": "p06",
              "rating": 5,
              "comment": "The rotations made it simple to meet more people than I would have on my own, and the post-event catch window felt private.",
              "createdAt": "2026-05-30T20:45:00",
              "anonymous": false
            },
            {
              "personId": "p09",
              "rating": 4,
              "comment": "Good crowd and clear structure. I liked that the host could adjust the live flow when the group changed.",
              "createdAt": "2026-05-30T19:10:00",
              "anonymous": true
            }
          ]
        }
      ],
      "seedWorld": {
        "description": "Sales-grade NYC host world with one canonical club, 24 synthetic personas, Event Success setup/live/report states, payments, reviews, and Suvbot access for anchors.",
        "cities": [
          "new-york"
        ],
        "usersPerCity": 24,
        "organizersPerCity": 1,
        "eventsPerOrganizer": 5,
        "anchorsPerRun": 4,
        "preferPaidEvents": true,
        "eventPatterns": [
          {
            "kind": "upcomingFree",
            "offsetHours": 30,
            "price": 0,
            "capacity": 24,
            "durationMinutes": 90,
            "activityKind": "singlesMixer",
            "meetingPointKey": "west_village_table"
          },
          {
            "kind": "upcomingPaid",
            "offsetHours": 84,
            "price": 120000,
            "capacity": 20,
            "durationMinutes": 120,
            "activityKind": "dinner",
            "meetingPointKey": "west_village_table"
          },
          {
            "kind": "upcomingFull",
            "offsetHours": 168,
            "price": 60000,
            "capacity": 18,
            "durationMinutes": 75,
            "activityKind": "pickleball",
            "meetingPointKey": "williamsburg_court_2"
          },
          {
            "kind": "upcomingWaitlist",
            "offsetHours": 336,
            "price": 0,
            "capacity": 20,
            "durationMinutes": 70,
            "activityKind": "socialRun",
            "meetingPointKey": "hudson_river_pier_57"
          },
          {
            "kind": "pastOpen",
            "offsetHours": -8,
            "price": 120000,
            "capacity": 24,
            "durationMinutes": 120,
            "activityKind": "singlesMixer",
            "meetingPointKey": "west_village_table"
          }
        ],
        "recommendedCommands": [
          "seed-world --scenario us-nyc-host-demo --anchor-phones <host-phone>",
          "demo-checklist --phone <host-phone>",
          "suvbot-enable --phones <host-phone>"
        ]
      }
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
      "id": "in_abhinav_varma_035",
      "firstName": "Abhinav",
      "lastName": "Varma",
      "displayName": "Abhinav Varma",
      "gender": "man",
      "dateOfBirth": "1994-07-07",
      "heightCm": 179,
      "occupation": "Game developer",
      "company": "Games studio",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A game everyone learns in two minutes and argues about for two hours."
        },
        {
          "promptId": "afterEvent",
          "answer": "Reworking the rules so next time is fairer."
        },
        {
          "promptId": "greenFlag",
          "answer": "You are a gracious winner and a funny loser."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/abhinav-varma/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/abhinav-varma/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/abhinav-varma/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/abhinav-varma/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "game_jam",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/abhinav-varma/02-game-jam.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/abhinav-varma/thumbs/02-game-jam.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/abhinav-varma/02-game-jam.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/abhinav-varma/thumbs/02-game-jam.jpg"
        },
        {
          "id": "live_music",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/abhinav-varma/03-live-music.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/abhinav-varma/thumbs/03-live-music.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/abhinav-varma/03-live-music.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/abhinav-varma/thumbs/03-live-music.jpg"
        },
        {
          "id": "biryani_cooking",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/abhinav-varma/04-biryani-cooking.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/abhinav-varma/thumbs/04-biryani-cooking.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/abhinav-varma/04-biryani-cooking.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/abhinav-varma/thumbs/04-biryani-cooking.jpg"
        }
      ]
    },
    {
      "id": "in_aditi_chawla_032",
      "firstName": "Aditi",
      "lastName": "Chawla",
      "displayName": "Aditi Chawla",
      "gender": "woman",
      "dateOfBirth": "1997-02-14",
      "heightCm": 161,
      "occupation": "Fashion buyer",
      "company": "Retail group",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A good outfit, a better crowd, and a playlist that does not quit."
        },
        {
          "promptId": "afterEvent",
          "answer": "Planning brunch for the next morning."
        },
        {
          "promptId": "greenFlag",
          "answer": "You compliment people and mean it."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditi-chawla/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditi-chawla/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aditi-chawla/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aditi-chawla/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "rooftop_night",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditi-chawla/02-rooftop-night.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditi-chawla/thumbs/02-rooftop-night.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aditi-chawla/02-rooftop-night.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aditi-chawla/thumbs/02-rooftop-night.jpg"
        },
        {
          "id": "sunday_brunch",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditi-chawla/03-sunday-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditi-chawla/thumbs/03-sunday-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aditi-chawla/03-sunday-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aditi-chawla/thumbs/03-sunday-brunch.jpg"
        },
        {
          "id": "market_lane",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditi-chawla/04-market-lane.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aditi-chawla/thumbs/04-market-lane.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aditi-chawla/04-market-lane.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aditi-chawla/thumbs/04-market-lane.jpg"
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
      "id": "in_akash_gowda_029",
      "firstName": "Akash",
      "lastName": "Gowda",
      "displayName": "Akash Gowda",
      "gender": "man",
      "dateOfBirth": "1992-08-12",
      "heightCm": 182,
      "occupation": "Climate-tech founder",
      "company": "Solar startup",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A room of people who would not have met otherwise, all talking."
        },
        {
          "promptId": "afterEvent",
          "answer": "Connecting two people who should definitely collaborate."
        },
        {
          "promptId": "greenFlag",
          "answer": "You care about something and can explain why in a sentence."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/akash-gowda/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/akash-gowda/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/akash-gowda/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/akash-gowda/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "weekend_ride",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/akash-gowda/02-weekend-ride.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/akash-gowda/thumbs/02-weekend-ride.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/akash-gowda/02-weekend-ride.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/akash-gowda/thumbs/02-weekend-ride.jpg"
        },
        {
          "id": "founder_meetup",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/akash-gowda/03-founder-meetup.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/akash-gowda/thumbs/03-founder-meetup.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/akash-gowda/03-founder-meetup.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/akash-gowda/thumbs/03-founder-meetup.jpg"
        },
        {
          "id": "lake_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/akash-gowda/04-lake-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/akash-gowda/thumbs/04-lake-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/akash-gowda/04-lake-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/akash-gowda/thumbs/04-lake-walk.jpg"
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
      "id": "in_aniket_pawar_046",
      "firstName": "Aniket",
      "lastName": "Pawar",
      "displayName": "Aniket Pawar",
      "gender": "man",
      "dateOfBirth": "1993-12-05",
      "heightCm": 179,
      "occupation": "Civil engineer",
      "company": "Construction firm",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A plan that works, a host who is ready, and nobody left out."
        },
        {
          "promptId": "afterEvent",
          "answer": "Already organising a trek for the people at my table."
        },
        {
          "promptId": "greenFlag",
          "answer": "You are kind to people who can't do anything for you."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aniket-pawar/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aniket-pawar/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aniket-pawar/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aniket-pawar/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "fort_trek",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aniket-pawar/02-fort-trek.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aniket-pawar/thumbs/02-fort-trek.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aniket-pawar/02-fort-trek.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aniket-pawar/thumbs/02-fort-trek.jpg"
        },
        {
          "id": "thali_place",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aniket-pawar/03-thali-place.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aniket-pawar/thumbs/03-thali-place.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aniket-pawar/03-thali-place.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aniket-pawar/thumbs/03-thali-place.jpg"
        },
        {
          "id": "peth_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aniket-pawar/04-peth-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aniket-pawar/thumbs/04-peth-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aniket-pawar/04-peth-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aniket-pawar/thumbs/04-peth-walk.jpg"
        }
      ]
    },
    {
      "id": "in_anirudh_iyengar_042",
      "firstName": "Anirudh",
      "lastName": "Iyengar",
      "displayName": "Anirudh Iyengar",
      "gender": "man",
      "dateOfBirth": "1994-01-17",
      "heightCm": 180,
      "occupation": "Guitarist",
      "company": "Indie band",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A good sound system, a crowd that listens, and one encore."
        },
        {
          "promptId": "afterEvent",
          "answer": "Helping the band pack up and talking shop."
        },
        {
          "promptId": "greenFlag",
          "answer": "You have a song you'll defend against everyone."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/anirudh-iyengar/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/anirudh-iyengar/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/anirudh-iyengar/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/anirudh-iyengar/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "rehearsal_space",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/anirudh-iyengar/02-rehearsal-space.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/anirudh-iyengar/thumbs/02-rehearsal-space.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/anirudh-iyengar/02-rehearsal-space.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/anirudh-iyengar/thumbs/02-rehearsal-space.jpg"
        },
        {
          "id": "gig_night",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/anirudh-iyengar/03-gig-night.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/anirudh-iyengar/thumbs/03-gig-night.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/anirudh-iyengar/03-gig-night.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/anirudh-iyengar/thumbs/03-gig-night.jpg"
        },
        {
          "id": "slow_brunch",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/anirudh-iyengar/04-slow-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/anirudh-iyengar/thumbs/04-slow-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/anirudh-iyengar/04-slow-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/anirudh-iyengar/thumbs/04-slow-brunch.jpg"
        }
      ]
    },
    {
      "id": "in_arnav_bose_033",
      "firstName": "Arnav",
      "lastName": "Bose",
      "displayName": "Arnav Bose",
      "gender": "man",
      "dateOfBirth": "1995-10-26",
      "heightCm": 178,
      "occupation": "Economist",
      "company": "Research organisation",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A friendly game, a hard question, and a long dinner after."
        },
        {
          "promptId": "afterEvent",
          "answer": "Recommending a book and a fish curry, in that order."
        },
        {
          "promptId": "greenFlag",
          "answer": "You have a reading list and you let me borrow from it."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/arnav-bose/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/arnav-bose/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/arnav-bose/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/arnav-bose/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "weekend_pickleball",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/arnav-bose/02-weekend-pickleball.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/arnav-bose/thumbs/02-weekend-pickleball.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/arnav-bose/02-weekend-pickleball.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/arnav-bose/thumbs/02-weekend-pickleball.jpg"
        },
        {
          "id": "book_market",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/arnav-bose/03-book-market.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/arnav-bose/thumbs/03-book-market.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/arnav-bose/03-book-market.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/arnav-bose/thumbs/03-book-market.jpg"
        },
        {
          "id": "friends_brunch",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/arnav-bose/04-friends-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/arnav-bose/thumbs/04-friends-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/arnav-bose/04-friends-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/arnav-bose/thumbs/04-friends-brunch.jpg"
        }
      ]
    },
    {
      "id": "in_aryan_mathur_056",
      "firstName": "Aryan",
      "lastName": "Mathur",
      "displayName": "Aryan Mathur",
      "gender": "man",
      "dateOfBirth": "1994-11-02",
      "heightCm": 182,
      "occupation": "Sports club manager",
      "company": "Pickleball club, Gurugram",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Beginners and regulars mixed together, with nobody stuck on the bench."
        },
        {
          "promptId": "afterEvent",
          "answer": "Asking the beginners how it went and meaning it."
        },
        {
          "promptId": "greenFlag",
          "answer": "You try a new shot even if it might not work."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aryan-mathur/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aryan-mathur/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aryan-mathur/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aryan-mathur/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "coaching_session",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aryan-mathur/02-coaching-session.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aryan-mathur/thumbs/02-coaching-session.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aryan-mathur/02-coaching-session.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aryan-mathur/thumbs/02-coaching-session.jpg"
        },
        {
          "id": "club_brunch",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aryan-mathur/03-club-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aryan-mathur/thumbs/03-club-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aryan-mathur/03-club-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aryan-mathur/thumbs/03-club-brunch.jpg"
        },
        {
          "id": "park_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aryan-mathur/04-park-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/aryan-mathur/thumbs/04-park-picnic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/aryan-mathur/04-park-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/aryan-mathur/thumbs/04-park-picnic.jpg"
        }
      ]
    },
    {
      "id": "in_ayesha_baig_063",
      "firstName": "Ayesha",
      "lastName": "Baig",
      "displayName": "Ayesha Baig",
      "gender": "woman",
      "dateOfBirth": "1997-01-14",
      "heightCm": 164,
      "occupation": "Fashion designer",
      "company": "Independent label",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A dress code everyone half follows and a night that keeps moving."
        },
        {
          "promptId": "afterEvent",
          "answer": "Complimenting at least three outfits on the way out."
        },
        {
          "promptId": "greenFlag",
          "answer": "You wear something because you love it, not because it's safe."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ayesha-baig/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ayesha-baig/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ayesha-baig/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ayesha-baig/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "design_studio",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ayesha-baig/02-design-studio.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ayesha-baig/thumbs/02-design-studio.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ayesha-baig/02-design-studio.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ayesha-baig/thumbs/02-design-studio.jpg"
        },
        {
          "id": "rooftop_supper",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ayesha-baig/03-rooftop-supper.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ayesha-baig/thumbs/03-rooftop-supper.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ayesha-baig/03-rooftop-supper.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ayesha-baig/thumbs/03-rooftop-supper.jpg"
        },
        {
          "id": "friends_brunch",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ayesha-baig/04-friends-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ayesha-baig/thumbs/04-friends-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ayesha-baig/04-friends-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ayesha-baig/thumbs/04-friends-brunch.jpg"
        }
      ]
    },
    {
      "id": "in_chinmay_paranjape_052",
      "firstName": "Chinmay",
      "lastName": "Paranjape",
      "displayName": "Chinmay Paranjape",
      "gender": "man",
      "dateOfBirth": "1995-10-04",
      "heightCm": 173,
      "occupation": "Sound designer",
      "company": "Games studio",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A game with a great soundtrack and a crowd that gets loud."
        },
        {
          "promptId": "afterEvent",
          "answer": "Recording the room's best laugh on my phone."
        },
        {
          "promptId": "greenFlag",
          "answer": "You hum along without realising it."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/chinmay-paranjape/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/chinmay-paranjape/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/chinmay-paranjape/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/chinmay-paranjape/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "sound_booth",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/chinmay-paranjape/02-sound-booth.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/chinmay-paranjape/thumbs/02-sound-booth.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/chinmay-paranjape/02-sound-booth.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/chinmay-paranjape/thumbs/02-sound-booth.jpg"
        },
        {
          "id": "rooftop_dinner",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/chinmay-paranjape/03-rooftop-dinner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/chinmay-paranjape/thumbs/03-rooftop-dinner.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/chinmay-paranjape/03-rooftop-dinner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/chinmay-paranjape/thumbs/03-rooftop-dinner.jpg"
        },
        {
          "id": "park_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/chinmay-paranjape/04-park-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/chinmay-paranjape/thumbs/04-park-picnic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/chinmay-paranjape/04-park-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/chinmay-paranjape/thumbs/04-park-picnic.jpg"
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
      "id": "in_divya_reddy_026",
      "firstName": "Divya",
      "lastName": "Reddy",
      "displayName": "Divya Reddy",
      "gender": "woman",
      "dateOfBirth": "1996-06-28",
      "heightCm": 164,
      "occupation": "Product manager",
      "company": "SaaS company",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A small table, a big question, and nobody rushing to leave."
        },
        {
          "promptId": "afterEvent",
          "answer": "Finding filter coffee and finishing the conversation."
        },
        {
          "promptId": "greenFlag",
          "answer": "You ask what I am excited about, not what I do."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/divya-reddy/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/divya-reddy/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/divya-reddy/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/divya-reddy/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "rooftop_yoga",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/divya-reddy/02-rooftop-yoga.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/divya-reddy/thumbs/02-rooftop-yoga.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/divya-reddy/02-rooftop-yoga.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/divya-reddy/thumbs/02-rooftop-yoga.jpg"
        },
        {
          "id": "filter_coffee",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/divya-reddy/03-filter-coffee.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/divya-reddy/thumbs/03-filter-coffee.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/divya-reddy/03-filter-coffee.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/divya-reddy/thumbs/03-filter-coffee.jpg"
        },
        {
          "id": "weekend_gallery",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/divya-reddy/04-weekend-gallery.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/divya-reddy/thumbs/04-weekend-gallery.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/divya-reddy/04-weekend-gallery.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/divya-reddy/thumbs/04-weekend-gallery.jpg"
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
      "id": "in_fatima_siddiqui_041",
      "firstName": "Fatima",
      "lastName": "Siddiqui",
      "displayName": "Fatima Siddiqui",
      "gender": "woman",
      "dateOfBirth": "1997-04-09",
      "heightCm": 160,
      "occupation": "Data analyst",
      "company": "Bank",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A calm start, a clear plan, and space for quieter people to join in."
        },
        {
          "promptId": "afterEvent",
          "answer": "Recommending a book that matches whatever we talked about."
        },
        {
          "promptId": "greenFlag",
          "answer": "You remember small details and bring them up later."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/fatima-siddiqui/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/fatima-siddiqui/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/fatima-siddiqui/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/fatima-siddiqui/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "studio_yoga",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/fatima-siddiqui/02-studio-yoga.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/fatima-siddiqui/thumbs/02-studio-yoga.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/fatima-siddiqui/02-studio-yoga.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/fatima-siddiqui/thumbs/02-studio-yoga.jpg"
        },
        {
          "id": "cafe_afternoon",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/fatima-siddiqui/03-cafe-afternoon.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/fatima-siddiqui/thumbs/03-cafe-afternoon.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/fatima-siddiqui/03-cafe-afternoon.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/fatima-siddiqui/thumbs/03-cafe-afternoon.jpg"
        },
        {
          "id": "bookshop_corner",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/fatima-siddiqui/04-bookshop-corner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/fatima-siddiqui/thumbs/04-bookshop-corner.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/fatima-siddiqui/04-bookshop-corner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/fatima-siddiqui/thumbs/04-bookshop-corner.jpg"
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
      "id": "in_gurleen_sandhu_059",
      "firstName": "Gurleen",
      "lastName": "Sandhu",
      "displayName": "Gurleen Sandhu",
      "gender": "woman",
      "dateOfBirth": "1993-07-07",
      "heightCm": 168,
      "occupation": "Dermatologist",
      "company": "Hospital",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A calm morning, a good brunch, and people who stay to chat."
        },
        {
          "promptId": "afterEvent",
          "answer": "Handing out sunscreen tips nobody asked for."
        },
        {
          "promptId": "greenFlag",
          "answer": "You drink water without being reminded."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gurleen-sandhu/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gurleen-sandhu/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/gurleen-sandhu/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/gurleen-sandhu/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "park_yoga",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gurleen-sandhu/02-park-yoga.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gurleen-sandhu/thumbs/02-park-yoga.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/gurleen-sandhu/02-park-yoga.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/gurleen-sandhu/thumbs/02-park-yoga.jpg"
        },
        {
          "id": "sunday_brunch",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gurleen-sandhu/03-sunday-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gurleen-sandhu/thumbs/03-sunday-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/gurleen-sandhu/03-sunday-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/gurleen-sandhu/thumbs/03-sunday-brunch.jpg"
        },
        {
          "id": "dilli_haat",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gurleen-sandhu/04-dilli-haat.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/gurleen-sandhu/thumbs/04-dilli-haat.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/gurleen-sandhu/04-dilli-haat.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/gurleen-sandhu/thumbs/04-dilli-haat.jpg"
        }
      ]
    },
    {
      "id": "in_harini_kondapalli_061",
      "firstName": "Harini",
      "lastName": "Kondapalli",
      "displayName": "Harini Kondapalli",
      "gender": "woman",
      "dateOfBirth": "1995-03-08",
      "heightCm": 162,
      "occupation": "Pharmaceutical researcher",
      "company": "Pharma company",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A route with a few stops, a friendly group, and a good finish."
        },
        {
          "promptId": "afterEvent",
          "answer": "Making sure everyone has a ride home."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "Around the lake before sunrise, finishing with chai."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harini-kondapalli/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harini-kondapalli/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/harini-kondapalli/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/harini-kondapalli/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "lake_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harini-kondapalli/02-lake-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harini-kondapalli/thumbs/02-lake-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/harini-kondapalli/02-lake-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/harini-kondapalli/thumbs/02-lake-run.jpg"
        },
        {
          "id": "irani_cafe",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harini-kondapalli/03-irani-cafe.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harini-kondapalli/thumbs/03-irani-cafe.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/harini-kondapalli/03-irani-cafe.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/harini-kondapalli/thumbs/03-irani-cafe.jpg"
        },
        {
          "id": "rooftop_evening",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harini-kondapalli/04-rooftop-evening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harini-kondapalli/thumbs/04-rooftop-evening.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/harini-kondapalli/04-rooftop-evening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/harini-kondapalli/thumbs/04-rooftop-evening.jpg"
        }
      ]
    },
    {
      "id": "in_harsh_agarwal_050",
      "firstName": "Harsh",
      "lastName": "Agarwal",
      "displayName": "Harsh Agarwal",
      "gender": "man",
      "dateOfBirth": "1998-06-30",
      "heightCm": 181,
      "occupation": "MBA student",
      "company": "Business school",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "New people, a good playlist, and a host who mixes the room."
        },
        {
          "promptId": "afterEvent",
          "answer": "Asking everyone what they do and actually listening."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "Around the university campus loop, early, with one hard hill."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harsh-agarwal/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harsh-agarwal/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/harsh-agarwal/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/harsh-agarwal/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "campus_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harsh-agarwal/02-campus-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harsh-agarwal/thumbs/02-campus-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/harsh-agarwal/02-campus-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/harsh-agarwal/thumbs/02-campus-run.jpg"
        },
        {
          "id": "band_night",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harsh-agarwal/03-band-night.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harsh-agarwal/thumbs/03-band-night.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/harsh-agarwal/03-band-night.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/harsh-agarwal/thumbs/03-band-night.jpg"
        },
        {
          "id": "sunday_brunch",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harsh-agarwal/04-sunday-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/harsh-agarwal/thumbs/04-sunday-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/harsh-agarwal/04-sunday-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/harsh-agarwal/thumbs/04-sunday-brunch.jpg"
        }
      ]
    },
    {
      "id": "in_ishani_kapoor_053",
      "firstName": "Ishani",
      "lastName": "Kapoor",
      "displayName": "Ishani Kapoor",
      "gender": "woman",
      "dateOfBirth": "1995-01-30",
      "heightCm": 167,
      "occupation": "Investment banker",
      "company": "Bank, Gurugram",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Competitive but friendly, with partners who change every round."
        },
        {
          "promptId": "afterEvent",
          "answer": "Booking the court for next week before I leave."
        },
        {
          "promptId": "greenFlag",
          "answer": "You clap for the other team's good shots."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishani-kapoor/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishani-kapoor/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ishani-kapoor/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ishani-kapoor/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "league_night",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishani-kapoor/02-league-night.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishani-kapoor/thumbs/02-league-night.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ishani-kapoor/02-league-night.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ishani-kapoor/thumbs/02-league-night.jpg"
        },
        {
          "id": "golf_course_rooftop",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishani-kapoor/03-golf-course-rooftop.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishani-kapoor/thumbs/03-golf-course-rooftop.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ishani-kapoor/03-golf-course-rooftop.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ishani-kapoor/thumbs/03-golf-course-rooftop.jpg"
        },
        {
          "id": "weekend_brunch",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishani-kapoor/04-weekend-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/ishani-kapoor/thumbs/04-weekend-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/ishani-kapoor/04-weekend-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/ishani-kapoor/thumbs/04-weekend-brunch.jpg"
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
      "id": "in_karthik_subramanian_038",
      "firstName": "Karthik",
      "lastName": "Subramanian",
      "displayName": "Karthik Subramanian",
      "gender": "man",
      "dateOfBirth": "1993-06-14",
      "heightCm": 178,
      "occupation": "Robotics engineer",
      "company": "Hardware startup",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A puzzle round, mixed teams, and nobody taking the scoreboard too seriously."
        },
        {
          "promptId": "afterEvent",
          "answer": "Explaining how the venue's lights work to anyone curious."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "A shaded lake loop at six, before the traffic and the heat."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karthik-subramanian/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karthik-subramanian/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/karthik-subramanian/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/karthik-subramanian/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "lake_loop",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karthik-subramanian/02-lake-loop.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karthik-subramanian/thumbs/02-lake-loop.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/karthik-subramanian/02-lake-loop.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/karthik-subramanian/thumbs/02-lake-loop.jpg"
        },
        {
          "id": "robotics_demo",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karthik-subramanian/03-robotics-demo.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karthik-subramanian/thumbs/03-robotics-demo.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/karthik-subramanian/03-robotics-demo.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/karthik-subramanian/thumbs/03-robotics-demo.jpg"
        },
        {
          "id": "church_street_jazz",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karthik-subramanian/04-church-street-jazz.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/karthik-subramanian/thumbs/04-church-street-jazz.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/karthik-subramanian/04-church-street-jazz.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/karthik-subramanian/thumbs/04-church-street-jazz.jpg"
        }
      ]
    },
    {
      "id": "in_kritika_bansal_057",
      "firstName": "Kritika",
      "lastName": "Bansal",
      "displayName": "Kritika Bansal",
      "gender": "woman",
      "dateOfBirth": "1997-02-26",
      "heightCm": 160,
      "occupation": "Product manager",
      "company": "Fintech company, Gurugram",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A well-run night where every round has new partners."
        },
        {
          "promptId": "afterEvent",
          "answer": "Ranking the night's best rallies in the group chat."
        },
        {
          "promptId": "greenFlag",
          "answer": "You ask how my day was and wait for the real answer."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kritika-bansal/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kritika-bansal/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kritika-bansal/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kritika-bansal/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "night_rally",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kritika-bansal/02-night-rally.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kritika-bansal/thumbs/02-night-rally.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kritika-bansal/02-night-rally.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kritika-bansal/thumbs/02-night-rally.jpg"
        },
        {
          "id": "hauz_khas_jazz",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kritika-bansal/03-hauz-khas-jazz.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kritika-bansal/thumbs/03-hauz-khas-jazz.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kritika-bansal/03-hauz-khas-jazz.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kritika-bansal/thumbs/03-hauz-khas-jazz.jpg"
        },
        {
          "id": "sunday_bookshop",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kritika-bansal/04-sunday-bookshop.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kritika-bansal/thumbs/04-sunday-bookshop.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kritika-bansal/04-sunday-bookshop.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kritika-bansal/thumbs/04-sunday-bookshop.jpg"
        }
      ]
    },
    {
      "id": "in_kunal_arora_054",
      "firstName": "Kunal",
      "lastName": "Arora",
      "displayName": "Kunal Arora",
      "gender": "man",
      "dateOfBirth": "1993-04-16",
      "heightCm": 180,
      "occupation": "Management consultant",
      "company": "Consulting firm, Gurugram",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A fair rotation, a quick format, and dinner straight after."
        },
        {
          "promptId": "afterEvent",
          "answer": "Finding the best butter chicken within ten minutes."
        },
        {
          "promptId": "greenFlag",
          "answer": "You keep score honestly even when you're losing."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kunal-arora/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kunal-arora/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kunal-arora/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kunal-arora/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "social_doubles",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kunal-arora/02-social-doubles.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kunal-arora/thumbs/02-social-doubles.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kunal-arora/02-social-doubles.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kunal-arora/thumbs/02-social-doubles.jpg"
        },
        {
          "id": "dinner_out",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kunal-arora/03-dinner-out.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kunal-arora/thumbs/03-dinner-out.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kunal-arora/03-dinner-out.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kunal-arora/thumbs/03-dinner-out.jpg"
        },
        {
          "id": "evening_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kunal-arora/04-evening-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/kunal-arora/thumbs/04-evening-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/kunal-arora/04-evening-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/kunal-arora/thumbs/04-evening-walk.jpg"
        }
      ]
    },
    {
      "id": "in_lakshmi_pothula_067",
      "firstName": "Lakshmi",
      "lastName": "Pothula",
      "displayName": "Lakshmi Pothula",
      "gender": "woman",
      "dateOfBirth": "1994-04-23",
      "heightCm": 160,
      "occupation": "School teacher",
      "company": "International school",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A quiz with categories for everyone and prizes nobody expects."
        },
        {
          "promptId": "afterEvent",
          "answer": "Writing down the questions people loved for next time."
        },
        {
          "promptId": "greenFlag",
          "answer": "You are curious about everything and embarrassed by nothing."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lakshmi-pothula/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lakshmi-pothula/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/lakshmi-pothula/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/lakshmi-pothula/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "cafe_catchup",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lakshmi-pothula/02-cafe-catchup.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lakshmi-pothula/thumbs/02-cafe-catchup.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/lakshmi-pothula/02-cafe-catchup.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/lakshmi-pothula/thumbs/02-cafe-catchup.jpg"
        },
        {
          "id": "salar_jung",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lakshmi-pothula/03-salar-jung.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lakshmi-pothula/thumbs/03-salar-jung.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/lakshmi-pothula/03-salar-jung.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/lakshmi-pothula/thumbs/03-salar-jung.jpg"
        },
        {
          "id": "home_cooking",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lakshmi-pothula/04-home-cooking.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lakshmi-pothula/thumbs/04-home-cooking.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/lakshmi-pothula/04-home-cooking.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/lakshmi-pothula/thumbs/04-home-cooking.jpg"
        }
      ]
    },
    {
      "id": "in_lavanya_hegde_028",
      "firstName": "Lavanya",
      "lastName": "Hegde",
      "displayName": "Lavanya Hegde",
      "gender": "woman",
      "dateOfBirth": "1995-04-01",
      "heightCm": 160,
      "occupation": "Ceramic artist",
      "company": "Independent studio",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A hands-on workshop where everyone leaves with something lopsided and theirs."
        },
        {
          "promptId": "afterEvent",
          "answer": "Cleaning clay off the tables and planning the next session."
        },
        {
          "promptId": "greenFlag",
          "answer": "You keep the wonky mug and use it anyway."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lavanya-hegde/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lavanya-hegde/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/lavanya-hegde/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/lavanya-hegde/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "pottery_studio",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lavanya-hegde/02-pottery-studio.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lavanya-hegde/thumbs/02-pottery-studio.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/lavanya-hegde/02-pottery-studio.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/lavanya-hegde/thumbs/02-pottery-studio.jpg"
        },
        {
          "id": "craft_market",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lavanya-hegde/03-craft-market.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lavanya-hegde/thumbs/03-craft-market.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/lavanya-hegde/03-craft-market.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/lavanya-hegde/thumbs/03-craft-market.jpg"
        },
        {
          "id": "museum_visit",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lavanya-hegde/04-museum-visit.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/lavanya-hegde/thumbs/04-museum-visit.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/lavanya-hegde/04-museum-visit.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/lavanya-hegde/thumbs/04-museum-visit.jpg"
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
      "id": "in_meghana_shenoy_037",
      "firstName": "Meghana",
      "lastName": "Shenoy",
      "displayName": "Meghana Shenoy",
      "gender": "woman",
      "dateOfBirth": "1996-02-20",
      "heightCm": 162,
      "occupation": "Content designer",
      "company": "Edtech company",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A long table, a question everyone wants to answer, and second helpings."
        },
        {
          "promptId": "afterEvent",
          "answer": "Walking to a dessert place nobody has tried yet."
        },
        {
          "promptId": "greenFlag",
          "answer": "You read the whole menu out loud like it's a story."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meghana-shenoy/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meghana-shenoy/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/meghana-shenoy/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/meghana-shenoy/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "indiranagar_brunch",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meghana-shenoy/02-indiranagar-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meghana-shenoy/thumbs/02-indiranagar-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/meghana-shenoy/02-indiranagar-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/meghana-shenoy/thumbs/02-indiranagar-brunch.jpg"
        },
        {
          "id": "gallery_walk",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meghana-shenoy/03-gallery-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meghana-shenoy/thumbs/03-gallery-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/meghana-shenoy/03-gallery-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/meghana-shenoy/thumbs/03-gallery-walk.jpg"
        },
        {
          "id": "park_stroll",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meghana-shenoy/04-park-stroll.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/meghana-shenoy/thumbs/04-park-stroll.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/meghana-shenoy/04-park-stroll.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/meghana-shenoy/thumbs/04-park-stroll.jpg"
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
      "id": "in_mrunal_joshi_049",
      "firstName": "Mrunal",
      "lastName": "Joshi",
      "displayName": "Mrunal Joshi",
      "gender": "woman",
      "dateOfBirth": "1997-03-22",
      "heightCm": 163,
      "occupation": "HR manager",
      "company": "Manufacturing company",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Mixed partners, quick rotations, and nobody sitting out for long."
        },
        {
          "promptId": "afterEvent",
          "answer": "Adding everyone from my court to one group chat."
        },
        {
          "promptId": "greenFlag",
          "answer": "You introduce yourself to the person standing alone."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/mrunal-joshi/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/mrunal-joshi/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/mrunal-joshi/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/mrunal-joshi/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "evening_court",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/mrunal-joshi/02-evening-court.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/mrunal-joshi/thumbs/02-evening-court.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/mrunal-joshi/02-evening-court.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/mrunal-joshi/thumbs/02-evening-court.jpg"
        },
        {
          "id": "rooftop_evening",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/mrunal-joshi/03-rooftop-evening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/mrunal-joshi/thumbs/03-rooftop-evening.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/mrunal-joshi/03-rooftop-evening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/mrunal-joshi/thumbs/03-rooftop-evening.jpg"
        },
        {
          "id": "organic_market",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/mrunal-joshi/04-organic-market.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/mrunal-joshi/thumbs/04-organic-market.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/mrunal-joshi/04-organic-market.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/mrunal-joshi/thumbs/04-organic-market.jpg"
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
      "id": "in_nikita_pereira_051",
      "firstName": "Nikita",
      "lastName": "Pereira",
      "displayName": "Nikita Pereira",
      "gender": "woman",
      "dateOfBirth": "1994-12-11",
      "heightCm": 162,
      "occupation": "Veterinarian",
      "company": "Animal clinic",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A relaxed format, kind people, and a dog or two nearby."
        },
        {
          "promptId": "afterEvent",
          "answer": "Showing pet photos to anyone who asks, and some who don't."
        },
        {
          "promptId": "greenFlag",
          "answer": "Animals like you, and you like them back."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikita-pereira/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikita-pereira/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nikita-pereira/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nikita-pereira/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "weekend_ride",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikita-pereira/02-weekend-ride.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikita-pereira/thumbs/02-weekend-ride.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nikita-pereira/02-weekend-ride.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nikita-pereira/thumbs/02-weekend-ride.jpg"
        },
        {
          "id": "garden_brunch",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikita-pereira/03-garden-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikita-pereira/thumbs/03-garden-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nikita-pereira/03-garden-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nikita-pereira/thumbs/03-garden-brunch.jpg"
        },
        {
          "id": "lane_walk",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikita-pereira/04-lane-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nikita-pereira/thumbs/04-lane-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nikita-pereira/04-lane-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nikita-pereira/thumbs/04-lane-walk.jpg"
        }
      ]
    },
    {
      "id": "in_nitin_bhat_040",
      "firstName": "Nitin",
      "lastName": "Bhat",
      "displayName": "Nitin Bhat",
      "gender": "man",
      "dateOfBirth": "1992-11-28",
      "heightCm": 176,
      "occupation": "Chef",
      "company": "Supper club",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Strangers at one table by the first course and friends by dessert."
        },
        {
          "promptId": "afterEvent",
          "answer": "Packing leftovers for whoever lives furthest away."
        },
        {
          "promptId": "greenFlag",
          "answer": "You ask what's in the dish before you judge it."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nitin-bhat/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nitin-bhat/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nitin-bhat/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nitin-bhat/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "supper_club_pass",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nitin-bhat/02-supper-club-pass.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nitin-bhat/thumbs/02-supper-club-pass.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nitin-bhat/02-supper-club-pass.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nitin-bhat/thumbs/02-supper-club-pass.jpg"
        },
        {
          "id": "market_cooking",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nitin-bhat/03-market-cooking.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nitin-bhat/thumbs/03-market-cooking.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nitin-bhat/03-market-cooking.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nitin-bhat/thumbs/03-market-cooking.jpg"
        },
        {
          "id": "food_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nitin-bhat/04-food-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/nitin-bhat/thumbs/04-food-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/nitin-bhat/04-food-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/nitin-bhat/thumbs/04-food-walk.jpg"
        }
      ]
    },
    {
      "id": "in_noor_rizvi_055",
      "firstName": "Noor",
      "lastName": "Rizvi",
      "displayName": "Noor Rizvi",
      "gender": "woman",
      "dateOfBirth": "1996-08-21",
      "heightCm": 163,
      "occupation": "Photographer",
      "company": "Freelance",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Good light, interesting people, and time to wander."
        },
        {
          "promptId": "afterEvent",
          "answer": "Sending everyone the candid photo they didn't know I took."
        },
        {
          "promptId": "greenFlag",
          "answer": "You look up when you walk through a city."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/noor-rizvi/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/noor-rizvi/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/noor-rizvi/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/noor-rizvi/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "photo_exhibition",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/noor-rizvi/02-photo-exhibition.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/noor-rizvi/thumbs/02-photo-exhibition.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/noor-rizvi/02-photo-exhibition.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/noor-rizvi/thumbs/02-photo-exhibition.jpg"
        },
        {
          "id": "khan_market_cafe",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/noor-rizvi/03-khan-market-cafe.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/noor-rizvi/thumbs/03-khan-market-cafe.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/noor-rizvi/03-khan-market-cafe.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/noor-rizvi/thumbs/03-khan-market-cafe.jpg"
        },
        {
          "id": "stepwell_steps",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/noor-rizvi/04-stepwell-steps.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/noor-rizvi/thumbs/04-stepwell-steps.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/noor-rizvi/04-stepwell-steps.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/noor-rizvi/thumbs/04-stepwell-steps.jpg"
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
      "id": "in_pallavi_gowda_039",
      "firstName": "Pallavi",
      "lastName": "Gowda",
      "displayName": "Pallavi Gowda",
      "gender": "woman",
      "dateOfBirth": "1995-09-03",
      "heightCm": 165,
      "occupation": "Interior designer",
      "company": "Design studio",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Good lighting, a seating plan that mixes people, and food worth talking about."
        },
        {
          "promptId": "afterEvent",
          "answer": "Asking the venue where they found their chairs."
        },
        {
          "promptId": "greenFlag",
          "answer": "You notice when a room feels good and say so."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pallavi-gowda/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pallavi-gowda/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pallavi-gowda/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pallavi-gowda/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "material_board",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pallavi-gowda/02-material-board.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pallavi-gowda/thumbs/02-material-board.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pallavi-gowda/02-material-board.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pallavi-gowda/thumbs/02-material-board.jpg"
        },
        {
          "id": "rooftop_table",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pallavi-gowda/03-rooftop-table.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pallavi-gowda/thumbs/03-rooftop-table.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pallavi-gowda/03-rooftop-table.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pallavi-gowda/thumbs/03-rooftop-table.jpg"
        },
        {
          "id": "garden_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pallavi-gowda/04-garden-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pallavi-gowda/thumbs/04-garden-picnic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pallavi-gowda/04-garden-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pallavi-gowda/thumbs/04-garden-picnic.jpg"
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
      "id": "in_pranavi_gunda_065",
      "firstName": "Pranavi",
      "lastName": "Gunda",
      "displayName": "Pranavi Gunda",
      "gender": "woman",
      "dateOfBirth": "1996-12-02",
      "heightCm": 165,
      "occupation": "Marketing lead",
      "company": "Startup",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Good music, a few stops, and a crowd that dances."
        },
        {
          "promptId": "afterEvent",
          "answer": "Making a playlist of the night's songs."
        },
        {
          "promptId": "greenFlag",
          "answer": "You dance badly and happily."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pranavi-gunda/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pranavi-gunda/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pranavi-gunda/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pranavi-gunda/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "morning_tennis",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pranavi-gunda/02-morning-tennis.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pranavi-gunda/thumbs/02-morning-tennis.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pranavi-gunda/02-morning-tennis.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pranavi-gunda/thumbs/02-morning-tennis.jpg"
        },
        {
          "id": "dance_night",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pranavi-gunda/03-dance-night.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pranavi-gunda/thumbs/03-dance-night.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pranavi-gunda/03-dance-night.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pranavi-gunda/thumbs/03-dance-night.jpg"
        },
        {
          "id": "lake_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pranavi-gunda/04-lake-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/pranavi-gunda/thumbs/04-lake-picnic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/pranavi-gunda/04-lake-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/pranavi-gunda/thumbs/04-lake-picnic.jpg"
        }
      ]
    },
    {
      "id": "in_raghav_tandon_060",
      "firstName": "Raghav",
      "lastName": "Tandon",
      "displayName": "Raghav Tandon",
      "gender": "man",
      "dateOfBirth": "1995-05-24",
      "heightCm": 176,
      "occupation": "Copywriter and stand-up comic",
      "company": "Ad agency",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A room that starts shy and ends loud, with nobody left out."
        },
        {
          "promptId": "afterEvent",
          "answer": "Testing tonight's best line on the walk home."
        },
        {
          "promptId": "greenFlag",
          "answer": "You laugh at the joke and the person, never at them."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/raghav-tandon/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/raghav-tandon/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/raghav-tandon/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/raghav-tandon/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "open_mic",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/raghav-tandon/02-open-mic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/raghav-tandon/thumbs/02-open-mic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/raghav-tandon/02-open-mic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/raghav-tandon/thumbs/02-open-mic.jpg"
        },
        {
          "id": "jazz_evening",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/raghav-tandon/03-jazz-evening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/raghav-tandon/thumbs/03-jazz-evening.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/raghav-tandon/03-jazz-evening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/raghav-tandon/thumbs/03-jazz-evening.jpg"
        },
        {
          "id": "lodhi_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/raghav-tandon/04-lodhi-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/raghav-tandon/thumbs/04-lodhi-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/raghav-tandon/04-lodhi-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/raghav-tandon/thumbs/04-lodhi-walk.jpg"
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
      "id": "in_rahul_krishnan_027",
      "firstName": "Rahul",
      "lastName": "Krishnan",
      "displayName": "Rahul Krishnan",
      "gender": "man",
      "dateOfBirth": "1994-12-19",
      "heightCm": 176,
      "occupation": "Backend engineer",
      "company": "Logistics startup",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A lake loop, a friendly pace group, and breakfast afterwards."
        },
        {
          "promptId": "afterEvent",
          "answer": "Ordering a second round of dosas for the table."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "Around the lake before the joggers arrive, with egrets for company."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahul-krishnan/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahul-krishnan/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rahul-krishnan/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rahul-krishnan/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "lake_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahul-krishnan/02-lake-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahul-krishnan/thumbs/02-lake-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rahul-krishnan/02-lake-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rahul-krishnan/thumbs/02-lake-run.jpg"
        },
        {
          "id": "weekend_brunch",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahul-krishnan/03-weekend-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahul-krishnan/thumbs/03-weekend-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rahul-krishnan/03-weekend-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rahul-krishnan/thumbs/03-weekend-brunch.jpg"
        },
        {
          "id": "friends_breakfast",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahul-krishnan/04-friends-breakfast.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rahul-krishnan/thumbs/04-friends-breakfast.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rahul-krishnan/04-friends-breakfast.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rahul-krishnan/thumbs/04-friends-breakfast.jpg"
        }
      ]
    },
    {
      "id": "in_rishi_malpani_066",
      "firstName": "Rishi",
      "lastName": "Malpani",
      "displayName": "Rishi Malpani",
      "gender": "man",
      "dateOfBirth": "1995-07-18",
      "heightCm": 175,
      "occupation": "DJ and music producer",
      "company": "Freelance",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A room that warms up slowly and a last song nobody wants to end."
        },
        {
          "promptId": "afterEvent",
          "answer": "Asking people which song made them stay."
        },
        {
          "promptId": "greenFlag",
          "answer": "You request a song and then actually dance to it."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rishi-malpani/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rishi-malpani/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rishi-malpani/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rishi-malpani/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "producer_desk",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rishi-malpani/02-producer-desk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rishi-malpani/thumbs/02-producer-desk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rishi-malpani/02-producer-desk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rishi-malpani/thumbs/02-producer-desk.jpg"
        },
        {
          "id": "dj_set",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rishi-malpani/03-dj-set.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rishi-malpani/thumbs/03-dj-set.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rishi-malpani/03-dj-set.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rishi-malpani/thumbs/03-dj-set.jpg"
        },
        {
          "id": "late_brunch",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rishi-malpani/04-late-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rishi-malpani/thumbs/04-late-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rishi-malpani/04-late-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rishi-malpani/thumbs/04-late-brunch.jpg"
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
      "id": "in_rohit_kamath_044",
      "firstName": "Rohit",
      "lastName": "Kamath",
      "displayName": "Rohit Kamath",
      "gender": "man",
      "dateOfBirth": "1995-03-31",
      "heightCm": 174,
      "occupation": "Operations lead",
      "company": "Food delivery startup",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "An early start, a clear route, and breakfast somewhere new."
        },
        {
          "promptId": "afterEvent",
          "answer": "Mapping a cycling route for next weekend."
        },
        {
          "promptId": "greenFlag",
          "answer": "You show up on time and with snacks."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohit-kamath/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohit-kamath/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rohit-kamath/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rohit-kamath/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "nandi_ride",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohit-kamath/02-nandi-ride.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohit-kamath/thumbs/02-nandi-ride.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rohit-kamath/02-nandi-ride.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rohit-kamath/thumbs/02-nandi-ride.jpg"
        },
        {
          "id": "roastery_visit",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohit-kamath/03-roastery-visit.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohit-kamath/thumbs/03-roastery-visit.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rohit-kamath/03-roastery-visit.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rohit-kamath/thumbs/03-roastery-visit.jpg"
        },
        {
          "id": "friends_brunch",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohit-kamath/04-friends-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rohit-kamath/thumbs/04-friends-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rohit-kamath/04-friends-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rohit-kamath/thumbs/04-friends-brunch.jpg"
        }
      ]
    },
    {
      "id": "in_rutuja_bapat_047",
      "firstName": "Rutuja",
      "lastName": "Bapat",
      "displayName": "Rutuja Bapat",
      "gender": "woman",
      "dateOfBirth": "1995-05-19",
      "heightCm": 164,
      "occupation": "Architect",
      "company": "Small practice",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A clever game, a cosy room, and people who laugh at themselves."
        },
        {
          "promptId": "afterEvent",
          "answer": "Sketching the venue's staircase on a napkin."
        },
        {
          "promptId": "greenFlag",
          "answer": "You stop to look at old buildings with me."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rutuja-bapat/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rutuja-bapat/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rutuja-bapat/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rutuja-bapat/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "drafting_table",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rutuja-bapat/02-drafting-table.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rutuja-bapat/thumbs/02-drafting-table.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rutuja-bapat/02-drafting-table.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rutuja-bapat/thumbs/02-drafting-table.jpg"
        },
        {
          "id": "art_evening",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rutuja-bapat/03-art-evening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rutuja-bapat/thumbs/03-art-evening.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rutuja-bapat/03-art-evening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rutuja-bapat/thumbs/03-art-evening.jpg"
        },
        {
          "id": "koregaon_brunch",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rutuja-bapat/04-koregaon-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/rutuja-bapat/thumbs/04-koregaon-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/rutuja-bapat/04-koregaon-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/rutuja-bapat/thumbs/04-koregaon-brunch.jpg"
        }
      ]
    },
    {
      "id": "in_sameer_hussain_062",
      "firstName": "Sameer",
      "lastName": "Hussain",
      "displayName": "Sameer Hussain",
      "gender": "man",
      "dateOfBirth": "1992-10-19",
      "heightCm": 178,
      "occupation": "Restaurateur",
      "company": "Family restaurant",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A night with a few stops, good food at each, and new friends by the end."
        },
        {
          "promptId": "afterEvent",
          "answer": "Leading the way to the best late-night haleem."
        },
        {
          "promptId": "greenFlag",
          "answer": "You try everything once, especially the food."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sameer-hussain/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sameer-hussain/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sameer-hussain/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sameer-hussain/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "family_restaurant",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sameer-hussain/02-family-restaurant.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sameer-hussain/thumbs/02-family-restaurant.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sameer-hussain/02-family-restaurant.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sameer-hussain/thumbs/02-family-restaurant.jpg"
        },
        {
          "id": "live_band",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sameer-hussain/03-live-band.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sameer-hussain/thumbs/03-live-band.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sameer-hussain/03-live-band.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sameer-hussain/thumbs/03-live-band.jpg"
        },
        {
          "id": "old_city_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sameer-hussain/04-old-city-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sameer-hussain/thumbs/04-old-city-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sameer-hussain/04-old-city-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sameer-hussain/thumbs/04-old-city-walk.jpg"
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
      "id": "in_saurabh_kelkar_048",
      "firstName": "Saurabh",
      "lastName": "Kelkar",
      "displayName": "Saurabh Kelkar",
      "gender": "man",
      "dateOfBirth": "1994-08-08",
      "heightCm": 175,
      "occupation": "Games café owner",
      "company": "Board games café",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A game everyone learns quickly, teams that change each round, and loud laughing."
        },
        {
          "promptId": "afterEvent",
          "answer": "Packing up the games and asking which one people want next time."
        },
        {
          "promptId": "greenFlag",
          "answer": "You read the rules before you argue about them."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/saurabh-kelkar/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/saurabh-kelkar/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/saurabh-kelkar/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/saurabh-kelkar/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "games_cafe",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/saurabh-kelkar/02-games-cafe.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/saurabh-kelkar/thumbs/02-games-cafe.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/saurabh-kelkar/02-games-cafe.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/saurabh-kelkar/thumbs/02-games-cafe.jpg"
        },
        {
          "id": "game_night_host",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/saurabh-kelkar/03-game-night-host.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/saurabh-kelkar/thumbs/03-game-night-host.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/saurabh-kelkar/03-game-night-host.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/saurabh-kelkar/thumbs/03-game-night-host.jpg"
        },
        {
          "id": "evening_walk",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/saurabh-kelkar/04-evening-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/saurabh-kelkar/thumbs/04-evening-walk.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/saurabh-kelkar/04-evening-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/saurabh-kelkar/thumbs/04-evening-walk.jpg"
        }
      ]
    },
    {
      "id": "in_sayali_gokhale_045",
      "firstName": "Sayali",
      "lastName": "Gokhale",
      "displayName": "Sayali Gokhale",
      "gender": "woman",
      "dateOfBirth": "1996-10-12",
      "heightCm": 161,
      "occupation": "Software tester",
      "company": "IT services firm",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A game night with fair teams and a host who keeps score honestly."
        },
        {
          "promptId": "afterEvent",
          "answer": "Demanding a rematch, politely."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "Up the hill at dawn with the city waking up below."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sayali-gokhale/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sayali-gokhale/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sayali-gokhale/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sayali-gokhale/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "hill_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sayali-gokhale/02-hill-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sayali-gokhale/thumbs/02-hill-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sayali-gokhale/02-hill-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sayali-gokhale/thumbs/02-hill-run.jpg"
        },
        {
          "id": "fc_road_cafe",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sayali-gokhale/03-fc-road-cafe.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sayali-gokhale/thumbs/03-fc-road-cafe.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sayali-gokhale/03-fc-road-cafe.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sayali-gokhale/thumbs/03-fc-road-cafe.jpg"
        },
        {
          "id": "live_music",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sayali-gokhale/04-live-music.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sayali-gokhale/thumbs/04-live-music.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sayali-gokhale/04-live-music.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sayali-gokhale/thumbs/04-live-music.jpg"
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
      "id": "in_siddhant_bhalla_058",
      "firstName": "Siddhant",
      "lastName": "Bhalla",
      "displayName": "Siddhant Bhalla",
      "gender": "man",
      "dateOfBirth": "1992-09-13",
      "heightCm": 177,
      "occupation": "Architect",
      "company": "Studio",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A beautiful old building, a good story, and coffee after."
        },
        {
          "promptId": "afterEvent",
          "answer": "Leading a detour to see one more courtyard."
        },
        {
          "promptId": "greenFlag",
          "answer": "You ask why a building looks the way it does."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddhant-bhalla/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddhant-bhalla/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/siddhant-bhalla/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/siddhant-bhalla/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "studio_models",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddhant-bhalla/02-studio-models.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddhant-bhalla/thumbs/02-studio-models.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/siddhant-bhalla/02-studio-models.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/siddhant-bhalla/thumbs/02-studio-models.jpg"
        },
        {
          "id": "crafts_museum",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddhant-bhalla/03-crafts-museum.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddhant-bhalla/thumbs/03-crafts-museum.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/siddhant-bhalla/03-crafts-museum.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/siddhant-bhalla/thumbs/03-crafts-museum.jpg"
        },
        {
          "id": "courtyard_cafe",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddhant-bhalla/04-courtyard-cafe.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/siddhant-bhalla/thumbs/04-courtyard-cafe.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/siddhant-bhalla/04-courtyard-cafe.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/siddhant-bhalla/thumbs/04-courtyard-cafe.jpg"
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
      "id": "in_simran_kaur_030",
      "firstName": "Simran",
      "lastName": "Kaur",
      "displayName": "Simran Kaur",
      "gender": "woman",
      "dateOfBirth": "1994-01-24",
      "heightCm": 166,
      "occupation": "Policy researcher",
      "company": "Think tank",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A good question on every table and time for everyone to answer it."
        },
        {
          "promptId": "afterEvent",
          "answer": "Finding the best chole bhature in the neighbourhood."
        },
        {
          "promptId": "greenFlag",
          "answer": "You make space for the quietest person in the room."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/simran-kaur/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/simran-kaur/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/simran-kaur/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/simran-kaur/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "delhi_cafe",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/simran-kaur/02-delhi-cafe.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/simran-kaur/thumbs/02-delhi-cafe.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/simran-kaur/02-delhi-cafe.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/simran-kaur/thumbs/02-delhi-cafe.jpg"
        },
        {
          "id": "national_museum",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/simran-kaur/03-national-museum.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/simran-kaur/thumbs/03-national-museum.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/simran-kaur/03-national-museum.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/simran-kaur/thumbs/03-national-museum.jpg"
        },
        {
          "id": "garden_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/simran-kaur/04-garden-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/simran-kaur/thumbs/04-garden-picnic.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/simran-kaur/04-garden-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/simran-kaur/thumbs/04-garden-picnic.jpg"
        }
      ]
    },
    {
      "id": "in_sindhu_chowdary_034",
      "firstName": "Sindhu",
      "lastName": "Chowdary",
      "displayName": "Sindhu Chowdary",
      "gender": "woman",
      "dateOfBirth": "1996-03-15",
      "heightCm": 163,
      "occupation": "Resident doctor",
      "company": "Teaching hospital",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Early start, steady pace, and Irani chai at the finish."
        },
        {
          "promptId": "afterEvent",
          "answer": "Napping, honestly, then texting everyone thank you."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "Around the lake at dawn, with the city lights still on."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sindhu-chowdary/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sindhu-chowdary/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sindhu-chowdary/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sindhu-chowdary/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "lake_dawn_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sindhu-chowdary/02-lake-dawn-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sindhu-chowdary/thumbs/02-lake-dawn-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sindhu-chowdary/02-lake-dawn-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sindhu-chowdary/thumbs/02-lake-dawn-run.jpg"
        },
        {
          "id": "irani_chai",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sindhu-chowdary/03-irani-chai.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sindhu-chowdary/thumbs/03-irani-chai.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sindhu-chowdary/03-irani-chai.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sindhu-chowdary/thumbs/03-irani-chai.jpg"
        },
        {
          "id": "park_rest",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sindhu-chowdary/04-park-rest.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/sindhu-chowdary/thumbs/04-park-rest.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/sindhu-chowdary/04-park-rest.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/sindhu-chowdary/thumbs/04-park-rest.jpg"
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
      "id": "in_tara_nambiar_043",
      "firstName": "Tara",
      "lastName": "Nambiar",
      "displayName": "Tara Nambiar",
      "gender": "woman",
      "dateOfBirth": "1996-07-25",
      "heightCm": 166,
      "occupation": "Product marketer",
      "company": "Consumer app",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A friendly competition with rotating partners and a loud cheering section."
        },
        {
          "promptId": "afterEvent",
          "answer": "Arranging a rematch before anyone leaves."
        },
        {
          "promptId": "getAlongIf",
          "answer": "You can lose a game gracefully and win one modestly."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tara-nambiar/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tara-nambiar/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tara-nambiar/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tara-nambiar/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "night_pickleball",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tara-nambiar/02-night-pickleball.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tara-nambiar/thumbs/02-night-pickleball.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tara-nambiar/02-night-pickleball.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tara-nambiar/thumbs/02-night-pickleball.jpg"
        },
        {
          "id": "team_brunch",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tara-nambiar/03-team-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tara-nambiar/thumbs/03-team-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tara-nambiar/03-team-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tara-nambiar/thumbs/03-team-brunch.jpg"
        },
        {
          "id": "art_museum",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tara-nambiar/04-art-museum.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tara-nambiar/thumbs/04-art-museum.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tara-nambiar/04-art-museum.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tara-nambiar/thumbs/04-art-museum.jpg"
        }
      ]
    },
    {
      "id": "in_tejas_naidu_068",
      "firstName": "Tejas",
      "lastName": "Naidu",
      "displayName": "Tejas Naidu",
      "gender": "man",
      "dateOfBirth": "1993-02-11",
      "heightCm": 179,
      "occupation": "Aerospace engineer",
      "company": "Aerospace firm",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A friendly group, a few stops, and someone keeping the pace honest."
        },
        {
          "promptId": "afterEvent",
          "answer": "Lending someone the book we just argued about."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "Up to the rocks at sunrise and back before the heat."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tejas-naidu/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tejas-naidu/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tejas-naidu/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tejas-naidu/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "rocks_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tejas-naidu/02-rocks-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tejas-naidu/thumbs/02-rocks-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tejas-naidu/02-rocks-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tejas-naidu/thumbs/02-rocks-run.jpg"
        },
        {
          "id": "bookshop_find",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tejas-naidu/03-bookshop-find.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tejas-naidu/thumbs/03-bookshop-find.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tejas-naidu/03-bookshop-find.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tejas-naidu/thumbs/03-bookshop-find.jpg"
        },
        {
          "id": "fort_day_trip",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tejas-naidu/04-fort-day-trip.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/tejas-naidu/thumbs/04-fort-day-trip.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/tejas-naidu/04-fort-day-trip.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/tejas-naidu/thumbs/04-fort-day-trip.jpg"
        }
      ]
    },
    {
      "id": "in_vamsi_kodali_064",
      "firstName": "Vamsi",
      "lastName": "Kodali",
      "displayName": "Vamsi Kodali",
      "gender": "man",
      "dateOfBirth": "1994-09-27",
      "heightCm": 181,
      "occupation": "Cloud engineer",
      "company": "Tech company",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A good crowd, a few venues, and a host who keeps the group together."
        },
        {
          "promptId": "afterEvent",
          "answer": "Suggesting just one more place."
        },
        {
          "promptId": "favoriteRoute",
          "answer": "Through the tech park at dawn, when the roads are empty."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vamsi-kodali/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vamsi-kodali/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/vamsi-kodali/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/vamsi-kodali/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "dawn_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vamsi-kodali/02-dawn-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vamsi-kodali/thumbs/02-dawn-run.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/vamsi-kodali/02-dawn-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/vamsi-kodali/thumbs/02-dawn-run.jpg"
        },
        {
          "id": "weekend_brunch",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vamsi-kodali/03-weekend-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vamsi-kodali/thumbs/03-weekend-brunch.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/vamsi-kodali/03-weekend-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/vamsi-kodali/thumbs/03-weekend-brunch.jpg"
        },
        {
          "id": "music_bar",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vamsi-kodali/04-music-bar.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/vamsi-kodali/thumbs/04-music-bar.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/vamsi-kodali/04-music-bar.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/vamsi-kodali/thumbs/04-music-bar.jpg"
        }
      ]
    },
    {
      "id": "in_varun_khanna_031",
      "firstName": "Varun",
      "lastName": "Khanna",
      "displayName": "Varun Khanna",
      "gender": "man",
      "dateOfBirth": "1993-05-09",
      "heightCm": 181,
      "occupation": "Hotelier",
      "company": "Boutique hotel group",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Long tables, shared plates, and a host who makes introductions."
        },
        {
          "promptId": "afterEvent",
          "answer": "Leading a detour to the best kulfi in the city."
        },
        {
          "promptId": "greenFlag",
          "answer": "You thank the kitchen on the way out."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/varun-khanna/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/varun-khanna/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/varun-khanna/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/varun-khanna/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "shared_plates",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/varun-khanna/02-shared-plates.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/varun-khanna/thumbs/02-shared-plates.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/varun-khanna/02-shared-plates.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/varun-khanna/thumbs/02-shared-plates.jpg"
        },
        {
          "id": "delhi_jazz",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/varun-khanna/03-delhi-jazz.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/varun-khanna/thumbs/03-delhi-jazz.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/varun-khanna/03-delhi-jazz.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/varun-khanna/thumbs/03-delhi-jazz.jpg"
        },
        {
          "id": "stepwell",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/varun-khanna/04-stepwell.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/india-core-v1/varun-khanna/thumbs/04-stepwell.jpg",
          "storagePath": "demo/sales-personas/india-core-v1/varun-khanna/04-stepwell.jpg",
          "thumbnailStoragePath": "demo/sales-personas/india-core-v1/varun-khanna/thumbs/04-stepwell.jpg"
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
    },
    {
      "id": "nyc_aisha_williams_005",
      "firstName": "Aisha",
      "lastName": "Williams",
      "displayName": "Aisha Williams",
      "gender": "woman",
      "dateOfBirth": "1995-04-22",
      "heightCm": 170,
      "occupation": "Emergency nurse",
      "company": "Mount Sinai",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Good conversation, a plan that feels easy, and brunch where nobody talks about work for ten minutes."
        },
        {
          "promptId": "afterEvent",
          "answer": "Checking on everyone, then pretending I do not want fries."
        },
        {
          "promptId": "greenFlag",
          "answer": "I can be decisive without making it a personality."
        }
      ],
      "photos": [
        {
          "id": "hero_park",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/aisha-williams/01-hero-park.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/aisha-williams/thumbs/01-hero-park.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/aisha-williams/01-hero-park.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/aisha-williams/thumbs/01-hero-park.jpg"
        },
        {
          "id": "friends_brunch",
          "position": 1,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/aisha-williams/02-friends-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/aisha-williams/thumbs/02-friends-brunch.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/aisha-williams/02-friends-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/aisha-williams/thumbs/02-friends-brunch.jpg"
        },
        {
          "id": "night_shift_coffee",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/aisha-williams/03-night-shift-coffee.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/aisha-williams/thumbs/03-night-shift-coffee.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/aisha-williams/03-night-shift-coffee.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/aisha-williams/thumbs/03-night-shift-coffee.jpg"
        },
        {
          "id": "saturday_jazz",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/aisha-williams/04-saturday-jazz.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/aisha-williams/thumbs/04-saturday-jazz.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/aisha-williams/04-saturday-jazz.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/aisha-williams/thumbs/04-saturday-jazz.jpg"
        }
      ]
    },
    {
      "id": "nyc_andre_baptiste_020",
      "firstName": "Andre",
      "lastName": "Baptiste",
      "displayName": "Andre Baptiste",
      "gender": "man",
      "dateOfBirth": "1994-06-02",
      "heightCm": 185,
      "occupation": "Finance operations lead",
      "company": "HarborPay",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A clean route, a little friendly pressure, and the best breakfast within ten blocks."
        },
        {
          "promptId": "afterEvent",
          "answer": "Quietly becoming the person with the reservation plan."
        },
        {
          "promptId": "greenFlag",
          "answer": "I can handle logistics without making them everyone else's problem."
        }
      ],
      "photos": [
        {
          "id": "hero_financial_district",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/andre-baptiste/01-hero-financial-district.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/andre-baptiste/thumbs/01-hero-financial-district.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/andre-baptiste/01-hero-financial-district.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/andre-baptiste/thumbs/01-hero-financial-district.jpg"
        },
        {
          "id": "rooftop_dinner",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/andre-baptiste/02-rooftop-dinner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/andre-baptiste/thumbs/02-rooftop-dinner.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/andre-baptiste/02-rooftop-dinner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/andre-baptiste/thumbs/02-rooftop-dinner.jpg"
        },
        {
          "id": "neighborhood_candid",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/andre-baptiste/03-neighborhood-candid.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/andre-baptiste/thumbs/03-neighborhood-candid.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/andre-baptiste/03-neighborhood-candid.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/andre-baptiste/thumbs/03-neighborhood-candid.jpg"
        },
        {
          "id": "riverside_run",
          "position": 3,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/andre-baptiste/04-riverside-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/andre-baptiste/thumbs/04-riverside-run.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/andre-baptiste/04-riverside-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/andre-baptiste/thumbs/04-riverside-run.jpg"
        }
      ]
    },
    {
      "id": "nyc_arjun_mehta_016",
      "firstName": "Arjun",
      "lastName": "Mehta",
      "displayName": "Arjun Mehta",
      "gender": "man",
      "dateOfBirth": "1997-04-03",
      "heightCm": 178,
      "occupation": "Data scientist",
      "company": "TransitAI",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A route with one good skyline view and no debate about splitting the pace."
        },
        {
          "promptId": "afterEvent",
          "answer": "Quietly finding the best table and pretending it was luck."
        },
        {
          "promptId": "greenFlag",
          "answer": "I listen first and then say the thing everyone was thinking."
        }
      ],
      "photos": [
        {
          "id": "hero_east_village",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/arjun-mehta/01-hero-east-village.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/arjun-mehta/thumbs/01-hero-east-village.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/arjun-mehta/01-hero-east-village.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/arjun-mehta/thumbs/01-hero-east-village.jpg"
        },
        {
          "id": "pickleball_candid",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/arjun-mehta/02-pickleball-candid.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/arjun-mehta/thumbs/02-pickleball-candid.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/arjun-mehta/02-pickleball-candid.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/arjun-mehta/thumbs/02-pickleball-candid.jpg"
        },
        {
          "id": "coffee_laptop_closed",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/arjun-mehta/03-coffee-laptop-closed.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/arjun-mehta/thumbs/03-coffee-laptop-closed.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/arjun-mehta/03-coffee-laptop-closed.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/arjun-mehta/thumbs/03-coffee-laptop-closed.jpg"
        },
        {
          "id": "bookstore_stack",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/arjun-mehta/04-bookstore-stack.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/arjun-mehta/thumbs/04-bookstore-stack.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/arjun-mehta/04-bookstore-stack.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/arjun-mehta/thumbs/04-bookstore-stack.jpg"
        }
      ]
    },
    {
      "id": "nyc_caleb_johnson_012",
      "firstName": "Caleb",
      "lastName": "Johnson",
      "displayName": "Caleb Johnson",
      "gender": "man",
      "dateOfBirth": "1993-03-19",
      "heightCm": 186,
      "occupation": "Civil rights attorney",
      "company": "Public Counsel",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Good weather, nobody getting dropped, and a cafe where the conversation keeps going."
        },
        {
          "promptId": "afterEvent",
          "answer": "Debriefing over coffee like the group just solved a case."
        },
        {
          "promptId": "greenFlag",
          "answer": "I can disagree kindly and still keep the table laughing."
        }
      ],
      "photos": [
        {
          "id": "hero_courthouse_steps",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/caleb-johnson/01-hero-courthouse-steps.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/caleb-johnson/thumbs/01-hero-courthouse-steps.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/caleb-johnson/01-hero-courthouse-steps.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/caleb-johnson/thumbs/01-hero-courthouse-steps.jpg"
        },
        {
          "id": "coffee_booth",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/caleb-johnson/02-coffee-booth.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/caleb-johnson/thumbs/02-coffee-booth.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/caleb-johnson/02-coffee-booth.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/caleb-johnson/thumbs/02-coffee-booth.jpg"
        },
        {
          "id": "park_picnic",
          "position": 2,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/caleb-johnson/03-park-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/caleb-johnson/thumbs/03-park-picnic.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/caleb-johnson/03-park-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/caleb-johnson/thumbs/03-park-picnic.jpg"
        },
        {
          "id": "jazz_corner",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/caleb-johnson/04-jazz-corner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/caleb-johnson/thumbs/04-jazz-corner.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/caleb-johnson/04-jazz-corner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/caleb-johnson/thumbs/04-jazz-corner.jpg"
        }
      ]
    },
    {
      "id": "nyc_chloe_bennett_009",
      "firstName": "Chloe",
      "lastName": "Bennett",
      "displayName": "Chloe Bennett",
      "gender": "woman",
      "dateOfBirth": "1997-11-30",
      "heightCm": 168,
      "occupation": "Interior designer",
      "company": "Borough Studio",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A scenic loop, one good playlist, and a coffee spot with outdoor chairs after."
        },
        {
          "promptId": "afterEvent",
          "answer": "Rearranging the table so everyone can actually hear each other."
        },
        {
          "promptId": "greenFlag",
          "answer": "I notice the quiet person and pull them into the conversation."
        }
      ],
      "photos": [
        {
          "id": "hero_brownstone",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/chloe-bennett/01-hero-brownstone.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/chloe-bennett/thumbs/01-hero-brownstone.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/chloe-bennett/01-hero-brownstone.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/chloe-bennett/thumbs/01-hero-brownstone.jpg"
        },
        {
          "id": "sidewalk_cappuccino",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/chloe-bennett/02-sidewalk-cappuccino.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/chloe-bennett/thumbs/02-sidewalk-cappuccino.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/chloe-bennett/02-sidewalk-cappuccino.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/chloe-bennett/thumbs/02-sidewalk-cappuccino.jpg"
        },
        {
          "id": "rooftop_table",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/chloe-bennett/03-rooftop-table.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/chloe-bennett/thumbs/03-rooftop-table.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/chloe-bennett/03-rooftop-table.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/chloe-bennett/thumbs/03-rooftop-table.jpg"
        },
        {
          "id": "friends_brunch_corner",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/chloe-bennett/04-friends-brunch-corner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/chloe-bennett/thumbs/04-friends-brunch-corner.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/chloe-bennett/04-friends-brunch-corner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/chloe-bennett/thumbs/04-friends-brunch-corner.jpg"
        }
      ]
    },
    {
      "id": "nyc_daniel_kim_006",
      "firstName": "Daniel",
      "lastName": "Kim",
      "displayName": "Daniel Kim",
      "gender": "man",
      "dateOfBirth": "1992-08-15",
      "heightCm": 176,
      "occupation": "Architect",
      "company": "Line Studio",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A plan with good architecture, room to talk, and a coffee shop with real chairs."
        },
        {
          "promptId": "afterEvent",
          "answer": "Taking a photo of a building detail nobody else noticed."
        },
        {
          "promptId": "greenFlag",
          "answer": "I am quietly competitive about showing up for people."
        }
      ],
      "photos": [
        {
          "id": "hero_esplanade",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/daniel-kim/01-hero-esplanade.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/daniel-kim/thumbs/01-hero-esplanade.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/daniel-kim/01-hero-esplanade.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/daniel-kim/thumbs/01-hero-esplanade.jpg"
        },
        {
          "id": "group_walk_steps",
          "position": 1,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/daniel-kim/02-group-walk-steps.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/daniel-kim/thumbs/02-group-walk-steps.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/daniel-kim/02-group-walk-steps.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/daniel-kim/thumbs/02-group-walk-steps.jpg"
        },
        {
          "id": "studio_model",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/daniel-kim/03-studio-model.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/daniel-kim/thumbs/03-studio-model.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/daniel-kim/03-studio-model.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/daniel-kim/thumbs/03-studio-model.jpg"
        },
        {
          "id": "dumpling_weekend",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/daniel-kim/04-dumpling-weekend.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/daniel-kim/thumbs/04-dumpling-weekend.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/daniel-kim/04-dumpling-weekend.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/daniel-kim/thumbs/04-dumpling-weekend.jpg"
        }
      ]
    },
    {
      "id": "nyc_emma_rodriguez_013",
      "firstName": "Emma",
      "lastName": "Rodriguez",
      "displayName": "Emma Rodriguez",
      "gender": "woman",
      "dateOfBirth": "1994-12-12",
      "heightCm": 166,
      "occupation": "Sous chef",
      "company": "Private restaurant group",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A route that ends near something actually delicious."
        },
        {
          "promptId": "afterEvent",
          "answer": "Ordering one extra plate because someone will absolutely want it."
        },
        {
          "promptId": "greenFlag",
          "answer": "I feed people and I say what I mean kindly."
        }
      ],
      "photos": [
        {
          "id": "hero_west_village",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/emma-rodriguez/01-hero-west-village.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/emma-rodriguez/thumbs/01-hero-west-village.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/emma-rodriguez/01-hero-west-village.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/emma-rodriguez/thumbs/01-hero-west-village.jpg"
        },
        {
          "id": "restaurant_bar",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/emma-rodriguez/02-restaurant-bar.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/emma-rodriguez/thumbs/02-restaurant-bar.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/emma-rodriguez/02-restaurant-bar.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/emma-rodriguez/thumbs/02-restaurant-bar.jpg"
        },
        {
          "id": "home_cooking",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/emma-rodriguez/03-home-cooking.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/emma-rodriguez/thumbs/03-home-cooking.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/emma-rodriguez/03-home-cooking.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/emma-rodriguez/thumbs/03-home-cooking.jpg"
        },
        {
          "id": "public_tennis",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/emma-rodriguez/04-public-tennis.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/emma-rodriguez/thumbs/04-public-tennis.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/emma-rodriguez/04-public-tennis.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/emma-rodriguez/thumbs/04-public-tennis.jpg"
        }
      ]
    },
    {
      "id": "nyc_ethan_brooks_004",
      "firstName": "Ethan",
      "lastName": "Brooks",
      "displayName": "Ethan Brooks",
      "gender": "man",
      "dateOfBirth": "1993-12-03",
      "heightCm": 188,
      "occupation": "Software engineer",
      "company": "Northstar",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A bridge walk, a good view, and someone who will debate the best bagel on the way back."
        },
        {
          "promptId": "afterEvent",
          "answer": "Stretching for exactly two minutes and calling it mobility."
        },
        {
          "promptId": "greenFlag",
          "answer": "I am calm under pressure and weirdly good at finding the practical answer."
        }
      ],
      "photos": [
        {
          "id": "hero_bridge",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/ethan-brooks/01-hero-bridge.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/ethan-brooks/thumbs/01-hero-bridge.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/ethan-brooks/01-hero-bridge.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/ethan-brooks/thumbs/01-hero-bridge.jpg"
        },
        {
          "id": "trail_overlook",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/ethan-brooks/02-morning-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/ethan-brooks/thumbs/02-morning-run.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/ethan-brooks/02-morning-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/ethan-brooks/thumbs/02-morning-run.jpg"
        },
        {
          "id": "kitchen_cooking",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/ethan-brooks/03-kitchen-cooking.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/ethan-brooks/thumbs/03-kitchen-cooking.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/ethan-brooks/03-kitchen-cooking.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/ethan-brooks/thumbs/03-kitchen-cooking.jpg"
        },
        {
          "id": "museum_steps",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/ethan-brooks/04-museum-steps.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/ethan-brooks/thumbs/04-museum-steps.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/ethan-brooks/04-museum-steps.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/ethan-brooks/thumbs/04-museum-steps.jpg"
        }
      ]
    },
    {
      "id": "nyc_grace_liu_017",
      "firstName": "Grace",
      "lastName": "Liu",
      "displayName": "Grace Liu",
      "gender": "woman",
      "dateOfBirth": "1995-10-14",
      "heightCm": 164,
      "occupation": "Art curator",
      "company": "Independent",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A route with a weird public sculpture and someone who will humor my detours."
        },
        {
          "promptId": "afterEvent",
          "answer": "Finding dumplings and explaining why the lighting is good."
        },
        {
          "promptId": "greenFlag",
          "answer": "I am decisive about plans and gentle about people."
        }
      ],
      "photos": [
        {
          "id": "hero_gallery_block",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/grace-liu/01-hero-gallery-block.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/grace-liu/thumbs/01-hero-gallery-block.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/grace-liu/01-hero-gallery-block.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/grace-liu/thumbs/01-hero-gallery-block.jpg"
        },
        {
          "id": "gallery_opening",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/grace-liu/02-gallery-opening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/grace-liu/thumbs/02-gallery-opening.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/grace-liu/02-gallery-opening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/grace-liu/thumbs/02-gallery-opening.jpg"
        },
        {
          "id": "dumpling_counter",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/grace-liu/03-dumpling-counter.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/grace-liu/thumbs/03-dumpling-counter.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/grace-liu/03-dumpling-counter.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/grace-liu/thumbs/03-dumpling-counter.jpg"
        },
        {
          "id": "city_steps",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/grace-liu/04-city-steps.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/grace-liu/thumbs/04-city-steps.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/grace-liu/04-city-steps.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/grace-liu/thumbs/04-city-steps.jpg"
        }
      ]
    },
    {
      "id": "nyc_hannah_cohen_019",
      "firstName": "Hannah",
      "lastName": "Cohen",
      "displayName": "Hannah Cohen",
      "gender": "woman",
      "dateOfBirth": "1993-08-11",
      "heightCm": 169,
      "occupation": "Pediatric resident",
      "company": "NYU Langone",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Early enough that the city is quiet, late enough that coffee is open."
        },
        {
          "promptId": "afterEvent",
          "answer": "Asking three follow-ups and then ordering pancakes for the table."
        },
        {
          "promptId": "greenFlag",
          "answer": "I am steady when plans change."
        }
      ],
      "photos": [
        {
          "id": "hero_union_square",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/hannah-cohen/01-hero-union-square.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/hannah-cohen/thumbs/01-hero-union-square.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/hannah-cohen/01-hero-union-square.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/hannah-cohen/thumbs/01-hero-union-square.jpg"
        },
        {
          "id": "easy_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/hannah-cohen/02-easy-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/hannah-cohen/thumbs/02-easy-run.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/hannah-cohen/02-easy-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/hannah-cohen/thumbs/02-easy-run.jpg"
        },
        {
          "id": "coffee_window",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/hannah-cohen/03-coffee-window.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/hannah-cohen/thumbs/03-coffee-window.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/hannah-cohen/03-coffee-window.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/hannah-cohen/thumbs/03-coffee-window.jpg"
        },
        {
          "id": "park_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/hannah-cohen/04-park-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/hannah-cohen/thumbs/04-park-picnic.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/hannah-cohen/04-park-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/hannah-cohen/thumbs/04-park-picnic.jpg"
        }
      ]
    },
    {
      "id": "nyc_isabella_romano_021",
      "firstName": "Isabella",
      "lastName": "Romano",
      "displayName": "Isabella Romano",
      "gender": "woman",
      "dateOfBirth": "1999-02-07",
      "heightCm": 158,
      "occupation": "Fashion buyer",
      "company": "Mercer & Lane",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A cute route, comfortable shoes, and a group photo where everyone looks good."
        },
        {
          "promptId": "afterEvent",
          "answer": "Making the table split appetizers because commitment is healthy."
        },
        {
          "promptId": "greenFlag",
          "answer": "I hype people up and I am honest about the outfit."
        }
      ],
      "photos": [
        {
          "id": "hero_nolita",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/isabella-romano/01-hero-nolita.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/isabella-romano/thumbs/01-hero-nolita.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/isabella-romano/01-hero-nolita.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/isabella-romano/thumbs/01-hero-nolita.jpg"
        },
        {
          "id": "gallery_mirror",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/isabella-romano/02-gallery-mirror.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/isabella-romano/thumbs/02-gallery-mirror.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/isabella-romano/02-gallery-mirror.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/isabella-romano/thumbs/02-gallery-mirror.jpg"
        },
        {
          "id": "friends_brunch",
          "position": 2,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/isabella-romano/03-friends-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/isabella-romano/thumbs/03-friends-brunch.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/isabella-romano/03-friends-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/isabella-romano/thumbs/03-friends-brunch.jpg"
        },
        {
          "id": "buying_event",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/isabella-romano/04-buying-event.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/isabella-romano/thumbs/04-buying-event.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/isabella-romano/04-buying-event.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/isabella-romano/thumbs/04-buying-event.jpg"
        }
      ]
    },
    {
      "id": "nyc_jordan_ellis_002",
      "firstName": "Jordan",
      "lastName": "Ellis",
      "displayName": "Jordan Ellis",
      "gender": "man",
      "dateOfBirth": "1994-09-04",
      "heightCm": 183,
      "occupation": "Startup operator",
      "company": "Founders Office",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A steady loop, a little friendly trash talk, and one great breakfast spot after."
        },
        {
          "promptId": "afterEvent",
          "answer": "Finding the table with the best people-watching and ordering for the group."
        },
        {
          "promptId": "greenFlag",
          "answer": "I am punctual, I listen closely, and I never leave anyone alone at the back."
        }
      ],
      "photos": [
        {
          "id": "hero_track",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/jordan-ellis/01-hero-track.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/jordan-ellis/thumbs/01-hero-track.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/jordan-ellis/01-hero-track.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/jordan-ellis/thumbs/01-hero-track.jpg"
        },
        {
          "id": "bridge_walk",
          "position": 1,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/jordan-ellis/02-bridge-walk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/jordan-ellis/thumbs/02-bridge-walk.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/jordan-ellis/02-bridge-walk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/jordan-ellis/thumbs/02-bridge-walk.jpg"
        },
        {
          "id": "dinner_window",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/jordan-ellis/03-dinner-window.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/jordan-ellis/thumbs/03-dinner-window.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/jordan-ellis/03-dinner-window.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/jordan-ellis/thumbs/03-dinner-window.jpg"
        },
        {
          "id": "weekend_basketball",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/jordan-ellis/04-weekend-basketball.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/jordan-ellis/thumbs/04-weekend-basketball.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/jordan-ellis/04-weekend-basketball.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/jordan-ellis/thumbs/04-weekend-basketball.jpg"
        }
      ]
    },
    {
      "id": "nyc_liam_oconnor_014",
      "firstName": "Liam",
      "lastName": "O'Connor",
      "displayName": "Liam O'Connor",
      "gender": "man",
      "dateOfBirth": "1992-01-24",
      "heightCm": 184,
      "occupation": "Physical therapist",
      "company": "Union Square PT",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A steady pace, no ego, and breakfast where everyone can sit down."
        },
        {
          "promptId": "afterEvent",
          "answer": "Claiming I will stretch later and then actually doing it."
        },
        {
          "promptId": "greenFlag",
          "answer": "I notice when someone needs the pace to change."
        }
      ],
      "photos": [
        {
          "id": "hero_park_path",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/liam-oconnor/01-hero-park-path.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/liam-oconnor/thumbs/01-hero-park-path.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/liam-oconnor/01-hero-park-path.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/liam-oconnor/thumbs/01-hero-park-path.jpg"
        },
        {
          "id": "morning_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/liam-oconnor/02-morning-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/liam-oconnor/thumbs/02-morning-run.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/liam-oconnor/02-morning-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/liam-oconnor/thumbs/02-morning-run.jpg"
        },
        {
          "id": "prospect_park_day",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/liam-oconnor/03-prospect-park-day.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/liam-oconnor/thumbs/03-prospect-park-day.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/liam-oconnor/03-prospect-park-day.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/liam-oconnor/thumbs/03-prospect-park-day.jpg"
        },
        {
          "id": "brunch_corner",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/liam-oconnor/04-brunch-corner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/liam-oconnor/thumbs/04-brunch-corner.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/liam-oconnor/04-brunch-corner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/liam-oconnor/thumbs/04-brunch-corner.jpg"
        }
      ]
    },
    {
      "id": "nyc_marcus_chen_008",
      "firstName": "Marcus",
      "lastName": "Chen",
      "displayName": "Marcus Chen",
      "gender": "man",
      "dateOfBirth": "1996-10-09",
      "heightCm": 180,
      "occupation": "Music producer",
      "company": "Independent",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Skyline views, a playlist swap, and no one pretending the plan needs to be complicated."
        },
        {
          "promptId": "afterEvent",
          "answer": "Making a shared playlist before everyone forgets the good songs."
        },
        {
          "promptId": "greenFlag",
          "answer": "I can keep the energy light without dodging the real conversation."
        }
      ],
      "photos": [
        {
          "id": "hero_waterfront",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/marcus-chen/01-hero-waterfront.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/marcus-chen/thumbs/01-hero-waterfront.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/marcus-chen/01-hero-waterfront.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/marcus-chen/thumbs/01-hero-waterfront.jpg"
        },
        {
          "id": "pickleball_court",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/marcus-chen/02-pickleball-court.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/marcus-chen/thumbs/02-pickleball-court.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/marcus-chen/02-pickleball-court.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/marcus-chen/thumbs/02-pickleball-court.jpg"
        },
        {
          "id": "studio_booth",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/marcus-chen/03-studio-booth.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/marcus-chen/thumbs/03-studio-booth.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/marcus-chen/03-studio-booth.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/marcus-chen/thumbs/03-studio-booth.jpg"
        },
        {
          "id": "rooftop_sunset",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/marcus-chen/04-rooftop-sunset.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/marcus-chen/thumbs/04-rooftop-sunset.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/marcus-chen/04-rooftop-sunset.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/marcus-chen/thumbs/04-rooftop-sunset.jpg"
        }
      ]
    },
    {
      "id": "nyc_maya_shah_001",
      "firstName": "Maya",
      "lastName": "Shah",
      "displayName": "Maya Shah",
      "gender": "woman",
      "dateOfBirth": "1997-02-11",
      "heightCm": 160,
      "occupation": "Product designer",
      "company": "Independent",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A small group, clean timing, and a cortado while everyone is still glowing from the conversation."
        },
        {
          "promptId": "afterEvent",
          "answer": "Convincing the group to try the bakery I saved three weeks ago."
        },
        {
          "promptId": "greenFlag",
          "answer": "I make plans that actually happen and I bring an extra hair tie."
        }
      ],
      "photos": [
        {
          "id": "hero_portrait",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/maya-shah/01-hero-portrait.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/maya-shah/thumbs/01-hero-portrait.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/maya-shah/01-hero-portrait.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/maya-shah/thumbs/01-hero-portrait.jpg"
        },
        {
          "id": "sidewalk_coffee",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/maya-shah/02-sidewalk-coffee.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/maya-shah/thumbs/02-sidewalk-coffee.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/maya-shah/02-sidewalk-coffee.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/maya-shah/thumbs/02-sidewalk-coffee.jpg"
        },
        {
          "id": "gallery_opening",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/maya-shah/03-gallery-opening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/maya-shah/thumbs/03-gallery-opening.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/maya-shah/03-gallery-opening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/maya-shah/thumbs/03-gallery-opening.jpg"
        },
        {
          "id": "weekend_market",
          "position": 3,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/maya-shah/04-riverside-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/maya-shah/thumbs/04-riverside-run.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/maya-shah/04-riverside-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/maya-shah/thumbs/04-riverside-run.jpg"
        }
      ]
    },
    {
      "id": "nyc_miles_anderson_018",
      "firstName": "Miles",
      "lastName": "Anderson",
      "displayName": "Miles Anderson",
      "gender": "man",
      "dateOfBirth": "1996-02-20",
      "heightCm": 182,
      "occupation": "Documentary filmmaker",
      "company": "Freelance",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "Golden-hour light, a route with a story, and no one checking their phone after."
        },
        {
          "promptId": "afterEvent",
          "answer": "Asking one too many questions because everyone is more interesting than they think."
        },
        {
          "promptId": "greenFlag",
          "answer": "I can make plans feel easy without disappearing into them."
        }
      ],
      "photos": [
        {
          "id": "hero_fort_greene",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/miles-anderson/01-hero-fort-greene.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/miles-anderson/thumbs/01-hero-fort-greene.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/miles-anderson/01-hero-fort-greene.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/miles-anderson/thumbs/01-hero-fort-greene.jpg"
        },
        {
          "id": "studio_edit",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/miles-anderson/02-studio-edit.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/miles-anderson/thumbs/02-studio-edit.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/miles-anderson/02-studio-edit.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/miles-anderson/thumbs/02-studio-edit.jpg"
        },
        {
          "id": "rooftop_film_night",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/miles-anderson/03-rooftop-film-night.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/miles-anderson/thumbs/03-rooftop-film-night.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/miles-anderson/03-rooftop-film-night.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/miles-anderson/thumbs/03-rooftop-film-night.jpg"
        },
        {
          "id": "group_walk_candid",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/miles-anderson/04-group-walk-candid.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/miles-anderson/thumbs/04-group-walk-candid.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/miles-anderson/04-group-walk-candid.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/miles-anderson/thumbs/04-group-walk-candid.jpg"
        }
      ]
    },
    {
      "id": "nyc_nia_okafor_015",
      "firstName": "Nia",
      "lastName": "Okafor",
      "displayName": "Nia Okafor",
      "gender": "woman",
      "dateOfBirth": "1998-09-05",
      "heightCm": 172,
      "occupation": "Climate policy analyst",
      "company": "Civic Futures",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A route with trees, a little city noise, and people who can talk about anything."
        },
        {
          "promptId": "afterEvent",
          "answer": "Convincing everyone the museum cafe is better than it looks."
        },
        {
          "promptId": "greenFlag",
          "answer": "I am calm in chaos and very serious about good questions."
        }
      ],
      "photos": [
        {
          "id": "hero_museum_block",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/nia-okafor/01-hero-museum-block.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/nia-okafor/thumbs/01-hero-museum-block.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/nia-okafor/01-hero-museum-block.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/nia-okafor/thumbs/01-hero-museum-block.jpg"
        },
        {
          "id": "policy_event",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/nia-okafor/02-policy-event.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/nia-okafor/thumbs/02-policy-event.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/nia-okafor/02-policy-event.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/nia-okafor/thumbs/02-policy-event.jpg"
        },
        {
          "id": "friends_brunch",
          "position": 2,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/nia-okafor/03-friends-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/nia-okafor/thumbs/03-friends-brunch.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/nia-okafor/03-friends-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/nia-okafor/thumbs/03-friends-brunch.jpg"
        },
        {
          "id": "museum_afternoon",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/nia-okafor/04-museum-afternoon.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/nia-okafor/thumbs/04-museum-afternoon.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/nia-okafor/04-museum-afternoon.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/nia-okafor/thumbs/04-museum-afternoon.jpg"
        }
      ]
    },
    {
      "id": "nyc_noah_patel_010",
      "firstName": "Noah",
      "lastName": "Patel",
      "displayName": "Noah Patel",
      "gender": "man",
      "dateOfBirth": "1995-07-16",
      "heightCm": 181,
      "occupation": "Product manager",
      "company": "Ledger Labs",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A good route, an on-time start, and a group that turns coffee into a second event."
        },
        {
          "promptId": "afterEvent",
          "answer": "Making the reservation nobody believed we could get."
        },
        {
          "promptId": "greenFlag",
          "answer": "I confirm the plan and still leave room for spontaneity."
        }
      ],
      "photos": [
        {
          "id": "hero_soho",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/noah-patel/01-hero-soho.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/noah-patel/thumbs/01-hero-soho.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/noah-patel/01-hero-soho.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/noah-patel/thumbs/01-hero-soho.jpg"
        },
        {
          "id": "pickleball_after_point",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/noah-patel/02-pickleball-after-point.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/noah-patel/thumbs/02-pickleball-after-point.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/noah-patel/02-pickleball-after-point.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/noah-patel/thumbs/02-pickleball-after-point.jpg"
        },
        {
          "id": "restaurant_counter",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/noah-patel/03-restaurant-counter.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/noah-patel/thumbs/03-restaurant-counter.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/noah-patel/03-restaurant-counter.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/noah-patel/thumbs/03-restaurant-counter.jpg"
        },
        {
          "id": "founder_event",
          "position": 3,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/noah-patel/04-founder-event.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/noah-patel/thumbs/04-founder-event.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/noah-patel/04-founder-event.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/noah-patel/thumbs/04-founder-event.jpg"
        }
      ]
    },
    {
      "id": "nyc_olivia_nguyen_011",
      "firstName": "Olivia",
      "lastName": "Nguyen",
      "displayName": "Olivia Nguyen",
      "gender": "woman",
      "dateOfBirth": "1996-05-08",
      "heightCm": 162,
      "occupation": "UX researcher",
      "company": "Atlas Health",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A route with a view, an easy pace, and somebody who notices the weird storefronts."
        },
        {
          "promptId": "afterEvent",
          "answer": "Finding the market stall with the longest line and deciding it is research."
        },
        {
          "promptId": "greenFlag",
          "answer": "I remember tiny details and use them for good."
        }
      ],
      "photos": [
        {
          "id": "hero_chinatown",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/olivia-nguyen/01-hero-chinatown.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/olivia-nguyen/thumbs/01-hero-chinatown.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/olivia-nguyen/01-hero-chinatown.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/olivia-nguyen/thumbs/01-hero-chinatown.jpg"
        },
        {
          "id": "weekend_market",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/olivia-nguyen/02-weekend-market.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/olivia-nguyen/thumbs/02-weekend-market.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/olivia-nguyen/02-weekend-market.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/olivia-nguyen/thumbs/02-weekend-market.jpg"
        },
        {
          "id": "gallery_wall",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/olivia-nguyen/03-gallery-wall.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/olivia-nguyen/thumbs/03-gallery-wall.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/olivia-nguyen/03-gallery-wall.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/olivia-nguyen/thumbs/03-gallery-wall.jpg"
        },
        {
          "id": "easy_riverside_run",
          "position": 3,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/olivia-nguyen/04-easy-riverside-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/olivia-nguyen/thumbs/04-easy-riverside-run.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/olivia-nguyen/04-easy-riverside-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/olivia-nguyen/thumbs/04-easy-riverside-run.jpg"
        }
      ]
    },
    {
      "id": "nyc_priya_desai_007",
      "firstName": "Priya",
      "lastName": "Desai",
      "displayName": "Priya Desai",
      "gender": "woman",
      "dateOfBirth": "1999-01-27",
      "heightCm": 157,
      "occupation": "Venture associate",
      "company": "Seedline",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A sunrise loop before the inbox gets loud and a group that actually stays for coffee."
        },
        {
          "promptId": "afterEvent",
          "answer": "Pitching a second breakfast like it is a board memo."
        },
        {
          "promptId": "greenFlag",
          "answer": "I make people feel invited without making it a production."
        }
      ],
      "photos": [
        {
          "id": "hero_sunrise",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/priya-desai/01-hero-sunrise.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/priya-desai/thumbs/01-hero-sunrise.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/priya-desai/01-hero-sunrise.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/priya-desai/thumbs/01-hero-sunrise.jpg"
        },
        {
          "id": "coffee_sidewalk",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/priya-desai/02-coffee-sidewalk.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/priya-desai/thumbs/02-coffee-sidewalk.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/priya-desai/02-coffee-sidewalk.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/priya-desai/thumbs/02-coffee-sidewalk.jpg"
        },
        {
          "id": "work_event",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/priya-desai/03-work-event.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/priya-desai/thumbs/03-work-event.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/priya-desai/03-work-event.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/priya-desai/thumbs/03-work-event.jpg"
        },
        {
          "id": "park_picnic",
          "position": 3,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/priya-desai/04-park-picnic.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/priya-desai/thumbs/04-park-picnic.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/priya-desai/04-park-picnic.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/priya-desai/thumbs/04-park-picnic.jpg"
        }
      ]
    },
    {
      "id": "nyc_samir_khan_022",
      "firstName": "Samir",
      "lastName": "Khan",
      "displayName": "Samir Khan",
      "gender": "man",
      "dateOfBirth": "1995-12-18",
      "heightCm": 177,
      "occupation": "Urban planner",
      "company": "CityWorks",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A smart route, one excellent view, and the feeling that the city is on our side."
        },
        {
          "promptId": "afterEvent",
          "answer": "Pointing out a street redesign nobody asked about but everyone ends up debating."
        },
        {
          "promptId": "greenFlag",
          "answer": "I make maps for people, literally and emotionally."
        }
      ],
      "photos": [
        {
          "id": "hero_brooklyn_heights",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/samir-khan/01-hero-brooklyn-heights.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/samir-khan/thumbs/01-hero-brooklyn-heights.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/samir-khan/01-hero-brooklyn-heights.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/samir-khan/thumbs/01-hero-brooklyn-heights.jpg"
        },
        {
          "id": "bridge_run",
          "position": 1,
          "promptId": "proofIRun",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/samir-khan/02-bridge-run.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/samir-khan/thumbs/02-bridge-run.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/samir-khan/02-bridge-run.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/samir-khan/thumbs/02-bridge-run.jpg"
        },
        {
          "id": "coffee_map",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/samir-khan/03-coffee-map.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/samir-khan/thumbs/03-coffee-map.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/samir-khan/03-coffee-map.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/samir-khan/thumbs/03-coffee-map.jpg"
        },
        {
          "id": "hudson_day_trip",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/samir-khan/04-hudson-day-trip.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/samir-khan/thumbs/04-hudson-day-trip.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/samir-khan/04-hudson-day-trip.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/samir-khan/thumbs/04-hudson-day-trip.jpg"
        }
      ]
    },
    {
      "id": "nyc_sofia_martinez_003",
      "firstName": "Sofia",
      "lastName": "Martinez",
      "displayName": "Sofia Martinez",
      "gender": "woman",
      "dateOfBirth": "1998-06-18",
      "heightCm": 165,
      "occupation": "Brand strategist",
      "company": "Studio West",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A scenic plan where nobody is trying too hard but everyone is a little proud after."
        },
        {
          "promptId": "afterEvent",
          "answer": "Taking one chaotic group photo and then finding tacos."
        },
        {
          "promptId": "greenFlag",
          "answer": "I ask follow-up questions and remember the answer."
        }
      ],
      "photos": [
        {
          "id": "hero_pier",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/sofia-martinez/01-hero-pier.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/sofia-martinez/thumbs/01-hero-pier.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/sofia-martinez/01-hero-pier.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/sofia-martinez/thumbs/01-hero-pier.jpg"
        },
        {
          "id": "pickleball_court",
          "position": 1,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/sofia-martinez/02-pickleball-court.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/sofia-martinez/thumbs/02-pickleball-court.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/sofia-martinez/02-pickleball-court.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/sofia-martinez/thumbs/02-pickleball-court.jpg"
        },
        {
          "id": "rooftop_dinner",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/sofia-martinez/03-rooftop-dinner.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/sofia-martinez/thumbs/03-rooftop-dinner.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/sofia-martinez/03-rooftop-dinner.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/sofia-martinez/thumbs/03-rooftop-dinner.jpg"
        },
        {
          "id": "bookstore_weekend",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/sofia-martinez/04-bookstore-weekend.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/sofia-martinez/thumbs/04-bookstore-weekend.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/sofia-martinez/04-bookstore-weekend.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/sofia-martinez/thumbs/04-bookstore-weekend.jpg"
        }
      ]
    },
    {
      "id": "nyc_taylor_reed_023",
      "firstName": "Taylor",
      "lastName": "Reed",
      "displayName": "Taylor Reed",
      "gender": "woman",
      "dateOfBirth": "1997-06-26",
      "heightCm": 174,
      "occupation": "Creative director",
      "company": "Noon House",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A city route with good light and people who can keep a conversation moving."
        },
        {
          "promptId": "afterEvent",
          "answer": "Finding the corner table and turning strangers into a group chat."
        },
        {
          "promptId": "greenFlag",
          "answer": "I know when to lead and when to let things breathe."
        }
      ],
      "photos": [
        {
          "id": "hero_dumbo",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/taylor-reed/01-hero-dumbo.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/taylor-reed/thumbs/01-hero-dumbo.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/taylor-reed/01-hero-dumbo.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/taylor-reed/thumbs/01-hero-dumbo.jpg"
        },
        {
          "id": "friends_brunch",
          "position": 1,
          "promptId": "favoritePeople",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/taylor-reed/02-friends-brunch.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/taylor-reed/thumbs/02-friends-brunch.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/taylor-reed/02-friends-brunch.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/taylor-reed/thumbs/02-friends-brunch.jpg"
        },
        {
          "id": "studio_session",
          "position": 2,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/taylor-reed/03-studio-session.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/taylor-reed/thumbs/03-studio-session.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/taylor-reed/03-studio-session.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/taylor-reed/thumbs/03-studio-session.jpg"
        },
        {
          "id": "museum_evening",
          "position": 3,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/taylor-reed/04-museum-evening.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/taylor-reed/thumbs/04-museum-evening.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/taylor-reed/04-museum-evening.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/taylor-reed/thumbs/04-museum-evening.jpg"
        }
      ]
    },
    {
      "id": "nyc_victor_alvarez_024",
      "firstName": "Victor",
      "lastName": "Alvarez",
      "displayName": "Victor Alvarez",
      "gender": "man",
      "dateOfBirth": "1992-09-29",
      "heightCm": 179,
      "occupation": "Restaurant general manager",
      "company": "East River Hospitality",
      "profilePrompts": [
        {
          "promptId": "perfectRun",
          "answer": "A route that ends where the coffee is strong and the staff knows someone."
        },
        {
          "promptId": "afterEvent",
          "answer": "Making sure nobody leaves hungry."
        },
        {
          "promptId": "greenFlag",
          "answer": "I handle the details and still make it feel easy."
        }
      ],
      "photos": [
        {
          "id": "hero_lower_east_side",
          "position": 0,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/victor-alvarez/01-hero-lower-east-side.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/victor-alvarez/thumbs/01-hero-lower-east-side.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/victor-alvarez/01-hero-lower-east-side.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/victor-alvarez/thumbs/01-hero-lower-east-side.jpg"
        },
        {
          "id": "restaurant_service",
          "position": 1,
          "promptId": "notRunning",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/victor-alvarez/02-restaurant-service.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/victor-alvarez/thumbs/02-restaurant-service.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/victor-alvarez/02-restaurant-service.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/victor-alvarez/thumbs/02-restaurant-service.jpg"
        },
        {
          "id": "jazz_bar",
          "position": 2,
          "promptId": "weekendEnergy",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/victor-alvarez/03-jazz-bar.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/victor-alvarez/thumbs/03-jazz-bar.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/victor-alvarez/03-jazz-bar.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/victor-alvarez/thumbs/03-jazz-bar.jpg"
        },
        {
          "id": "city_steps_weekend",
          "position": 3,
          "promptId": "captionThis",
          "url": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/victor-alvarez/04-city-steps-weekend.jpg",
          "thumbnailUrl": "https://storage.googleapis.com/catch-demo-assets/sales-personas/us-nyc-v1/victor-alvarez/thumbs/04-city-steps-weekend.jpg",
          "storagePath": "demo/sales-personas/us-nyc-v1/victor-alvarez/04-city-steps-weekend.jpg",
          "thumbnailStoragePath": "demo/sales-personas/us-nyc-v1/victor-alvarez/thumbs/04-city-steps-weekend.jpg"
        }
      ]
    }
  ]
};
