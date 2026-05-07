// Country/timezone utilities for chat components

// Alpha-3 → Alpha-2 for the subset that Intl.DisplayNames doesn't accept directly
export const ALPHA3_TO_ALPHA2: Record<string, string> = {
    AFG:'AF',AGO:'AO',ALB:'AL',AND:'AD',ARE:'AE',ARG:'AR',ARM:'AM',AUS:'AU',AUT:'AT',AZE:'AZ',
    BDI:'BI',BEL:'BE',BEN:'BJ',BFA:'BF',BGD:'BD',BGR:'BG',BHR:'BH',BHS:'BS',BIH:'BA',BLR:'BY',
    BLZ:'BZ',BOL:'BO',BRA:'BR',BRB:'BB',BRN:'BN',BTN:'BT',BWA:'BW',CAF:'CF',CAN:'CA',CHE:'CH',
    CHL:'CL',CHN:'CN',CIV:'CI',CMR:'CM',COD:'CD',COG:'CG',COL:'CO',COM:'KM',CPV:'CV',CRI:'CR',
    CUB:'CU',CYP:'CY',CZE:'CZ',DEU:'DE',DJI:'DJ',DNK:'DK',DOM:'DO',DZA:'DZ',ECU:'EC',EGY:'EG',
    ERI:'ER',ESP:'ES',EST:'EE',ETH:'ET',FIN:'FI',FJI:'FJ',FRA:'FR',FSM:'FM',GAB:'GA',GBR:'GB',
    GEO:'GE',GHA:'GH',GIN:'GN',GMB:'GM',GNB:'GW',GNQ:'GQ',GRC:'GR',GTM:'GT',GUY:'GY',HND:'HN',
    HRV:'HR',HTI:'HT',HUN:'HU',IDN:'ID',IND:'IN',IRL:'IE',IRN:'IR',IRQ:'IQ',ISL:'IS',ISR:'IL',
    ITA:'IT',JAM:'JM',JOR:'JO',JPN:'JP',KAZ:'KZ',KEN:'KE',KGZ:'KG',KHM:'KH',KIR:'KI',KOR:'KR',
    KWT:'KW',LAO:'LA',LBN:'LB',LBR:'LR',LBY:'LY',LCA:'LC',LIE:'LI',LKA:'LK',LSO:'LS',LTU:'LT',
    LUX:'LU',LVA:'LV',MAR:'MA',MDA:'MD',MDG:'MG',MDV:'MV',MEX:'MX',MKD:'MK',MLI:'ML',MLT:'MT',
    MMR:'MM',MNE:'ME',MNG:'MN',MOZ:'MZ',MRT:'MR',MUS:'MU',MWI:'MW',MYS:'MY',NAM:'NA',NER:'NE',
    NGA:'NG',NIC:'NI',NLD:'NL',NOR:'NO',NPL:'NP',NRU:'NR',NZL:'NZ',OMN:'OM',PAK:'PK',PAN:'PA',
    PER:'PE',PHL:'PH',PLW:'PW',PNG:'PG',POL:'PL',PRT:'PT',PRY:'PY',PSE:'PS',QAT:'QA',ROU:'RO',
    RUS:'RU',RWA:'RW',SAU:'SA',SDN:'SD',SEN:'SN',SGP:'SG',SLB:'SB',SLE:'SL',SLV:'SV',SMR:'SM',
    SOM:'SO',SRB:'RS',SSD:'SS',STP:'ST',SUR:'SR',SVK:'SK',SVN:'SI',SWE:'SE',SWZ:'SZ',SYC:'SC',
    SYR:'SY',TCD:'TD',TGO:'TG',THA:'TH',TJK:'TJ',TKM:'TM',TLS:'TL',TON:'TO',TTO:'TT',TUN:'TN',
    TUR:'TR',TUV:'TV',TWN:'TW',TZA:'TZ',UGA:'UG',UKR:'UA',URY:'UY',USA:'US',UZB:'UZ',VCT:'VC',
    VEN:'VE',VNM:'VN',VUT:'VU',WSM:'WS',XKX:'XK',YEM:'YE',ZAF:'ZA',ZMB:'ZM',ZWE:'ZW',
};

