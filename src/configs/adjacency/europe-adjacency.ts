import { AdjacencyMap } from './adjacency-types';

/**
 * Europe map adjacency data — 81 countries.
 *
 * Land bridges (non-obvious connections that exist on the map):
 *   England ↔ Normandy, Siciliy ↔ Southern Italy, Ireland ↔ Scotland,
 *   Sweden ↔ Denmark, Spain ↔ Morocco, Corsica ↔ Northern Italy,
 *   Sardinia ↔ Corsica.
 *
 * Notable non-connection: Lybia ↔ Tunisia are NOT connected.
 *
 * Islands with no land neighbors (sea-only access):
 *   Iceland, Svalbard, Crete, Cyprus, Isle of Man, Novaya.
 */
export const EUROPE_ADJACENCY: AdjacencyMap = {
	// ── Central Europe ──────────────────────────────────────────
	Germany: {
		land: ['Poland', 'Czechia', 'Austria', 'Switzerland', 'France', 'Belgium', 'Netherlands', 'Denmark'],
	},
	Poland: {
		land: ['Germany', 'Czechia', 'Slovakia', 'Lithuania', 'Kaliningrad', 'Belarus', 'Ukraine'],
	},
	Czechia: {
		land: ['Germany', 'Poland', 'Austria', 'Slovakia'],
	},
	Austria: {
		land: ['Germany', 'Czechia', 'Switzerland', 'Slovenia', 'Slovakia', 'Hungary', 'Northern Italy'],
	},
	Switzerland: {
		land: ['France', 'Germany', 'Austria', 'Northern Italy'],
	},
	Slovakia: {
		land: ['Poland', 'Czechia', 'Austria', 'Hungary', 'Ukraine'],
	},
	Hungary: {
		land: ['Austria', 'Slovenia', 'Croatia', 'Serbia', 'Romania', 'Slovakia'],
	},

	// ── Balkans ─────────────────────────────────────────────────
	Slovenia: {
		land: ['Austria', 'Croatia', 'Hungary', 'Northern Italy'],
	},
	Croatia: {
		land: ['Slovenia', 'Bosnia', 'Serbia', 'Hungary'],
	},
	Bosnia: {
		land: ['Croatia', 'Montenegro', 'Serbia'],
	},
	Montenegro: {
		land: ['Bosnia', 'Serbia', 'Albania'],
	},
	Serbia: {
		land: ['Croatia', 'Bosnia', 'Montenegro', 'Macedonia', 'Bulgaria', 'Romania', 'Hungary'],
	},
	Macedonia: {
		land: ['Serbia', 'Albania', 'Bulgaria', 'Greece'],
	},
	Albania: {
		land: ['Montenegro', 'Macedonia', 'Greece'],
	},
	Greece: {
		land: ['Albania', 'Macedonia', 'Bulgaria', 'Türkiye'],
	},
	Bulgaria: {
		land: ['Serbia', 'Romania', 'Macedonia', 'Greece', 'Türkiye'],
	},
	Romania: {
		land: ['Moldova', 'Ukraine', 'Serbia', 'Bulgaria', 'Hungary'],
	},
	Moldova: {
		land: ['Romania', 'Ukraine'],
	},

	// ── Ukraine & Crimea ────────────────────────────────────────
	Ukraine: {
		land: ['Poland', 'Slovakia', 'Moldova', 'Romania', 'Belarus', 'Crimea', 'Central Russia', 'Southern Russia'],
	},
	Crimea: {
		land: ['Ukraine', 'Southern Russia'],
	},

	// ── Türkiye & Caucasus ──────────────────────────────────────
	Türkiye: {
		land: ['Bulgaria', 'Greece', 'Georgia', 'Armenia', 'Syria', 'Iraq'],
	},
	Georgia: {
		land: ['Türkiye', 'Armenia', 'Azerbaijan', 'Southern Russia'],
	},
	Armenia: {
		land: ['Georgia', 'Azerbaijan', 'Türkiye'],
	},
	Azerbaijan: {
		land: ['Georgia', 'Armenia', 'Southern Russia'],
	},

	// ── Middle East ─────────────────────────────────────────────
	Syria: {
		land: ['Türkiye', 'Lebanon', 'Iraq', 'Jordan'],
	},
	Lebanon: {
		land: ['Syria', 'Israel'],
	},
	Israel: {
		land: ['Lebanon', 'Palestine', 'Egypt', 'Jordan'],
	},
	Palestine: {
		land: ['Israel', 'Jordan'],
	},
	Iraq: {
		land: ['Syria', 'Türkiye', 'Jordan'],
	},
	Jordan: {
		land: ['Israel', 'Palestine', 'Iraq', 'Syria'],
	},

	// ── North Africa ────────────────────────────────────────────
	Egypt: {
		land: ['Israel', 'Lybia'],
	},
	Lybia: {
		land: ['Egypt'], // NOT connected to Tunisia
	},
	Tunisia: {
		land: ['Algeria'],
	},
	Algeria: {
		land: ['Tunisia', 'Morocco'],
	},
	Morocco: {
		land: ['Algeria', 'Spain'], // land bridge: Spain ↔ Morocco
	},

	// ── Iberia ──────────────────────────────────────────────────
	Portugal: {
		land: ['Spain'],
	},
	Spain: {
		land: ['Portugal', 'Morocco', 'Catalonia', 'France'], // land bridge: Spain ↔ Morocco
	},
	Catalonia: {
		land: ['Spain', 'France'],
	},

	// ── France & Low Countries ──────────────────────────────────
	France: {
		land: ['Spain', 'Catalonia', 'Belgium', 'Germany', 'Switzerland', 'Northern Italy', 'Normandy'],
	},
	Normandy: {
		land: ['France', 'Belgium', 'England'], // land bridge: England ↔ Normandy
	},
	Belgium: {
		land: ['France', 'Netherlands', 'Germany', 'Normandy'],
	},
	Netherlands: {
		land: ['Belgium', 'Germany'],
	},

	// ── Italy & Mediterranean Islands ───────────────────────────
	'Northern Italy': {
		land: ['France', 'Switzerland', 'Austria', 'Slovenia', 'Southern Italy', 'Corsica'], // land bridge: Corsica ↔ N. Italy
	},
	'Southern Italy': {
		land: ['Northern Italy', 'Sicily'], // land bridge: Sicily ↔ Southern Italy
	},
	Sicily: {
		land: ['Southern Italy'],
	},
	Corsica: {
		land: ['Northern Italy', 'Sardinia'], // land bridge: Corsica ↔ N. Italy, Corsica ↔ Sardinia
	},
	Sardinia: {
		land: ['Corsica'], // land bridge: Sardinia ↔ Corsica
	},

	// ── Scandinavia ─────────────────────────────────────────────
	Denmark: {
		land: ['Germany', 'Sweden'], // land bridge: Sweden ↔ Denmark
	},
	Norway: {
		land: ['Sweden', 'Sami'],
	},
	Sweden: {
		land: ['Norway', 'Denmark', 'Finland', 'Sami'], // land bridge: Sweden ↔ Denmark
	},
	Finland: {
		land: ['Sweden', 'Sami', 'Karelia', 'Leningrad'],
	},
	Sami: {
		land: ['Norway', 'Sweden', 'Finland'],
	},

	// ── British Isles ───────────────────────────────────────────
	England: {
		land: ['Wales', 'Scotland', 'Normandy'], // land bridge: England ↔ Normandy
	},
	Wales: {
		land: ['England'],
	},
	Scotland: {
		land: ['England', 'Ireland'], // land bridge: Ireland ↔ Scotland
	},
	Ireland: {
		land: ['Scotland'], // land bridge: Ireland ↔ Scotland
	},

	// ── Baltics ─────────────────────────────────────────────────
	Estonia: {
		land: ['Latvia', 'Leningrad'],
	},
	Latvia: {
		land: ['Estonia', 'Lithuania', 'Belarus', 'Leningrad'],
	},
	Lithuania: {
		land: ['Latvia', 'Kaliningrad', 'Poland', 'Belarus'],
	},
	Kaliningrad: {
		land: ['Lithuania', 'Poland'],
	},
	Belarus: {
		land: ['Poland', 'Ukraine', 'Latvia', 'Lithuania', 'Central Russia'],
	},

	// ── Russia ──────────────────────────────────────────────────
	Leningrad: {
		land: ['Estonia', 'Latvia', 'Karelia', 'Central Russia', 'Finland'],
	},
	Karelia: {
		land: ['Finland', 'Leningrad', 'Arkhangelsk'],
	},
	Arkhangelsk: {
		land: ['Karelia', 'Moscow', 'North Russia', 'Central Russia'],
	},
	Moscow: {
		land: ['Arkhangelsk', 'Central Russia', 'Volga', 'North Russia'],
	},
	'Central Russia': {
		land: ['Leningrad', 'Belarus', 'Ukraine', 'Southern Russia', 'Moscow', 'Volga', 'Arkhangelsk'],
	},
	'Southern Russia': {
		land: ['Ukraine', 'Crimea', 'Georgia', 'Azerbaijan', 'Central Russia', 'Volga'],
	},
	Volga: {
		land: ['Central Russia', 'Moscow', 'Southern Russia', 'North Russia'],
	},
	'North Russia': {
		land: ['Arkhangelsk', 'Moscow', 'Volga', 'Siberia'],
	},
	Siberia: {
		land: ['North Russia'],
	},

	// ── Greenland ───────────────────────────────────────────────
	'West Greenland': {
		land: ['Disko Bay'],
	},
	'Disko Bay': {
		land: ['West Greenland', 'National Park'],
	},
	'National Park': {
		land: ['Disko Bay', 'East Greenland'],
	},
	'East Greenland': {
		land: ['National Park'],
	},

	// ── Islands (sea-only access — no land neighbors) ───────────
	Iceland: { land: [] },
	Svalbard: { land: [] },
	Crete: { land: [] },
	Cyprus: { land: [] },
	'Isle of Man': { land: [] },
	Novaya: { land: [] },
	Malta: { land: [] },
};
