<?php

namespace Minilytics;

use \Exception;
use \PDO;

use App\App;
use App\HttpException;
use App\Validator;
use App\DatabaseFromEnv;
use App\ActiveRecord;
use App\Result;
use App\Helpers;
use App\Migration;
use App\View;

/**
 * @todo
 * Engagement -> Time on page or with scrolling? > 10 seconds -> PHP
 * Counts compared to last period
 * Fallback tracking without JS?
 */

$timezoneCountryMap = json_decode('{
	"Africa/Abidjan": "CI: Côte d\'Ivoire",
	"Africa/Accra": "CI: Côte d\'Ivoire",
	"Africa/Bamako": "CI: Côte d\'Ivoire",
	"Africa/Banjul": "CI: Côte d\'Ivoire",
	"Africa/Conakry": "CI: Côte d\'Ivoire",
	"Africa/Dakar": "CI: Côte d\'Ivoire",
	"Africa/Freetown": "CI: Côte d\'Ivoire",
	"Africa/Lome": "CI: Côte d\'Ivoire",
	"Africa/Nouakchott": "CI: Côte d\'Ivoire",
	"Africa/Ouagadougou": "CI: Côte d\'Ivoire",
	"Africa/Timbuktu": "CI: Côte d\'Ivoire",
	"Atlantic/St_Helena": "CI: Côte d\'Ivoire",
	"Africa/Algiers": "DZ: Algeria",
	"Africa/Bissau": "GW: Guinea-Bissau",
	"Africa/Cairo": "EG: Egypt",
	"Egypt": "EG: Egypt",
	"Africa/Casablanca": "MA: Morocco",
	"Africa/Ceuta": "ES: Spain",
	"Africa/El_Aaiun": "EH: Western Sahara",
	"Africa/Johannesburg": "ZA: South Africa",
	"Africa/Maseru": "ZA: South Africa",
	"Africa/Mbabane": "ZA: South Africa",
	"Africa/Juba": "SS: South Sudan",
	"Africa/Khartoum": "SD: Sudan",
	"Africa/Lagos": "NG: Nigeria",
	"Africa/Bangui": "NG: Nigeria",
	"Africa/Brazzaville": "NG: Nigeria",
	"Africa/Douala": "NG: Nigeria",
	"Africa/Kinshasa": "NG: Nigeria",
	"Africa/Libreville": "NG: Nigeria",
	"Africa/Luanda": "NG: Nigeria",
	"Africa/Malabo": "NG: Nigeria",
	"Africa/Niamey": "NG: Nigeria",
	"Africa/Porto-Novo": "NG: Nigeria",
	"Africa/Maputo": "MZ: Mozambique",
	"Africa/Blantyre": "MZ: Mozambique",
	"Africa/Bujumbura": "MZ: Mozambique",
	"Africa/Gaborone": "MZ: Mozambique",
	"Africa/Harare": "MZ: Mozambique",
	"Africa/Kigali": "MZ: Mozambique",
	"Africa/Lubumbashi": "MZ: Mozambique",
	"Africa/Lusaka": "MZ: Mozambique",
	"Africa/Monrovia": "LR: Liberia",
	"Africa/Nairobi": "KE: Kenya",
	"Africa/Addis_Ababa": "KE: Kenya",
	"Africa/Asmara": "KE: Kenya",
	"Africa/Asmera": "KE: Kenya",
	"Africa/Dar_es_Salaam": "KE: Kenya",
	"Africa/Djibouti": "KE: Kenya",
	"Africa/Kampala": "KE: Kenya",
	"Africa/Mogadishu": "KE: Kenya",
	"Indian/Antananarivo": "KE: Kenya",
	"Indian/Comoro": "KE: Kenya",
	"Indian/Mayotte": "KE: Kenya",
	"Africa/Ndjamena": "TD: Chad",
	"Africa/Sao_Tome": "ST: Sao Tome & Principe",
	"Africa/Tripoli": "LY: Libya",
	"Libya": "LY: Libya",
	"Africa/Tunis": "TN: Tunisia",
	"Africa/Windhoek": "NA: Namibia",
	"America/Adak": "US: United States",
	"America/Atka": "US: United States",
	"US/Aleutian": "US: United States",
	"America/Anchorage": "US: United States",
	"US/Alaska": "US: United States",
	"America/Araguaina": "BR: Brazil",
	"America/Argentina/Buenos_Aires": "AR: Argentina",
	"America/Buenos_Aires": "AR: Argentina",
	"America/Argentina/Catamarca": "AR: Argentina",
	"America/Argentina/ComodRivadavia": "AR: Argentina",
	"America/Catamarca": "AR: Argentina",
	"America/Argentina/Cordoba": "AR: Argentina",
	"America/Cordoba": "AR: Argentina",
	"America/Rosario": "AR: Argentina",
	"America/Argentina/Jujuy": "AR: Argentina",
	"America/Jujuy": "AR: Argentina",
	"America/Argentina/La_Rioja": "AR: Argentina",
	"America/Argentina/Mendoza": "AR: Argentina",
	"America/Mendoza": "AR: Argentina",
	"America/Argentina/Rio_Gallegos": "AR: Argentina",
	"America/Argentina/Salta": "AR: Argentina",
	"America/Argentina/San_Juan": "AR: Argentina",
	"America/Argentina/San_Luis": "AR: Argentina",
	"America/Argentina/Tucuman": "AR: Argentina",
	"America/Argentina/Ushuaia": "AR: Argentina",
	"America/Asuncion": "PY: Paraguay",
	"America/Bahia": "BR: Brazil",
	"America/Bahia_Banderas": "MX: Mexico",
	"America/Barbados": "BB: Barbados",
	"America/Belem": "BR: Brazil",
	"America/Belize": "BZ: Belize",
	"America/Boa_Vista": "BR: Brazil",
	"America/Bogota": "CO: Colombia",
	"America/Boise": "US: United States",
	"America/Cambridge_Bay": "CA: Canada",
	"America/Campo_Grande": "BR: Brazil",
	"America/Cancun": "MX: Mexico",
	"America/Caracas": "VE: Venezuela",
	"America/Cayenne": "GF: French Guiana",
	"America/Chicago": "US: United States",
	"US/Central": "US: United States",
	"America/Chihuahua": "MX: Mexico",
	"America/Costa_Rica": "CR: Costa Rica",
	"America/Cuiaba": "BR: Brazil",
	"America/Danmarkshavn": "GL: Greenland",
	"America/Dawson": "CA: Canada",
	"America/Dawson_Creek": "CA: Canada",
	"America/Denver": "US: United States",
	"America/Shiprock": "US: United States",
	"Navajo": "US: United States",
	"US/Mountain": "US: United States",
	"America/Detroit": "US: United States",
	"US/Michigan": "US: United States",
	"America/Edmonton": "CA: Canada",
	"Canada/Mountain": "CA: Canada",
	"America/Eirunepe": "BR: Brazil",
	"America/El_Salvador": "SV: El Salvador",
	"America/Fort_Nelson": "CA: Canada",
	"America/Fortaleza": "BR: Brazil",
	"America/Glace_Bay": "CA: Canada",
	"America/Goose_Bay": "CA: Canada",
	"America/Grand_Turk": "TC: Turks & Caicos Is",
	"America/Guatemala": "GT: Guatemala",
	"America/Guayaquil": "EC: Ecuador",
	"America/Guyana": "GY: Guyana",
	"America/Halifax": "CA: Canada",
	"Canada/Atlantic": "CA: Canada",
	"America/Havana": "CU: Cuba",
	"Cuba": "CU: Cuba",
	"America/Hermosillo": "MX: Mexico",
	"America/Indiana/Indianapolis": "US: United States",
	"America/Fort_Wayne": "US: United States",
	"America/Indianapolis": "US: United States",
	"US/East-Indiana": "US: United States",
	"America/Indiana/Knox": "US: United States",
	"America/Knox_IN": "US: United States",
	"US/Indiana-Starke": "US: United States",
	"America/Indiana/Marengo": "US: United States",
	"America/Indiana/Petersburg": "US: United States",
	"America/Indiana/Tell_City": "US: United States",
	"America/Indiana/Vevay": "US: United States",
	"America/Indiana/Vincennes": "US: United States",
	"America/Indiana/Winamac": "US: United States",
	"America/Inuvik": "CA: Canada",
	"America/Iqaluit": "CA: Canada",
	"America/Jamaica": "JM: Jamaica",
	"Jamaica": "JM: Jamaica",
	"America/Juneau": "US: United States",
	"America/Kentucky/Louisville": "US: United States",
	"America/Louisville": "US: United States",
	"America/Kentucky/Monticello": "US: United States",
	"America/La_Paz": "BO: Bolivia",
	"America/Lima": "PE: Peru",
	"America/Los_Angeles": "US: United States",
	"US/Pacific": "US: United States",
	"America/Maceio": "BR: Brazil",
	"America/Managua": "NI: Nicaragua",
	"America/Manaus": "BR: Brazil",
	"Brazil/West": "BR: Brazil",
	"America/Martinique": "MQ: Martinique",
	"America/Matamoros": "MX: Mexico",
	"America/Mazatlan": "MX: Mexico",
	"Mexico/BajaSur": "MX: Mexico",
	"America/Menominee": "US: United States",
	"America/Merida": "MX: Mexico",
	"America/Metlakatla": "US: United States",
	"America/Mexico_City": "MX: Mexico",
	"Mexico/General": "MX: Mexico",
	"America/Miquelon": "PM: St Pierre & Miquelon",
	"America/Moncton": "CA: Canada",
	"America/Monterrey": "MX: Mexico",
	"America/Montevideo": "UY: Uruguay",
	"America/New_York": "US: United States",
	"US/Eastern": "US: United States",
	"America/Nipigon": "CA: Canada",
	"America/Nome": "US: United States",
	"America/Noronha": "BR: Brazil",
	"Brazil/DeNoronha": "BR: Brazil",
	"America/North_Dakota/Beulah": "US: United States",
	"America/North_Dakota/Center": "US: United States",
	"America/North_Dakota/New_Salem": "US: United States",
	"America/Nuuk": "GL: Greenland",
	"America/Godthab": "GL: Greenland",
	"America/Ojinaga": "MX: Mexico",
	"America/Panama": "PA: Panama",
	"America/Atikokan": "PA: Panama",
	"America/Cayman": "PA: Panama",
	"America/Coral_Harbour": "PA: Panama",
	"America/Pangnirtung": "CA: Canada",
	"America/Paramaribo": "SR: Suriname",
	"America/Phoenix": "US: United States",
	"America/Creston": "US: United States",
	"US/Arizona": "US: United States",
	"America/Port-au-Prince": "HT: Haiti",
	"America/Porto_Velho": "BR: Brazil",
	"America/Puerto_Rico": "PR: Puerto Rico",
	"America/Anguilla": "PR: Puerto Rico",
	"America/Antigua": "PR: Puerto Rico",
	"America/Aruba": "PR: Puerto Rico",
	"America/Blanc-Sablon": "PR: Puerto Rico",
	"America/Curacao": "PR: Puerto Rico",
	"America/Dominica": "PR: Puerto Rico",
	"America/Grenada": "PR: Puerto Rico",
	"America/Guadeloupe": "PR: Puerto Rico",
	"America/Kralendijk": "PR: Puerto Rico",
	"America/Lower_Princes": "PR: Puerto Rico",
	"America/Marigot": "PR: Puerto Rico",
	"America/Montserrat": "PR: Puerto Rico",
	"America/Port_of_Spain": "PR: Puerto Rico",
	"America/St_Barthelemy": "PR: Puerto Rico",
	"America/St_Kitts": "PR: Puerto Rico",
	"America/St_Lucia": "PR: Puerto Rico",
	"America/St_Thomas": "PR: Puerto Rico",
	"America/St_Vincent": "PR: Puerto Rico",
	"America/Tortola": "PR: Puerto Rico",
	"America/Virgin": "PR: Puerto Rico",
	"America/Punta_Arenas": "CL: Chile",
	"America/Rainy_River": "CA: Canada",
	"America/Rankin_Inlet": "CA: Canada",
	"America/Recife": "BR: Brazil",
	"America/Regina": "CA: Canada",
	"Canada/Saskatchewan": "CA: Canada",
	"America/Resolute": "CA: Canada",
	"America/Rio_Branco": "BR: Brazil",
	"America/Porto_Acre": "BR: Brazil",
	"Brazil/Acre": "BR: Brazil",
	"America/Santarem": "BR: Brazil",
	"America/Santiago": "CL: Chile",
	"Chile/Continental": "CL: Chile",
	"America/Santo_Domingo": "DO: Dominican Republic",
	"America/Sao_Paulo": "BR: Brazil",
	"Brazil/East": "BR: Brazil",
	"America/Scoresbysund": "GL: Greenland",
	"America/Sitka": "US: United States",
	"America/St_Johns": "CA: Canada",
	"Canada/Newfoundland": "CA: Canada",
	"America/Swift_Current": "CA: Canada",
	"America/Tegucigalpa": "HN: Honduras",
	"America/Thule": "GL: Greenland",
	"America/Thunder_Bay": "CA: Canada",
	"America/Tijuana": "MX: Mexico",
	"America/Ensenada": "MX: Mexico",
	"America/Santa_Isabel": "MX: Mexico",
	"Mexico/BajaNorte": "MX: Mexico",
	"America/Toronto": "CA: Canada",
	"America/Montreal": "CA: Canada",
	"America/Nassau": "CA: Canada",
	"Canada/Eastern": "CA: Canada",
	"America/Vancouver": "CA: Canada",
	"Canada/Pacific": "CA: Canada",
	"America/Whitehorse": "CA: Canada",
	"Canada/Yukon": "CA: Canada",
	"America/Winnipeg": "CA: Canada",
	"Canada/Central": "CA: Canada",
	"America/Yakutat": "US: United States",
	"America/Yellowknife": "CA: Canada",
	"Antarctica/Casey": "AQ: Antarctica",
	"Antarctica/Davis": "AQ: Antarctica",
	"Antarctica/Macquarie": "AU: Australia",
	"Antarctica/Mawson": "AQ: Antarctica",
	"Antarctica/Palmer": "AQ: Antarctica",
	"Antarctica/Rothera": "AQ: Antarctica",
	"Antarctica/Troll": "AQ: Antarctica",
	"Antarctica/Vostok": "AQ: Antarctica",
	"Asia/Almaty": "KZ: Kazakhstan",
	"Asia/Amman": "JO: Jordan",
	"Asia/Anadyr": "RU: Russia",
	"Asia/Aqtau": "KZ: Kazakhstan",
	"Asia/Aqtobe": "KZ: Kazakhstan",
	"Asia/Ashgabat": "TM: Turkmenistan",
	"Asia/Ashkhabad": "TM: Turkmenistan",
	"Asia/Atyrau": "KZ: Kazakhstan",
	"Asia/Baghdad": "IQ: Iraq",
	"Asia/Baku": "AZ: Azerbaijan",
	"Asia/Bangkok": "TH: Thailand",
	"Asia/Phnom_Penh": "TH: Thailand",
	"Asia/Vientiane": "TH: Thailand",
	"Asia/Barnaul": "RU: Russia",
	"Asia/Beirut": "LB: Lebanon",
	"Asia/Bishkek": "KG: Kyrgyzstan",
	"Asia/Brunei": "BN: Brunei",
	"Asia/Chita": "RU: Russia",
	"Asia/Choibalsan": "MN: Mongolia",
	"Asia/Colombo": "LK: Sri Lanka",
	"Asia/Damascus": "SY: Syria",
	"Asia/Dhaka": "BD: Bangladesh",
	"Asia/Dacca": "BD: Bangladesh",
	"Asia/Dili": "TL: East Timor",
	"Asia/Dubai": "AE: United Arab Emirates",
	"Asia/Muscat": "AE: United Arab Emirates",
	"Asia/Dushanbe": "TJ: Tajikistan",
	"Asia/Famagusta": "CY: Cyprus",
	"Asia/Gaza": "PS: Palestine",
	"Asia/Hebron": "PS: Palestine",
	"Asia/Ho_Chi_Minh": "VN: Vietnam",
	"Asia/Saigon": "VN: Vietnam",
	"Asia/Hong_Kong": "HK: Hong Kong",
	"Hongkong": "HK: Hong Kong",
	"Asia/Hovd": "MN: Mongolia",
	"Asia/Irkutsk": "RU: Russia",
	"Asia/Jakarta": "ID: Indonesia",
	"Asia/Jayapura": "ID: Indonesia",
	"Asia/Jerusalem": "IL: Israel",
	"Asia/Tel_Aviv": "IL: Israel",
	"Israel": "IL: Israel",
	"Asia/Kabul": "AF: Afghanistan",
	"Asia/Kamchatka": "RU: Russia",
	"Asia/Karachi": "PK: Pakistan",
	"Asia/Kathmandu": "NP: Nepal",
	"Asia/Katmandu": "NP: Nepal",
	"Asia/Khandyga": "RU: Russia",
	"Asia/Kolkata": "IN: India",
	"Asia/Calcutta": "IN: India",
	"Asia/Krasnoyarsk": "RU: Russia",
	"Asia/Kuala_Lumpur": "MY: Malaysia",
	"Asia/Kuching": "MY: Malaysia",
	"Asia/Macau": "MO: Macau",
	"Asia/Macao": "MO: Macau",
	"Asia/Magadan": "RU: Russia",
	"Asia/Makassar": "ID: Indonesia",
	"Asia/Ujung_Pandang": "ID: Indonesia",
	"Asia/Manila": "PH: Philippines",
	"Asia/Nicosia": "CY: Cyprus",
	"Europe/Nicosia": "CY: Cyprus",
	"Asia/Novokuznetsk": "RU: Russia",
	"Asia/Novosibirsk": "RU: Russia",
	"Asia/Omsk": "RU: Russia",
	"Asia/Oral": "KZ: Kazakhstan",
	"Asia/Pontianak": "ID: Indonesia",
	"Asia/Pyongyang": "KP: Korea (North)",
	"Asia/Qatar": "QA: Qatar",
	"Asia/Bahrain": "QA: Qatar",
	"Asia/Qostanay": "KZ: Kazakhstan",
	"Asia/Qyzylorda": "KZ: Kazakhstan",
	"Asia/Riyadh": "SA: Saudi Arabia",
	"Antarctica/Syowa": "SA: Saudi Arabia",
	"Asia/Aden": "SA: Saudi Arabia",
	"Asia/Kuwait": "SA: Saudi Arabia",
	"Asia/Sakhalin": "RU: Russia",
	"Asia/Samarkand": "UZ: Uzbekistan",
	"Asia/Seoul": "KR: Korea (South)",
	"ROK": "KR: Korea (South)",
	"Asia/Shanghai": "CN: China",
	"Asia/Chongqing": "CN: China",
	"Asia/Chungking": "CN: China",
	"Asia/Harbin": "CN: China",
	"PRC": "CN: China",
	"Asia/Singapore": "SG: Singapore",
	"Singapore": "SG: Singapore",
	"Asia/Srednekolymsk": "RU: Russia",
	"Asia/Taipei": "TW: Taiwan",
	"ROC": "TW: Taiwan",
	"Asia/Tashkent": "UZ: Uzbekistan",
	"Asia/Tbilisi": "GE: Georgia",
	"Asia/Tehran": "IR: Iran",
	"Iran": "IR: Iran",
	"Asia/Thimphu": "BT: Bhutan",
	"Asia/Thimbu": "BT: Bhutan",
	"Asia/Tokyo": "JP: Japan",
	"Japan": "JP: Japan",
	"Asia/Tomsk": "RU: Russia",
	"Asia/Ulaanbaatar": "MN: Mongolia",
	"Asia/Ulan_Bator": "MN: Mongolia",
	"Asia/Urumqi": "CN: China",
	"Asia/Kashgar": "CN: China",
	"Asia/Ust-Nera": "RU: Russia",
	"Asia/Vladivostok": "RU: Russia",
	"Asia/Yakutsk": "RU: Russia",
	"Asia/Yangon": "MM: Myanmar (Burma)",
	"Asia/Rangoon": "MM: Myanmar (Burma)",
	"Asia/Yekaterinburg": "RU: Russia",
	"Asia/Yerevan": "AM: Armenia",
	"Atlantic/Azores": "PT: Portugal",
	"Atlantic/Bermuda": "BM: Bermuda",
	"Atlantic/Canary": "ES: Spain",
	"Atlantic/Cape_Verde": "CV: Cape Verde",
	"Atlantic/Faroe": "FO: Faroe Islands",
	"Atlantic/Faeroe": "FO: Faroe Islands",
	"Atlantic/Madeira": "PT: Portugal",
	"Atlantic/Reykjavik": "IS: Iceland",
	"Iceland": "IS: Iceland",
	"Atlantic/South_Georgia": "GS: South Georgia & the South Sandwich Islands",
	"Atlantic/Stanley": "FK: Falkland Islands",
	"Australia/Adelaide": "AU: Australia",
	"Australia/South": "AU: Australia",
	"Australia/Brisbane": "AU: Australia",
	"Australia/Queensland": "AU: Australia",
	"Australia/Broken_Hill": "AU: Australia",
	"Australia/Yancowinna": "AU: Australia",
	"Australia/Darwin": "AU: Australia",
	"Australia/North": "AU: Australia",
	"Australia/Eucla": "AU: Australia",
	"Australia/Hobart": "AU: Australia",
	"Australia/Currie": "AU: Australia",
	"Australia/Tasmania": "AU: Australia",
	"Australia/Lindeman": "AU: Australia",
	"Australia/Lord_Howe": "AU: Australia",
	"Australia/LHI": "AU: Australia",
	"Australia/Melbourne": "AU: Australia",
	"Australia/Victoria": "AU: Australia",
	"Australia/Perth": "AU: Australia",
	"Australia/West": "AU: Australia",
	"Australia/Sydney": "AU: Australia",
	"Australia/ACT": "AU: Australia",
	"Australia/Canberra": "AU: Australia",
	"Australia/NSW": "AU: Australia",
	"Europe/Amsterdam": "NL: Netherlands",
	"Europe/Andorra": "AD: Andorra",
	"Europe/Astrakhan": "RU: Russia",
	"Europe/Athens": "GR: Greece",
	"Europe/Belgrade": "RS: Serbia",
	"Europe/Ljubljana": "RS: Serbia",
	"Europe/Podgorica": "RS: Serbia",
	"Europe/Sarajevo": "RS: Serbia",
	"Europe/Skopje": "RS: Serbia",
	"Europe/Zagreb": "RS: Serbia",
	"Europe/Berlin": "DE: Germany",
	"Europe/Brussels": "BE: Belgium",
	"Europe/Bucharest": "RO: Romania",
	"Europe/Budapest": "HU: Hungary",
	"Europe/Chisinau": "MD: Moldova",
	"Europe/Tiraspol": "MD: Moldova",
	"Europe/Copenhagen": "DK: Denmark",
	"Europe/Dublin": "IE: Ireland",
	"Eire": "IE: Ireland",
	"Europe/Gibraltar": "GI: Gibraltar",
	"Europe/Helsinki": "FI: Finland",
	"Europe/Mariehamn": "FI: Finland",
	"Europe/Istanbul": "TR: Turkey",
	"Asia/Istanbul": "TR: Turkey",
	"Turkey": "TR: Turkey",
	"Europe/Kaliningrad": "RU: Russia",
	"Europe/Kiev": "UA: Ukraine",
	"Europe/Kirov": "RU: Russia",
	"Europe/Lisbon": "PT: Portugal",
	"Portugal": "PT: Portugal",
	"Europe/London": "GB: Britain (UK)",
	"Europe/Belfast": "GB: Britain (UK)",
	"Europe/Guernsey": "GB: Britain (UK)",
	"Europe/Isle_of_Man": "GB: Britain (UK)",
	"Europe/Jersey": "GB: Britain (UK)",
	"GB": "GB: Britain (UK)",
	"GB-Eire": "GB: Britain (UK)",
	"Europe/Luxembourg": "LU: Luxembourg",
	"Europe/Madrid": "ES: Spain",
	"Europe/Malta": "MT: Malta",
	"Europe/Minsk": "BY: Belarus",
	"Europe/Monaco": "MC: Monaco",
	"Europe/Moscow": "RU: Russia",
	"W-SU": "RU: Russia",
	"Europe/Oslo": "NO: Norway",
	"Arctic/Longyearbyen": "NO: Norway",
	"Atlantic/Jan_Mayen": "NO: Norway",
	"Europe/Paris": "FR: France",
	"Europe/Prague": "CZ: Czech Republic",
	"Europe/Bratislava": "CZ: Czech Republic",
	"Europe/Riga": "LV: Latvia",
	"Europe/Rome": "IT: Italy",
	"Europe/San_Marino": "IT: Italy",
	"Europe/Vatican": "IT: Italy",
	"Europe/Samara": "RU: Russia",
	"Europe/Saratov": "RU: Russia",
	"Europe/Simferopol": "UA: Ukraine",
	"Europe/Sofia": "BG: Bulgaria",
	"Europe/Stockholm": "SE: Sweden",
	"Europe/Tallinn": "EE: Estonia",
	"Europe/Tirane": "AL: Albania",
	"Europe/Ulyanovsk": "RU: Russia",
	"Europe/Uzhgorod": "UA: Ukraine",
	"Europe/Vienna": "AT: Austria",
	"Europe/Vilnius": "LT: Lithuania",
	"Europe/Volgograd": "RU: Russia",
	"Europe/Warsaw": "PL: Poland",
	"Poland": "PL: Poland",
	"Europe/Zaporozhye": "UA: Ukraine",
	"Europe/Zurich": "CH: Switzerland",
	"Europe/Busingen": "CH: Switzerland",
	"Europe/Vaduz": "CH: Switzerland",
	"Indian/Chagos": "IO: British Indian Ocean Territory",
	"Indian/Christmas": "CX: Christmas Island",
	"Indian/Cocos": "CC: Cocos (Keeling) Islands",
	"Indian/Kerguelen": "TF: French Southern & Antarctic Lands",
	"Indian/Mahe": "SC: Seychelles",
	"Indian/Maldives": "MV: Maldives",
	"Indian/Mauritius": "MU: Mauritius",
	"Indian/Reunion": "RE: Réunion",
	"Pacific/Apia": "WS: Samoa (western)",
	"Pacific/Auckland": "NZ: New Zealand",
	"Antarctica/McMurdo": "NZ: New Zealand",
	"Antarctica/South_Pole": "NZ: New Zealand",
	"NZ": "NZ: New Zealand",
	"Pacific/Bougainville": "PG: Papua New Guinea",
	"Pacific/Chatham": "NZ: New Zealand",
	"NZ-CHAT": "NZ: New Zealand",
	"Pacific/Chuuk": "FM: Micronesia",
	"Pacific/Truk": "FM: Micronesia",
	"Pacific/Yap": "FM: Micronesia",
	"Pacific/Easter": "CL: Chile",
	"Chile/EasterIsland": "CL: Chile",
	"Pacific/Efate": "VU: Vanuatu",
	"Pacific/Fakaofo": "TK: Tokelau",
	"Pacific/Fiji": "FJ: Fiji",
	"Pacific/Funafuti": "TV: Tuvalu",
	"Pacific/Galapagos": "EC: Ecuador",
	"Pacific/Gambier": "PF: French Polynesia",
	"Pacific/Guadalcanal": "SB: Solomon Islands",
	"Pacific/Guam": "GU: Guam",
	"Pacific/Saipan": "GU: Guam",
	"Pacific/Honolulu": "US: United States",
	"Pacific/Johnston": "US: United States",
	"US/Hawaii": "US: United States",
	"Pacific/Kanton": "KI: Kiribati",
	"Pacific/Enderbury": "KI: Kiribati",
	"Pacific/Kiritimati": "KI: Kiribati",
	"Pacific/Kosrae": "FM: Micronesia",
	"Pacific/Kwajalein": "MH: Marshall Islands",
	"Kwajalein": "MH: Marshall Islands",
	"Pacific/Majuro": "MH: Marshall Islands",
	"Pacific/Marquesas": "PF: French Polynesia",
	"Pacific/Nauru": "NR: Nauru",
	"Pacific/Niue": "NU: Niue",
	"Pacific/Norfolk": "NF: Norfolk Island",
	"Pacific/Noumea": "NC: New Caledonia",
	"Pacific/Pago_Pago": "AS: Samoa (American)",
	"Pacific/Midway": "AS: Samoa (American)",
	"Pacific/Samoa": "AS: Samoa (American)",
	"US/Samoa": "AS: Samoa (American)",
	"Pacific/Palau": "PW: Palau",
	"Pacific/Pitcairn": "PN: Pitcairn",
	"Pacific/Pohnpei": "FM: Micronesia",
	"Pacific/Ponape": "FM: Micronesia",
	"Pacific/Port_Moresby": "PG: Papua New Guinea",
	"Antarctica/DumontDUrville": "PG: Papua New Guinea",
	"Pacific/Rarotonga": "CK: Cook Islands",
	"Pacific/Tahiti": "PF: French Polynesia",
	"Pacific/Tarawa": "KI: Kiribati",
	"Pacific/Tongatapu": "TO: Tonga",
	"Pacific/Wake": "UM: US minor outlying islands",
	"Pacific/Wallis": "WF: Wallis & Futuna"
}', true);