// Country alpha-2 → representative IANA timezone
export const COUNTRY_TIMEZONE: Record<string, string> = {
    // Africa
    GH:'Africa/Accra', NG:'Africa/Lagos', SN:'Africa/Dakar', CI:'Africa/Abidjan',
    CM:'Africa/Douala', BJ:'Africa/Porto-Novo', BF:'Africa/Ouagadougou', GN:'Africa/Conakry',
    TG:'Africa/Lome', ML:'Africa/Bamako', NE:'Africa/Niamey', MR:'Africa/Nouakchott',
    GM:'Africa/Banjul', SL:'Africa/Freetown', LR:'Africa/Monrovia', GW:'Africa/Bissau',
    CV:'Atlantic/Cape_Verde', ST:'Africa/Sao_Tome', GQ:'Africa/Malabo', GA:'Africa/Libreville',
    CG:'Africa/Brazzaville', CD:'Africa/Kinshasa', AO:'Africa/Luanda', ZM:'Africa/Lusaka',
    ZW:'Africa/Harare', BW:'Africa/Gaborone', NA:'Africa/Windhoek', MZ:'Africa/Maputo',
    TZ:'Africa/Dar_es_Salaam', KE:'Africa/Nairobi', UG:'Africa/Kampala', RW:'Africa/Kigali',
    BI:'Africa/Bujumbura', ET:'Africa/Addis_Ababa', ER:'Africa/Asmara', SO:'Africa/Mogadishu',
    DJ:'Africa/Djibouti', SD:'Africa/Khartoum', SS:'Africa/Juba', MW:'Africa/Blantyre',
    ZA:'Africa/Johannesburg', LS:'Africa/Maseru', SZ:'Africa/Mbabane', MG:'Indian/Antananarivo',
    MU:'Indian/Mauritius', SC:'Indian/Mahe', KM:'Indian/Comoro', EG:'Africa/Cairo',
    LY:'Africa/Tripoli', TN:'Africa/Tunis', DZ:'Africa/Algiers', MA:'Africa/Casablanca',
    // Europe
    GB:'Europe/London', IE:'Europe/Dublin', FR:'Europe/Paris', DE:'Europe/Berlin',
    IT:'Europe/Rome', ES:'Europe/Madrid', PT:'Europe/Lisbon', NL:'Europe/Amsterdam',
    BE:'Europe/Brussels', LU:'Europe/Luxembourg', CH:'Europe/Zurich', AT:'Europe/Vienna',
    PL:'Europe/Warsaw', CZ:'Europe/Prague', SK:'Europe/Bratislava', HU:'Europe/Budapest',
    RO:'Europe/Bucharest', BG:'Europe/Sofia', GR:'Europe/Athens', HR:'Europe/Zagreb',
    RS:'Europe/Belgrade', SI:'Europe/Ljubljana', BA:'Europe/Sarajevo', MK:'Europe/Skopje',
    AL:'Europe/Tirane', ME:'Europe/Podgorica', SE:'Europe/Stockholm', NO:'Europe/Oslo',
    DK:'Europe/Copenhagen', FI:'Europe/Helsinki', IS:'Atlantic/Reykjavik',
    EE:'Europe/Tallinn', LV:'Europe/Riga', LT:'Europe/Vilnius', BY:'Europe/Minsk',
    UA:'Europe/Kiev', MD:'Europe/Chisinau', RU:'Europe/Moscow', TR:'Europe/Istanbul',
    CY:'Asia/Nicosia', MT:'Europe/Malta', XK:'Europe/Belgrade',
    // Americas
    US:'America/New_York', CA:'America/Toronto', MX:'America/Mexico_City',
    BR:'America/Sao_Paulo', AR:'America/Argentina/Buenos_Aires', CL:'America/Santiago',
    CO:'America/Bogota', VE:'America/Caracas', PE:'America/Lima', EC:'America/Guayaquil',
    BO:'America/La_Paz', PY:'America/Asuncion', UY:'America/Montevideo', GY:'America/Guyana',
    SR:'America/Paramaribo', HT:'America/Port-au-Prince', DO:'America/Santo_Domingo',
    JM:'America/Jamaica', TT:'America/Port_of_Spain', BB:'America/Barbados',
    CU:'America/Havana', GT:'America/Guatemala', SV:'America/El_Salvador',
    HN:'America/Tegucigalpa', NI:'America/Managua', CR:'America/Costa_Rica',
    PA:'America/Panama',
    // Middle East
    AE:'Asia/Dubai', SA:'Asia/Riyadh', QA:'Asia/Qatar', KW:'Asia/Kuwait',
    BH:'Asia/Bahrain', OM:'Asia/Muscat', YE:'Asia/Aden', IQ:'Asia/Baghdad',
    IR:'Asia/Tehran', IL:'Asia/Jerusalem', JO:'Asia/Amman', LB:'Asia/Beirut',
    SY:'Asia/Damascus', PS:'Asia/Gaza',
    // Asia
    IN:'Asia/Kolkata', PK:'Asia/Karachi', BD:'Asia/Dhaka', LK:'Asia/Colombo',
    NP:'Asia/Kathmandu', BT:'Asia/Thimphu', MM:'Asia/Rangoon', TH:'Asia/Bangkok',
    VN:'Asia/Ho_Chi_Minh', KH:'Asia/Phnom_Penh', LA:'Asia/Vientiane', MY:'Asia/Kuala_Lumpur',
    SG:'Asia/Singapore', ID:'Asia/Jakarta', PH:'Asia/Manila', CN:'Asia/Shanghai',
    JP:'Asia/Tokyo', KR:'Asia/Seoul', TW:'Asia/Taipei', MN:'Asia/Ulaanbaatar',
    KZ:'Asia/Almaty', UZ:'Asia/Tashkent', TM:'Asia/Ashgabat', TJ:'Asia/Dushanbe',
    KG:'Asia/Bishkek', AF:'Asia/Kabul',
    // Oceania
    AU:'Australia/Sydney', NZ:'Pacific/Auckland', PG:'Pacific/Port_Moresby',
    FJ:'Pacific/Fiji', WS:'Pacific/Apia',
};