$db = (new DatabaseFromEnv())->getDatabase();
ActiveRecord::setDatabase($db);

$app->options('minilytics-visit', function () use ($app) {
	return;
});

$app->post('minilytics-visit', function () use ($app) {
	$json = json_decode($app->getBody());

	if (
		!isset($json->siteId)
		|| !isset($json->path)
		|| !isset($json->unique)
		|| !isset($json->touch)
		|| !isset($json->deviceWidth)
		|| !isset($json->deviceHeight)
	) {
		throw new HttpException('Bad request, one or more parameters are missing.', 400);
	}

	foreach ($json as $key => $value) {
		if (!is_string($value)) continue;
		if (!trim($value)) throw new HttpException('Bad request, one or more parameters are empty.', 400);
	}

	$config = $app->getValue('minilyticsConfig');

	if (!$config->isSiteIdValid($json->siteId)) {
		return new Result(Result::generateArray(
			RESULT::INVALID,
			'Bad request, site ID is invalid.',
		), 400);
	}

	$siteIds = $config->getSiteIds();

	$validator = new Validator();
	$visit = new Visit();
	$visit->setTable($json->siteId . '_visits');
	$visit->useConstraints($validator, ['site_ids' => $siteIds]);

	$visit->siteId = $json->siteId;
	$visit->path = $json->path;
	$visit->unique = $json->unique;
	$visit->referrer = $json->referrer ?? null;
	$visit->referrerPath = $json->referrerPath ?? null;
	$visit->timezone = $json->timezone ?? null;;
	$visit->browserName = $json->browserName ?? null;
	$visit->browserVersion = isset($json->browserVersion) ? intval($json->browserVersion) : null;
	$visit->os = $json->os ?? null;
	$visit->touch = $json->touch;
	$visit->deviceWidth = $json->deviceWidth;
	$visit->deviceHeight = $json->deviceHeight;
	$visit->utmSource = $json->utm->source ?? null;
	$visit->utmMedium = $json->utm->medium ?? null;
	$visit->utmCampaign = $json->utm->campaign ?? null;
	$visit->utmTerm = $json->utm->term ?? null;
	$visit->utmContent = $json->utm->content ?? null;
	$visit->guid = generateGloballyUniqueIdentifier();
	$saved = $visit->save();

	if (!$saved) {
		return new Result(Result::generateArray(
			RESULT::INVALID,
			'Bad request, one or more parameters are invalid.',
			$visit->getErrors(),
		), 400);
	}

	return [
		'guid' => $visit->guid,
	];
});

$app->post('minilytics-visit-update', function () use ($app) {
	$json = json_decode($app->getBody());

	if (
		!isset($json->siteId)
		|| !isset($json->guid)
		|| !isset($json->duration)
	) {
		throw new HttpException('Bad request, one or more parameters are missing.', 400);
	}

	$config = $app->getValue('minilyticsConfig');

	if (!$config->isSiteIdValid($json->siteId)) {
		return new Result(Result::generateArray(
			RESULT::INVALID,
			'Bad request, site ID is invalid.',
		), 400);
	}

	$visit = Visit::findOne('guid', $json->guid, $json->siteId . '_visits');
	$visit->duration = $json->duration;
	$saved = $visit->save();

	if (!$saved) {
		return new Result(Result::generateArray(
			RESULT::INVALID,
			'Bad request.',
			$visit->getErrors(),
		), 400);
	}

	return Result::generateArray();
});

$app->post('minilytics-event', function () use ($app) {
	$json = json_decode($app->getBody());

	if (
		!isset($json->siteId)
		|| !isset($json->name)
	) {
		throw new HttpException('Bad request, one or more parameters are missing.', 400);
	}

	$config = $app->getValue('minilyticsConfig');

	if (!$config->isSiteIdValid($json->siteId)) {
		return new Result(Result::generateArray(
			RESULT::INVALID,
			'Bad request, site ID is invalid.',
		), 400);
	}

	$validator = new Validator();
	$event = new Event();
	$event->setTable($json->siteId . '_events');
	$event->useConstraints($validator);

	$event->siteId = $json->siteId;
	$event->name = $json->name;
	$event->context = isset($json->context) ? $json->context : null;
	$saved = $event->save();

	if (!$saved) {
		return new Result(Result::generateArray(
			RESULT::INVALID,
			'Bad request, one or more parameters are invalid.',
			$event->getErrors(),
		), 400);
	}

	return Result::generateArray();
});