// Countries that span multiple timezones — badge is suppressed for these
// to avoid showing incorrect "good time" indicators
export const MULTI_TIMEZONE_COUNTRIES = new Set(['US','CA','RU','AU','BR','ID','MX','KZ']);

const _regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const _fmtCache = new Map<string, Intl.DateTimeFormat>();

function _getFmt(timeZone: string): Intl.DateTimeFormat {
    let fmt = _fmtCache.get(timeZone);
    if (!fmt) {
        fmt = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone, timeZoneName: 'short',
        });
        _fmtCache.set(timeZone, fmt);
    }
    return fmt;
}

export function normalizeToAlpha2(code: string): string {
    const upper = code.trim().toUpperCase();
    return upper.length === 3 ? (ALPHA3_TO_ALPHA2[upper] ?? upper) : upper;
}

export function resolveCountryName(code: string): string {
    if (!code) return '';
    const alpha2 = normalizeToAlpha2(code);
    try {
        const name = _regionNames.of(alpha2);
        return name && name !== alpha2 ? name : code;
    } catch {
        return code;
    }
}

export function getCountryTimezone(countryCode: string): string | null {
    if (!countryCode) return null;
    const alpha2 = normalizeToAlpha2(countryCode);
    return COUNTRY_TIMEZONE[alpha2] ?? null;
}

export function isMultiTimezoneCountry(countryCode: string): boolean {
    if (!countryCode) return false;
    return MULTI_TIMEZONE_COUNTRIES.has(normalizeToAlpha2(countryCode));
}

export function isGoodTimeToMessage(timezone: string): boolean {
    try {
        const hourStr = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', hourCycle: 'h23', timeZone: timezone,
        }).format(new Date());
        const hour = parseInt(hourStr, 10);
        return hour >= 8 && hour < 21;
    } catch {
        return false;
    }
}

export function formatCurrentTime(timeZone: string): string {
    return _getFmt(timeZone).format(new Date());
}