$app->get('minilytics-admin', function () use ($app, $db) {
	$config = $app->getValue('minilyticsConfig');
	$sites = $config->getSites();
	
	$migrations = [];
	foreach ($sites as $site) {
		array_push($migrations, function (PDO $db) use ($site) {
			$queryCheckVisits = 'SELECT 1 FROM `' . $site->id . '_visits`';
			$queryVisits = 'CREATE TABLE `' . $site->id . '_visits` (
				`id`              BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
				`guid`            CHAR(36) NOT NULL,
				`site_id`         VARCHAR(128) NOT NULL,
				`path`            VARCHAR(1024) NOT NULL,
				`unique`          BIT NOT NULL,
				`referrer`        TEXT NULL,
				`referrer_path`   TEXT NULL,
				`timezone`        TEXT NULL,
				`browser_name`    VARCHAR(64) NULL,
				`browser_version` INT(5) UNSIGNED NULL,
				`os`              VARCHAR(255) NULL,
				`touch`           BIT NOT NULL,
				`device_width`    INT(5) UNSIGNED NOT NULL,
				`device_height`   INT(5) UNSIGNED NOT NULL,
				`utm_source`      VARCHAR(255) NULL,
				`utm_medium`      VARCHAR(255) NULL,
				`utm_campaign`    VARCHAR(255) NULL,
				`utm_term`        VARCHAR(255) NULL,
				`utm_content`     VARCHAR(255) NULL,
				`duration`        MEDIUMINT UNSIGNED NULL,
				`timestamp`       TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			) CHARACTER SET utf8 COLLATE utf8_general_ci';

			$queryCheckEvents = 'SELECT 1 FROM `' . $site->id . '_events`';
			$queryEvents = 'CREATE TABLE `' . $site->id . '_events` (
				`id`        BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
				`site_id`   VARCHAR(128) NOT NULL,
				`name`      VARCHAR(128) NOT NULL,
				`context`   TEXT NULL,
				`timestamp` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			) CHARACTER SET utf8 COLLATE utf8_general_ci';

			try {
				$db->query($queryCheckVisits);
			} catch (Exception $e) {
				// Table not found, create it.
				$db->exec($queryVisits);
			}

			try {
				$db->query($queryCheckEvents);
			} catch (Exception $e) {
				// Table not found, create it.
				$db->exec($queryEvents);
			}
		});
	}

	$migration = new Migration($db);
	$migration->run($migrations, 'migrations_minilytics');

	htmlStart();

	?>
		<header class="container">
			<h1>Minilytics - Sites</a></h1>
		</header>

		<main class="container">
			<?php if (count($sites) == 0) : ?>
			<p>No sites created.</p>
			<? else : ?>
			<ul>
				<?php foreach ($sites as $site) : ?>
				<li>
					<a href="<?= $app->generateRouteByName('site', [$site->id]) ?>">
						<?= $site->name ?> (<?= $site->id ?>)
					</a>
				</li>
				<?php endforeach; ?>
			</ul>
			<?php endif; ?>
		</main>
	<?php

	return htmlEnd();
});

$app->get('minilytics-admin&site={any}', function (string $id) use ($app) {
	$site = checkSiteId($app, $id);

	htmlStart();

	?>
		<header class="container">
			<h1><a href="<?= $site->baseUrl ?>" target="_blank"><?= $site->name ?></a></h1>
		</header>

		<main class="container">
			<form id="filter-form" method="GET" action="" class="filter-form js-filter-form" hidden>
				<p>
					<label for="filter-date-from">From</label>
					<input type="date" id="filter-date-from" name="filter-date-from" class="js-filter-date-from" required />
				</p>
				<p>
					<label for="filter-date-to">To</label>
					<input type="date" id="filter-date-to" name="filter-date-to" class="js-filter-date-to" required />
				</p>
				<p>
					<input type="submit" value="Apply" />
				</p>
			</form>

			<div class="loader js-loader">Loading ...</div>
			<div class="root js-root" data-site-id="<?= $site->id ?>" hidden></div>
		</main>

		<script src="minilytics.js"></script>
	<?php

	return htmlEnd();
})->withName('site');

$app->get('minilytics-data&site={any}', function (string $id) use ($app) {
	checkSiteId($app, $id);

	$visitRecords = Visit::findCurrentVisitors($id . '_visits');
	$result = [
		'unique' => 0,
		'visits' => 0,
	];

	foreach ($visitRecords as $visit) {
		if ($visit->unique) $result['unique']++;
		$result['visits']++;
	}

	return $result;
});

$app->post('minilytics-data&site={any}', function (string $id) use ($app, $timezoneCountryMap) {
	$site = checkSiteId($app, $id);
	$json = json_decode($app->getBody());

	if (!isset($json->dateFrom) || !isset($json->dateTo)) {
		throw new HttpException('Bad request, one or more parameters are missing.', 400);
	}

	$filters = [];
	if (isset($json->filters)) {
		if (isset($json->browserName))    $filters['browser_name'] = $json->browser_name;
		if (isset($json->browserVersion)) $filters['browser_version'] = $json->browser_version;
	}

	$visitRecord = new Visit();
	$visitRecord->setTable($id . '_visits');
	$visits = $visitRecord->findEntries($json->dateFrom, $json->dateTo, $filters);

	$eventRecord = new Event();
	$eventRecord->setTable($id . '_events');
	$events = $eventRecord->findEntries($json->dateFrom, $json->dateTo, $filters);

	$result = [
		'visits' => null,
		'visitsPerDay' => [],
		'pages' => [],
		'devices' => [],
		'touch' => null,
		'countries' => [],
		'browserNames' => [],
		'browserVersions' => [],
		'referrers' => [],
		'utmSources' => [],
		'utmMediums' => [],
		'utmCampaigns' => [],
		'utmTerms' => [],
		'utmContents' => [],
		'events' => [],
	];

	$dates = getAllDates($json->dateFrom, $json->dateTo);
	foreach ($dates as $date) {
		$visitResultPerDay = new VisitResult();
		$visitResultPerDay->name = $date;
		$visitResultPerDay->visits = 0;
		$visitResultPerDay->unique = 0;
		$visitResultPerDay->context = [
			'visitsPerHour' => array_fill(0, 24, 0),
			'uniquePerHour' => array_fill(0, 24, 0),
		];

		$result['visitsPerDay'][] = $visitResultPerDay;
	}

	$duration = 0;
	$result['visits'] = new VisitResult();
	$result['visits']->visits = 0;
	$result['visits']->unique = 0;
	$result['visits']->context = $duration;

	$result['touch'] = new VisitResult();
	$result['touch']->visits = 0;
	$result['touch']->unique = 0;

	foreach ($visits as $visit) {
		// Visits
		$result['visits']->visits++;
		if ($visit->unique) $result['visits']->unique++;

		// Visits per day
		$date = date('Y-m-d', strtotime($visit->timestamp));
		$hour = intval(date('H', strtotime($visit->timestamp)));

		// Visits per Day
		$visitDateKey = array_search($date, array_column($result['visitsPerDay'], 'name'));
		if ($visitDateKey !== false) {
			$result['visitsPerDay'][$visitDateKey]->visits++;
			if ($visit->unique) $result['visitsPerDay'][$visitDateKey]->unique++;

			$result['visitsPerDay'][$visitDateKey]->context['visitsPerHour'][$hour]++;
			if ($visit->unique) $result['visitsPerDay'][$visitDateKey]->context['uniquePerHour'][$hour]++;
		}

		// Pages
		$pageNameKey = array_search($visit->path, array_column($result['pages'], 'name'));
		if ($pageNameKey !== false) {
			$result['pages'][$pageNameKey]->visits++;
			if ($visit->unique) $result['pages'][$pageNameKey]->unique++;
			if ($visit->duration) {
				$result['pages'][$pageNameKey]->context[] = $visit->duration;
				$duration += $visit->duration;
			}
		} else {
			$visitResult = new VisitResult();
			$visitResult->name = $visit->path;
			$visitResult->visits = 1;
			$visitResult->unique = $visit->unique;
			$visitResult->context = [];
			if ($visit->duration) {
				$visitResult->context[] = $visit->duration;
				$duration += $visit->duration;
			}

			$result['pages'][] = $visitResult;
		}

		// Devices
		$device = null;
		if ($visit->deviceWidth > 1440) {
			$device = 'Desktop';
			$context = '> 1440px';
		} elseif ($visit->deviceWidth >= 992 && $visit->deviceWidth <= 1440) {
			$device = 'Laptop';
			$context = '>= 992px; <= 1440px';
		} elseif ($visit->deviceWidth >= 576 && $visit->deviceWidth <= 992) {
			$device = 'Tablet';
			$context = '>= 576px; <= 992px';
		} elseif ($visit->deviceWidth < 576) {
			$device = 'Mobile';
			$context = '< 576px';
		}
		$deviceNameKey = array_search($device, array_column($result['devices'], 'name'));
		if ($deviceNameKey !== false) {
			$result['devices'][$deviceNameKey]->visits++;
			if ($visit->unique) $result['devices'][$deviceNameKey]->unique++;
		} else {
			$visitResult = new VisitResult();
			$visitResult->name = $device;
			$visitResult->visits = 1;
			$visitResult->unique = $visit->unique;
			$visitResult->context = $context;

			$result['devices'][] = $visitResult;
		}

		// Touch
		if ($visit->touch) {
			$result['touch']->visits++;
			if ($visit->unique) $result['touch']->unique++;
		}

		// Countries
		if ($visit->timezone) {
			$countryName = isset($timezoneCountryMap[$visit->timezone]) ? explode(': ', $timezoneCountryMap[$visit->timezone])[1] : $visit->timezone;
			$countryCode = isset($timezoneCountryMap[$visit->timezone]) ? explode(': ', $timezoneCountryMap[$visit->timezone])[0] : null;
			$countryNameKey = array_search($countryName, array_column($result['countries'], 'name'));
			if ($countryNameKey !== false) {
				$result['countries'][$countryNameKey]->visits++;
				if ($visit->unique) $result['countries'][$countryNameKey]->unique++;
			} else {
				$visitResult = new VisitResult();
				$visitResult->name = $countryName;
				$visitResult->visits = 1;
				$visitResult->unique = $visit->unique;
				$visitResult->context = $countryCode;

				$result['countries'][] = $visitResult;
			}
		}

		// Browser Name
		$browserName = $visit->browserName;
		if (!$browserName) $browserName = 'Unknown';
		$browserNameKey = array_search($browserName, array_column($result['browserNames'], 'name'));
		if ($browserNameKey !== false) {
			$result['browserNames'][$browserNameKey]->visits++;
			if ($visit->unique) $result['browserNames'][$browserNameKey]->unique++;
		} else {
			$visitResult = new VisitResult();
			$visitResult->name = $browserName;
			$visitResult->visits = 1;
			$visitResult->unique = $visit->unique;

			$result['browserNames'][] = $visitResult;
		}

		// Browser Name with Version
	$browserVersion = $visit->browserVersion;
	if (!$browserVersion) $browserVersion = '0';
		$browserVersionFull = $browserName . ' ' . $visit->browserVersion;
		$browserVersionKey = array_search($browserVersionFull, array_column($result['browserVersions'], 'name'));
		if ($browserVersionKey !== false) {
			$result['browserVersions'][$browserVersionKey]->visits++;
			if ($visit->unique) $result['browserVersions'][$browserVersionKey]->unique++;
		} else {
			$visitResult = new VisitResult();
			$visitResult->name = $browserVersionFull;
			$visitResult->visits = 1;
			$visitResult->unique = $visit->unique;

			$result['browserVersions'][] = $visitResult;
		}

		// Referrers
		if ($visit->referrer && strpos($visit->referrer, $site->domain) === false) {
			$referrerKey = array_search($visit->referrer, array_column($result['referrers'], 'name'));
			if ($referrerKey !== false) {
				$result['referrers'][$referrerKey]->visits++;
				if ($visit->unique) $result['referrers'][$referrerKey]->unique++;
				// if ($visit->duration) $result['referrers'][$referrerKey]->context[] = $visit->duration;
			} else {
				$visitResult = new VisitResult();
				$visitResult->name = $visit->referrer;
				$visitResult->visits = 1;
				$visitResult->unique = $visit->unique;
				// $visitResult->context = [];
				// if ($visit->duration) $visitResult->context[] = $visit->duration;

				$result['referrers'][] = $visitResult;
			}
		}

		// UTM sources
		if ($visit->utmSource) {
			$utmSourceKey = array_search($visit->utmSource, array_column($result['utmSources'], 'name'));
			if ($utmSourceKey !== false) {
				$result['utmSources'][$utmSourceKey]->visits++;
				if ($visit->unique) $result['utmSources'][$utmSourceKey]->unique++;
				// if ($visit->duration) $result['utmSources'][$utmSourceKey]->context[] = $visit->duration;
			} else {
				$visitResult = new VisitResult();
				$visitResult->name = $visit->utmSource;
				$visitResult->visits = 1;
				$visitResult->unique = $visit->unique;
				// $visitResult->context = [];
				// if ($visit->duration) $visitResult->context[] = $visit->duration;

				$result['utmSources'][] = $visitResult;
			}
		}

		// UTM Mediums
		if ($visit->utmMedium) {
			$utmMediumKey = array_search($visit->utmMedium, array_column($result['utmMedium'], 'name'));
			if ($utmMediumKey !== false) {
				$result['utmMediums'][$utmMediumKey]->visits++;
				if ($visit->unique) $result['utmMediums'][$utmMediumKey]->unique++;
			} else {
				$visitResult = new VisitResult();
				$visitResult->name = $visit->utmMedium;
				$visitResult->visits = 1;
				$visitResult->unique = $visit->unique;

				$result['utmMediums'][] = $visitResult;
			}
		}

		// UTM Campaigns
		if ($visit->utmCampaign) {
			$utmCampaignKey = array_search($visit->utmCampaign, array_column($result['utmCampaigns'], 'name'));
			if ($utmCampaignKey !== false) {
				$result['utmCampaigns'][$utmCampaignKey]->visits++;
				if ($visit->unique) $result['utmCampaigns'][$utmCampaignKey]->unique++;
			} else {
				$visitResult = new VisitResult();
				$visitResult->name = $visit->utmCampaign;
				$visitResult->visits = 1;
				$visitResult->unique = $visit->unique;

				$result['utmCampaigns'][] = $visitResult;
			}
		}

		// UTM Terms
		if ($visit->utmTerm) {
			$utmTermKey = array_search($visit->utmTerm, array_column($result['utmTerms'], 'name'));
			if ($utmTermKey !== false) {
				$result['utmTerms'][$utmTermKey]->visits++;
				if ($visit->unique) $result['utmTerms'][$utmTermKey]->unique++;
			} else {
				$visitResult = new VisitResult();
				$visitResult->name = $visit->utmTerm;
				$visitResult->visits = 1;
				$visitResult->unique = $visit->unique;

				$result['utmTerms'][] = $visitResult;
			}
		}

		// UTM Contents
		if ($visit->utmContents) {
			$utmContentKey = array_search($visit->utmContents, array_column($result['utmContents'], 'name'));
			if ($utmContentKey !== false) {
				$result['utmContents'][$utmContentKey]->visits++;
				if ($visit->unique) $result['utmContents'][$utmContentKey]->unique++;
			} else {
				$visitResult = new VisitResult();
				$visitResult->name = $visit->utmContents;
				$visitResult->visits = 1;
				$visitResult->unique = $visit->unique;

				$result['utmContents'][] = $visitResult;
			}
		}
	}

	if ($result['visits']->visits > 0) {
		$result['visits']->context = ($duration / $result['visits']->visits) / 1000;
	}	

	foreach ($events as $event) {
		$eventKey = array_search($event->name, array_column($result['events'], 'name'));
		if ($eventKey !== false) {
			$result['events'][$eventKey]->total++;

			$found = false;
			foreach ($result['events'][$eventKey]->contexts as $context) {
				if ($context->name == $event->context) {
					$context->total++;
					$found = true;
					break;
				}
			}

			if (!$found) {
				$eventContextResult = new EventContextResult();
				$eventContextResult->name = $event->context;
				$eventContextResult->total = 1;

				$result['events'][$eventKey]->contexts[] = $eventContextResult;
			}
		} else {
			$eventResult = new EventResult();
			$eventResult->name = $event->name;
			$eventResult->total = 1;

			$eventContextResult = new EventContextResult();
			$eventContextResult->name = $event->context;
			$eventContextResult->total = 1;

			$eventResult->contexts = [];
			$eventResult->contexts[] = $eventContextResult;

			$result['events'][] = $eventResult;
		}
	}

	return $result;
});

function checkSiteId(App $app, string $id) {
	if (!$app->getValue('minilyticsConfig')) throw new Exception('Minilytics Config missing.');

	$sites = $app->getValue('minilyticsConfig')->getSites();
	$found = false;

	foreach ($sites as $site) {
		if ($site->id == $id) {
			$found = $site;
			break;
		}
	}

	if (!$found) throw new Exception('Site not valid.');

	return $site;
}

function getAllDates(string $dateFrom, string $dateTo) {
	$dates = [];
	$dates[] = $dateFrom;

	$current = $dateFrom;

	while ($current < $dateTo) {
		$current = date('Y-m-d', strtotime($current . ' + 1 day'));
		$dates[] = $current;
	}

	return $dates;
}

class VisitResult {

	public string $name;
	public int $visits;
	public int $unique;
	public mixed $context;

}

class EventResult {

	public string $name;
	public string $total;
	public array $contexts;

}

class EventContextResult {

	public string $name;
	public string $total;

}

trait Entries {

	public function findEntries(string $dateFrom, string $dateTo, ?array $filters = []) {
		$tableName = $this->getTable();
		$query = "SELECT * FROM `$tableName` WHERE `timestamp` BETWEEN ? AND ?";
		$parameters = [];

		$parameters[] = $dateFrom . ' 00:00:00';
		$parameters[] = $dateTo . ' 23:59:59';

		foreach ($filters as $filterKey => $filterValue) {
			$query .= " AND `$filterKey` = ?";
			$parameters[] = $filterValue;
		}

		$statement = $this->getDatabase()->prepare($query);

		try {
			$statement->execute($parameters);
		} catch (PDOException $e) {
			die($e->getMessage());
		}

		return $statement->fetchAll(PDO::FETCH_CLASS, static::class);
	}

}

class Visit extends ActiveRecord {

	use Entries;

	protected string $table = 'visits';

	protected array $fields = [
		'site_id',
		'guid',
		'path',
		'unique',
		'referrer',
		'referrer_path',
		'timezone',
		'browser_name',
		'browser_version',
		'os',
		'touch',
		'device_width',
		'device_height',
		'utm_source',
		'utm_medium',
		'utm_campaign',
		'utm_term',
		'utm_content',
		'duration',
		'timestamp',
	];

	public function __set(string $name, mixed $value) {
		if ($name === 'unique') {
			$this->data['unique'] = filter_var($value, FILTER_VALIDATE_BOOLEAN);
			return;
		}

		$this->set($name, $value);
	}

	protected function constraints(Validator $validator, ?array $context = null) {
		if (isset($context['site_ids'])) {
			$validator->field('siteId', $this->siteId)->required()->inList(...$context['site_ids']);
		} else {
			$validator->field('siteId', $this->siteId)->required();
		}

		$validator->field('guid', $this->path)->required();
		$validator->field('path', $this->path)->required();
		$validator->field('unique', $this->unique)->required()->boolean();
		$validator->field('referrer', $this->referrer)->domain();
		$validator->field('touch', $this->touch)->boolean();
		$validator->field('deviceWidth', $this->deviceWidth)->required()->number();
		$validator->field('deviceHeight', $this->deviceHeight)->required()->number();
		$validator->field('duration', $this->duration)->number();
	}

	public static function findCurrentVisitors(?string $tableName = null) {
		$entity = new static();
		if ($tableName) $entity->setTable($tableName);

		$table = $entity->getTable();
		$primaryKey = $entity->getPrimaryKey();

		$query = "SELECT * FROM `$table` WHERE `timestamp` > :dt";

		$dt = date('Y-m-d H:i:s', strtotime('-3 minutes'));

		$statement = $entity->getDatabase()->prepare($query);
		$statement->bindParam(':dt', $dt);

		try {
			$statement->execute();
		} catch (PDOException $e) {
			die($e->getMessage());
		}

		return $statement->fetchAll(PDO::FETCH_CLASS, static::class);
	}

}

class Event extends ActiveRecord {

	use Entries;

	protected string $table = 'events';

	protected array $fields = [
		'site_id',
		'name',
		'context',
		'timestamp',
	];

	protected function constraints(Validator $validator, ?array $context = null) {
		$validator->field('siteId', $this->siteId)->required();
		$validator->field('name', $this->name)->required();
	}

}

class Config {

	private array $sites = [];
	private string $migrationFile = '.migrations_minilytics';

	public function addSite(Site $site) {
		$this->sites[] = $site;
	}

	public function getSites(): array {
		return $this->sites;
	}

	public function getSiteIds(): array {
		return array_column($this->sites, 'id');
	}

	public function isSiteIdValid(string $siteId): bool {
		$siteIds = $this->getSiteIds();

		if (!in_array($siteId, $siteIds)) return false;

		return true;
	}

}

class Site {

	public string $id;
	public string $name;
	public string $domain;
	public string $baseUrl;
	public array $users;

	public function __construct(string $id, string $name, string $domainName, string $baseUrl, array $users) {
		$this->id = $id;
		$this->name = $name;
		$this->domain = $domainName;
		$this->baseUrl = $baseUrl;
		$this->users = $users;
	}

}

function htmlStart() {
	ob_start();

?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />

		<title>Minilytics</title>

		<meta name="description" content="Website analytics and statistics" />
		<meta name="robots" content="noindex, nofollow" />

		<meta name="viewport" content="width=device-width, initial-scale=1" />

		<style>
			:root {
				--color-background: #ffffff;
				--color-text: #444444;
				--color-text--lighter: #666666;
				--color-text--i: #f7f7f7;
				--font-stack: 'Helvetica Neue', Helvetica, Arial, sans-serif;
				--color-primary: #009fd4;
				--color-primary-rgb: 0, 159, 212;
			}

			:focus {
				outline: 2px solid var(--color-primary);
				outline-offset: 2px;
			}

			html,
			body {
				margin: 0;
				padding: 0;

				background-color: var(--color-background);


				color: var(--color-text);
				font-family: var(--font-stack);
				font-size: 1em;
				line-height: 1.625;
			}

			.container {
				max-width: 960px;
				margin-right: auto;
				margin-left: auto;
			}

			header {
				margin-bottom: 2.25rem;
				padding: 1rem 1rem 0;
				box-sizing: border-box;
			}

			main {
				padding: 1rem 1rem 2rem;
				box-sizing: border-box;
			}

			footer {
				padding: 0 1rem 3rem;
				box-sizing: border-box;

				color: var(--color-text--lighter);
				text-align: center;
			}

			h1,
			h2,
			h3,
			p,
			dl,
			div {
				margin-top: 0;
				margin-bottom: 1rem;
			}

			h1 {
				margin: 0;
			}

			h2 {
				font-size: 1.125rem;
			}

			a,
			a:link,
			a:visited {
				color: var(--color-primary);
				text-decoration: underline;
			}

			a:focus,
			a:hover,
			a:active {
				color: var(--color-primary);
			}

			h1 a,
			h1 a:link {
				text-decoration: none;
			}

			button,
			input[type="submit"] {
				padding: 0.25rem 0.5rem;
				background-color: rgba(var(--color-primary-rgb), 0.05);
				border: 2px solid var(--color-primary);
				border-radius: 3px;
				cursor: pointer;
				-webkit-appearance: button;

				color: var(--color-primary);
				font-family: inherit;
				font-size: inherit;
			}

			button:hover {
				background-color: rgba(var(--color-primary-rgb), 0.1);
			}

			.loader {
				display: flex;
				align-items: center;
				justify-content: center;
				min-height: 125px;
			}

			.loader[hidden] {
				display: none;
			}

			.filter-form {
				display: flex;
				flex-direction: column;
				
				margin-bottom: 1.5rem;
			}

			.filter-form p {
				margin: 0;
				margin-bottom: 1rem;
			}

			.filter-form p:last-of-type {
				margin-bottom: 0;
			}

			.filter-form label {
				display: inline-block;
				width: 3rem;
				color: var(--color-text--lighter);
				font-size: 0.875rem;
			}

			.filter-form input[type="date"] {
				padding: 0.25rem;
				box-sizing: border-box;

				border: 1px solid var(--color-text);
				border-radius: 0;
			}

			@media only screen and (min-width: 480px) {
				.filter-form {
					flex-direction: row;
					align-items: center;
				}

				.filter-form p {
					margin-right: 1rem;
					margin-bottom: 0;
				}

				.filter-form p:last-of-type {
					margin-right: 0;
				}

				.filter-form label {
					display: inline;
				}
			}

			article {
				min-height: 445px;
				box-sizing: border-box;

				padding: 1.25rem 1.25rem 1.5rem;
				box-shadow: 0px 7px 29px 0px rgba(100, 100, 111, 0.2);
			}

			article h2 {
				float: left;

				margin-right: 1rem;
			}

			article button {
				display: block;
				margin: 1rem auto 0;

				border: none;
			}

			.table-container {
				overflow-y: scroll;
			}

			.details .table-container {
				overflow-y: unset;
			}

			table {
				width: 100%;

				border-collapse: collapse;
				/*table-layout: fixed;*/

				text-align: right;
			}

			table th {
				/*width: 5%;*/
				padding-bottom: 0.35rem;

				color: var(--color-text--lighter);
				font-size: 0.875rem;
			}

			table tr {
				display: flex;
				width: 100%;
			}

			table tr > * {
				min-width: 60px;
				max-width: 80px;
			}

			table tr > *:first-child {
				flex: 1 1 auto;
				max-width: none;
			}

			table tr > td:first-child {
				position: relative;
			}

			table tr > td:first-child .text-truncate {
				position: absolute;

				max-width: 100%;
				overflow: hidden;

				text-overflow: ellipsis;
				white-space: nowrap;
			}

			table td {
				padding: 0.25rem 0.25rem 0.25rem 0.125rem;
				box-sizing: border-box;
			}

			table td small {
				display: inline-block;
				min-width: 48px;
				margin-right: -0.35rem;
				padding-left: 0.25rem;

				color: var(--color-text--lighter);
			}

			table th:first-child,
			table td:first-child {
				/*width: auto;*/

				text-align: left;
			}

			table table {
				width: calc(100% - 1.5rem);
				margin-left: 1.5rem;
				margin-bottom: 0.5rem;
			}

			.event-goal-row td {
				border-bottom: 1px solid #cccccc;
			}

			.devices-touch {
				margin-top: 1rem;

				color: var(--color-text--lighter);
				font-size: 0.875rem;
			}

			.details {
				display: grid;
				grid-template-columns: 1fr;
				grid-gap: 1.5rem;
				box-sizing: border-box;
			}

			.overview {
				min-height: auto;
				margin-bottom: 1.5rem;
			}

			.overview h3 {
				color: var(--color-text--lighter);
				margin-bottom: 0.25rem;

				font-size: 0.875rem;
				font-weight: bold;
				text-transform: uppercase;
				white-space: nowrap;
			}

			.overview p {
				font-size: 2.5rem;
				font-weight: bold;
			}

			.overview__stats {
				display: grid;
				grid-template-columns: 1fr 1fr;
				grid-gap: 1.5rem;
				box-sizing: border-box;

				text-align: center;
			}

			@media only screen and (min-width: 768px) {
				.overview__stats {
					grid-template-columns: 1fr 1fr 1fr 1fr;
				}

				.details {
					grid-template-columns: 1fr 1fr;
				}
			}

			.chart-container {
				position: relative;
			}

			.chart {
				position: relative;

				display: block;
				max-width: 100%;
				height: auto;
			}

			.chart__grid {
				stroke: #cccccc;
				stroke-dasharray: 0;
				stroke-width: 1;
			}

			.chart__lines {
				stroke: #dddddd;
			}

			.chart__labels {
				transform: translateX(-5px);
				font-size: 13px;
				dominant-baseline: mathematical;
			}

			.chart__labels--x {
				text-anchor: middle;
			}

			.chart__labels--x text:first-child {
				text-anchor: start;
			}

			.chart__labels--x text:last-child {
				text-anchor: end;
			}

			.chart__labels--y {
				text-anchor: end;
			}

			.chart__labels--y text:last-child {
				dominant-baseline: hanging;
			}

			.chart-label-title {
				font-weight: bold;
				text-transform: uppercase;
				font-size: 12px;
				fill: black;
			}

			.chart #polyline-gradient {
				--color-stop-top: rgba(var(--color-primary-rgb), 0.5);
				--color-stop-bottom: rgba(255, 255, 255, 0.25);
			}

			.chart__polyline {
				stroke: var(--color-primary);
			}

			.chart__polyline--gradient {
				stroke: none;
				fill: url('#polyline-gradient') transparent;
			}

			.chart__dots {
				fill: var(--color-primary);
			}

			.chart__dots .chart-dot-handle {
				fill: transparent;
				cursor: pointer;
			}

			.chart-tooltip {
				position: absolute;

				min-width: 4rem;
				padding: 0.5rem 0.75rem;

				background-color: var(--color-text);
				border-radius: 3px;

				color: var(--color-text--i);
				font-size: 0.9rem;
				line-height: 1.25rem;
				white-space: nowrap;
			}

			.chart-tooltip::after {
				position: absolute;
				bottom: -10px;
				left: 50%;

				content: '';
				display: block;
				width: 0;
				height: 0;

				border: 5px solid;
				border-color: var(--color-text) transparent transparent; transparent;
				transform: translateX(-50%);
			}

			.offscreen {
				position: absolute;
				left: -1000em;
			}

			.screen-reader-text {
				position: absolute;

				width: 1px;
				height: 1px;
				margin: -1px;
				padding: 0;
				overflow: hidden;

				border: 0;
				clip-path: inset(50%);

				white-space: nowrap;
			}

			.screen-reader-text--focusable:active,
			.screen-reader-text--focusable:focus {
				position: static;

				width: auto;
				height: auto;
				margin: 0;
				overflow: visible;

				clip-path: none;

				white-space: inherit;
			}

			bhdzllr-tabs {
				font-size: 0.875rem;
				text-align: right;
			}

			bhdzllr-tabs > button {
				display: inline-block;
				margin: 0.35rem 0.35rem 0;
				padding: 0;
				padding-bottom: 1px;

				background: none;
				border: none;
				border-bottom: 1px solid currentColor;
				border-radius: 0;
				cursor: pointer;

				color: var(--color-text--lighter);
				text-align: left;
			}

			bhdzllr-tabs > button:hover {
				background-color: transparent;
			}

			bhdzllr-tabs > button:last-of-type {
				margin-right: 0;
				padding-right: 0;
			}

			bhdzllr-tabs > button[selected] {
				border-bottom: 3px solid var(--color-primary);

				color: var(--color-primary);
			}

			bhdzllr-tabs section {
				clear: left;

				margin-top: 1rem;

				text-align: left;
			}

			.dm-overlay {
				margin-bottom: 0;
			}

			.dm-dialog {
				padding: 1rem 1.5rem 1.5rem;
				box-sizing: border-box;
			}

			.dm-dialog h1 {
				margin: 0 0 1.25rem;
				border-bottom: 1px solid #cccccc;
			}

			.dm-dialog table td {
				padding: 0.55rem 0.5rem 0.55rem 0.25rem;
			}

			.dm-dialog table tr > * {
				min-width: 90px;
				max-width: 120px;
			}

			.dm-dialog table tr > *:first-child {
				max-width: none;
			}

			.dm-dialog table tr:nth-child(odd) {
				background-color: #f1f1f1;
			}

			.dm-dialog table thead tr:first-child {
				background-color: transparent;
			}
		</style>
	</head>
	<body>
<?php
}

function htmlEnd() {
?>
		<footer class="container">
			Made by <a href="https://www.bhdzllr.com/">@bhdzllr</a>
		</footer>
	</body>
</html>
<?php
	return ob_get_clean();
}

function generateGloballyUniqueIdentifier() {
	if (function_exists('com_create_guid') === true) {
		return trim(com_create_guid(), '{}');
	}

	return sprintf('%04X%04X-%04X-%04X-%04X-%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
}
