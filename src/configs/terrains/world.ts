import { CountrySettings } from 'src/app/country/countries';
import { UNIT_ID } from 'src/configs/unit-id';

export function SetCountriesWorld() {
	CountrySettings.push({
		name: 'North Argentina',
		spawnerData: {
			unitData: { x: -11332.0, y: -8518.0 },
		},
		cities: [
			{ barrack: { x: -11666.0, y: -9302.0 } },
			{ barrack: { x: -12121.0, y: -7610.0 } },
			{ barrack: { x: -10937.0, y: -8325.0 } },
		],
	});

	CountrySettings.push({
		name: 'Uruguay',
		spawnerData: {
			unitData: { x: -9412.0, y: -7996.0 },
		},
		cities: [
			{ barrack: { x: -9942.0, y: -7857.0 } },
			{ barrack: { x: -8949.0, y: -8122.0 } },
		],
	});
	CountrySettings.push({
		name: 'Uganda',
		spawnerData: {
			unitData: { x: 4544.0, y: -1589.0 },
		},
		cities: [
			{ barrack: { x: 4088.7, y: -1219.6 } },
			{ barrack: { x: 5071.0, y: -1515.0 } },
		],
	});
	CountrySettings.push({
		name: 'Rwanda&Burundi',
		spawnerData: {
			unitData: { x: 4035.0, y: -3119.0 },
		},
		cities: [
			{ barrack: { x: 3443.0, y: -3280.0 } },
			{ barrack: { x: 4819.0, y: -2872.0 } },
		],
	});
	CountrySettings.push({
		name: 'Paraguay',
		spawnerData: {
			unitData: { x: -10820.0, y: -6849.0 },
		},
		cities: [
			{ barrack: { x: -10297.0, y: -6841.0 } },
			{ barrack: { x: -11095.0, y: -6180.0 } },
		],
	});
	CountrySettings.push({
		name: 'Chile',
		spawnerData: {
			unitData: { x: -13375.0, y: -8520.0 },
		},
		cities: [
			{ barrack: { x: -13316.0, y: -7507.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -13937.0, y: -11001.0 }, cityType: 'port' },
			{ barrack: { x: -13325.0, y: -9016.0 } },
		],
	});
	CountrySettings.push({
		name: 'Bolivia',
		spawnerData: {
			unitData: { x: -12095.0, y: -5063.0 },
		},
		cities: [
			{ barrack: { x: -11823.0, y: -5578.0 } },
			{ barrack: { x: -11493.0, y: -4323.0 } },
		],
	});
	CountrySettings.push({
		name: 'Peru',
		spawnerData: {
			unitData: { x: -13632.0, y: -4295.0 },
		},
		cities: [
			{ barrack: { x: -14391.0, y: -4209.0 } },
			{ barrack: { x: -13540.0, y: -5198.0 } },
			{ barrack: { x: -12754.0, y: -3951.0 } },
		],
	});

	CountrySettings.push({
		name: 'Ecuador',
		spawnerData: {
			unitData: { x: -14912.0, y: -3014.0 },
		},
		cities: [
			{ barrack: { x: -15349.0, y: -3327.0 } },
			{ barrack: { x: -14368.0, y: -2674.0 } },
		],
	});
	CountrySettings.push({
		name: 'Colombia',
		spawnerData: {
			unitData: { x: -12612.0, y: -1598.0 },
		},
		cities: [
			{ barrack: { x: -13214.0, y: -873.0 } },
			{ barrack: { x: -13802.0, y: -1853.0 } },
			{ barrack: { x: -12098.0, y: -2179.0 } },
		],
	});
	CountrySettings.push({
		name: 'Venezuela',
		spawnerData: {
			unitData: { x: -9529.0, y: -2251.0 },
		},
		cities: [
			{ barrack: { x: -10957.0, y: -619.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -8011.0, y: -1562.0 }, cityType: 'port' },
			{ barrack: { x: -10301.0, y: -2560.0 } },
			{ barrack: { x: -8611.0, y: -2629.0 } },
		],
	});
	CountrySettings.push({
		name: 'Botswana',
		spawnerData: {
			unitData: { x: 3281.0, y: -7482.0 },
		},
		cities: [
			{ barrack: { x: 3252.0, y: -6561.0 } },
			{ barrack: { x: 3579.0, y: -7870.0 } },
		],
	});
	CountrySettings.push({
		name: 'Mozambique',
		spawnerData: {
			unitData: { x: 6988.0, y: -6584.0 },
		},
		cities: [
			{ barrack: { x: 7415.0, y: -5660.0 } },
			{ barrack: { x: 6434.0, y: -7819.0 } },
		],
	});
	CountrySettings.push({
		name: 'Zimbabwe',
		spawnerData: {
			unitData: { x: 5182.0, y: -6575.0 },
		},
		cities: [
			{ barrack: { x: 4432.0, y: -6519.0 } },
			{ barrack: { x: 5970.0, y: -6128.0 } },
			{ barrack: { x: 5411.0, y: -7428.0 } },
		],
	});
	CountrySettings.push({
		name: 'South Brazil',
		spawnerData: {
			unitData: { x: -7106.0, y: -5958.0 },
		},
		cities: [
			{ barrack: { x: -8214.0, y: -6588.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -7050.0, y: -7284.0 }, cityType: 'port' },
			{ barrack: { x: -6497.0, y: -5719.0 } },
		],
	});
	CountrySettings.push({
		name: 'West Brazil',
		spawnerData: {
			unitData: { x: -9663.0, y: -5323.0 },
		},
		cities: [
			{ barrack: { x: -9877.0, y: -5833.0 } },
			{ barrack: { x: -10131.0, y: -4712.0 } },
		],
	});
	CountrySettings.push({
		name: 'North Brazil',
		spawnerData: {
			unitData: { x: -8768.0, y: -4163.0 },
		},
		cities: [
			{ barrack: { x: -9246.0, y: -3893.0 } },
			{ barrack: { x: -7861.0, y: -3299.0 } },
		],
	});
	CountrySettings.push({
		name: 'East Brazil',
		spawnerData: {
			unitData: { x: -7365.0, y: -4034.0 },
		},
		cities: [
			{ barrack: { x: -7700.0, y: -4676.0 } },
			{ barrack: { x: -6578.0, y: -3617.0 } },
		],
	});
	CountrySettings.push({
		name: 'Panama/CostaRica/Nicaragua',
		spawnerData: {
			unitData: { x: -15299.0, y: -441.0 },
		},
		cities: [
			{ barrack: { x: -14507.0, y: -66.0 } },
			{ barrack: { x: -16150.0, y: 919.0 } },
		],
	});
	CountrySettings.push({
		name: 'El Salvador',
		spawnerData: {
			unitData: { x: -17349.0, y: 1724.0 },
		},
		cities: [
			{ barrack: { x: -16842.0, y: 2055.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -18040.0, y: 1562.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Honduras',
		spawnerData: {
			unitData: { x: -15425.0, y: 2495.0 },
		},
		cities: [
			{ barrack: { x: -15778.0, y: 2174.0 } },
			{ barrack: { x: -14791.0, y: 2963.0 } },
		],
	});
	CountrySettings.push({
		name: 'Guatemala/Belize',
		spawnerData: {
			unitData: { x: -18624.0, y: 3646.0 },
		},
		cities: [
			{ barrack: { x: -18743.0, y: 4301.0 } },
			{ barrack: { x: -18040.0, y: 3012.0 } },
		],
	});
	CountrySettings.push({
		name: 'Mexico',
		spawnerData: {
			unitData: { x: -16450.1, y: 6742.5 },
		},
		cities: [
			{ barrack: { x: -17998.7, y: 6034.6 } },
			{ barrack: { x: -16055.2, y: 5946.4 } },
			{ barrack: { x: -17159.7, y: 6862.0 } },
			{ barrack: { x: -18380.2, y: 7310.5 } },
			{ barrack: { x: -15928.4, y: 7180.7 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -16542.0, y: 3683.0 }, cityType: 'port' },
			{ barrack: { x: -15062.0, y: 4056.0 } },
		],
	});
	CountrySettings.push({
		name: 'Texas',
		spawnerData: {
			unitData: { x: -15673.1, y: 8264.9 },
		},
		cities: [
			{ barrack: { x: -16713.1, y: 8484.9 } },
			{ barrack: { x: -15605.1, y: 9131.9 } },
			{ barrack: { x: -14405.1, y: 8208.9 } },
		],
	});
	CountrySettings.push({
		name: 'South Great Plains',
		spawnerData: {
			unitData: { x: -15171.1, y: 10827.9 },
		},
		cities: [
			{ barrack: { x: -15965.1, y: 10969.9 } },
			{ barrack: { x: -14133.1, y: 11299.9 } },
			{ barrack: { x: -14850.1, y: 10253.9 } },
			{ barrack: { x: -13615.1, y: 9926.9 } },
		],
	});
	CountrySettings.push({
		name: 'Deep South',
		spawnerData: {
			unitData: { x: -11964.1, y: 8262.9 },
		},
		cities: [
			{ barrack: { x: -12969.1, y: 8484.9 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -11120.9, y: 5813.8 }, cityType: 'port' },
			{ barrack: { x: -11007.1, y: 8224.9 } },
		],
	});
	CountrySettings.push({
		name: 'Bahamas',
		spawnerData: {
			unitData: { x: -8127.0, y: 5832.1 },
		},
		cities: [
			{ barrack: { x: -7614.9, y: 5255.2 } },
		],
	});
	CountrySettings.push({
		name: 'The Great Lakes',
		spawnerData: {
			unitData: { x: -13252.1, y: 11217.9 },
		},
		cities: [
			{ barrack: { x: -15012.1, y: 12451.9 } },
			{ barrack: { x: -13179.1, y: 12845.9 } },
			{ barrack: { x: -12534.1, y: 11081.9 } },
		],
	});
	CountrySettings.push({
		name: 'Gabon',
		spawnerData: {
			unitData: { x: -828.0, y: -830.0 },
		},
		cities: [
			{ barrack: { x: -1492.0, y: -1008.0 } },
			{ barrack: { x: -195.0, y: -756.0 } },
		],
	});
	CountrySettings.push({
		name: 'Kenya',
		spawnerData: {
			unitData: { x: 6334.0, y: -1449.0 },
		},
		cities: [
			{ barrack: { x: 7157.0, y: -1131.0 } },
			{ barrack: { x: 5923.0, y: -2093.0 } },
		],
	});
	CountrySettings.push({
		name: 'Rocky Mountains',
		spawnerData: {
			unitData: { x: -18115.1, y: 10827.9 },
		},
		cities: [
			{ barrack: { x: -18935.1, y: 11360.9 } },
			{ barrack: { x: -18413.1, y: 10114.9 } },
			{ barrack: { x: -17165.1, y: 10698.9 } },
		],
	});
	CountrySettings.push({
		name: 'North Great Plains',
		spawnerData: {
			unitData: { x: -17980.1, y: 12361.9 },
		},
		cities: [
			{ barrack: { x: -18787.1, y: 12781.9 } },
			{ barrack: { x: -17156.1, y: 12389.9 } },
		],
	});
	CountrySettings.push({
		name: 'New England',
		spawnerData: {
			unitData: { x: -10680.1, y: 10185.9 },
		},
		cities: [
			{ barrack: { x: -11603.6, y: 9684.7 } },
			{ barrack: { x: -10047.4, y: 9940.0 } },
			{ barrack: { x: -10441.3, y: 11029.1 } },
			{ barrack: { x: -9286.5, y: 11664.1 } },
		],
	});
	CountrySettings.push({
		name: 'Newfoundland',
		spawnerData: {
			unitData: { x: -8772.4, y: 16198.6 },
		},
		cities: [
			{ barrack: { x: -9615.2, y: 15691.3 } },
			{ barrack: { x: -9287.8, y: 16772.3 } },
			{ barrack: { x: -7797.4, y: 15956.2 } },
		],
	});
	CountrySettings.push({
		name: 'New Brunswick',
		spawnerData: {
			unitData: { x: -9293.8, y: 13384.7 },
		},
		cities: [
			{ barrack: { x: -9671.9, y: 13061.8 } },
			{ barrack: { x: -8766.9, y: 13514.4 } },
		],
	});
	CountrySettings.push({
		name: 'West Coast',
		spawnerData: {
			unitData: { x: -20032.1, y: 10450.9 },
		},
		cities: [
			{ barrack: { x: -19962.1, y: 12649.9 } },
			{ barrack: { x: -20033.1, y: 11355.9 } },
			{ barrack: { x: -19711.1, y: 10317.9 } },
			{ barrack: { x: -19055.1, y: 9143.9 } },
		],
	});

	CountrySettings.push({
		name: 'Quebec',
		spawnerData: {
			unitData: { x: -11830.1, y: 15306.9 },
		},
		cities: [
			{ barrack: { x: -11010.1, y: 15716.9 } },
			{ barrack: { x: -12125.1, y: 14744.9 } },
			{ barrack: { x: -11539.1, y: 13375.9 } },
		],
	});
	CountrySettings.push({
		name: 'Ontario',
		spawnerData: {
			unitData: { x: -14649.1, y: 13895.9 },
		},
		cities: [
			{ barrack: { x: -15194.1, y: 14781.9 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -13799.1, y: 16445.9 }, cityType: 'port' },
			{ barrack: { x: -13633.1, y: 14324.9 } },
		],
	});
	CountrySettings.push({
		name: 'Manitoba',
		spawnerData: {
			unitData: { x: -16573.1, y: 13647.9 },
		},
		cities: [
			{ barrack: { x: -16961.1, y: 14476.9 } },
			{ barrack: { x: -17156.1, y: 15776.9 } },
		],
	});
	CountrySettings.push({
		name: 'Alberta',
		spawnerData: {
			unitData: { x: -18747.1, y: 14795.9 },
		},
		cities: [
			{ barrack: { x: -19666.1, y: 16556.9 } },
			{ barrack: { x: -19206.1, y: 15449.9 } },
			{ barrack: { x: -19267.1, y: 14201.9 } },
		],
	});
	CountrySettings.push({
		name: 'British Columbia',
		spawnerData: {
			unitData: { x: -20668.1, y: 14279.9 },
		},
		cities: [
			{ barrack: { x: -21008.1, y: 15525.9 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -21883.1, y: 13983.9 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Nunavut',
		spawnerData: {
			unitData: { x: -15553.1, y: 18883.9 },
		},
		cities: [
			{ barrack: { x: -15086.4, y: 19565.7 } },
			{ barrack: { x: -16405.1, y: 18837.9 } },
			{ barrack: { x: -15045.1, y: 18120.9 } },
		],
	});
	CountrySettings.push({
		name: 'Yukon',
		spawnerData: {
			unitData: { x: -22847.1, y: 17484.9 },
		},
		cities: [
			{ barrack: { x: -22569.1, y: 19694.9 } },
			{ barrack: { x: -22766.1, y: 18395.9 } },
			{ barrack: { x: -22022.1, y: 17031.9 } },
		],
	});
	CountrySettings.push({
		name: 'Northwest Territories',
		spawnerData: {
			unitData: { x: -20031.1, y: 19140.9 },
		},
		cities: [
			{ barrack: { x: -20843.1, y: 19720.9 } },
			{ barrack: { x: -20517.1, y: 18430.9 } },
			{ barrack: { x: -18957.1, y: 19642.9 } },
			{ barrack: { x: -19374.1, y: 17964.9 } },
		],
	});
	CountrySettings.push({
		name: 'Narsaq',
		spawnerData: {
			unitData: { x: -2758.4, y: 12863.6 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -3122.2, y: 11651.4 }, cityType: 'port' },
			{ barrack: { x: -1596.5, y: 12697.6 } },
		],
	});
	CountrySettings.push({
		name: 'Arsuk',
		spawnerData: {
			unitData: { x: 182.9, y: 17225.0 },
		},
		cities: [
			{ barrack: { x: -327.3, y: 17560.2 } },
			{ barrack: { x: 320.5, y: 16417.4 } },
			{ barrack: { x: 910.8, y: 17433.5 } },
		],
	});
	CountrySettings.push({
		name: 'Nuuk',
		spawnerData: {
			unitData: { x: -4293.8, y: 15814.3 },
		},
		cities: [
			{ barrack: { x: -4880.1, y: 14906.0 } },
			{ barrack: { x: -3435.6, y: 15363.2 } },
			{ barrack: { x: -3705.4, y: 16794.7 } },
		],
	});
	CountrySettings.push({
		name: 'Nunatame',
		spawnerData: {
			unitData: { x: -4806.8, y: 17474.7 },
		},
		cities: [
			{ barrack: { x: -5330.0, y: 18198.6 } },
			{ barrack: { x: -5449.0, y: 16709.9 } },
		],
	});
	CountrySettings.push({
		name: 'Kitaa',
		spawnerData: {
			unitData: { x: -2500.2, y: 19013.9 },
		},
		cities: [
			{ barrack: { x: -3472.8, y: 19163.5 } },
			{ barrack: { x: -2481.5, y: 18019.3 } },
			{ barrack: { x: -1407.2, y: 18972.5 } },
		],
	});
	CountrySettings.push({
		name: 'National Park',
		spawnerData: {
			unitData: { x: -1729.4, y: 15549.6 },
		},
		cities: [
			{ barrack: { x: -1947.7, y: 16646.0 } },
			{ barrack: { x: -1675.4, y: 14716.6 } },
			{ barrack: { x: -1022.4, y: 15826.6 } },
		],
	});
	CountrySettings.push({
		name: 'Disko Bay',
		spawnerData: {
			unitData: { x: 1597.2, y: 19146.5 },
		},
		cities: [
			{ barrack: { x: 561.4, y: 19202.2 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 4429.3, y: 18918.7 }, cityType: 'port' },
			{ barrack: { x: 1665.0, y: 18527.0 } },
		],
	});
	CountrySettings.push({
		name: 'Ortit',
		spawnerData: {
			unitData: { x: 702.3, y: 15041.4 },
		},
		cities: [
			{ barrack: { x: 702.7, y: 14281.7 } },
			{ barrack: { x: 1465.7, y: 15509.6 } },
			{ barrack: { x: 1909.4, y: 16541.0 } },
		],
	});
	CountrySettings.push({
		name: 'South Africa',
		spawnerData: {
			unitData: { x: 3394.0, y: -9141.0 },
		},
		cities: [
			{ barrack: { x: 1693.0, y: -7775.0 } },
			{ barrack: { x: 2612.0, y: -8694.0 } },
			{ barrack: { x: 4508.0, y: -9083.0 } },
		],
	});

	CountrySettings.push({
		name: 'South Argentina',
		spawnerData: {
			unitData: { x: -12346.0, y: -10812.0 },
		},
		cities: [
			{ barrack: { x: -12518.0, y: -11361.0 } },
			{ barrack: { x: -11507.0, y: -10607.0 } },
		],
	});
	CountrySettings.push({
		name: 'Angola',
		spawnerData: {
			unitData: { x: 1604.0, y: -4400.0 },
		},
		cities: [
			{ barrack: { x: 938.0, y: -4212.0 } },
			{ barrack: { x: 2299.0, y: -4143.0 } },
		],
	});
	CountrySettings.push({
		name: 'Namibia',
		spawnerData: {
			unitData: { x: 2499.0, y: -5947.0 },
		},
		cities: [
			{ barrack: { x: 1914.0, y: -5529.0 } },
			{ barrack: { x: 2174.0, y: -6713.0 } },
		],
	});
	CountrySettings.push({
		name: 'Egypt',
		spawnerData: {
			unitData: { x: 4169.0, y: 7502.0 },
		},
		cities: [
			{ barrack: { x: 3808.0, y: 8156.0 } },
			{ barrack: { x: 5035.0, y: 8088.0 } },
			{ barrack: { x: 3950.0, y: 7058.0 } },
		],
	});
	CountrySettings.push({
		name: 'Ghana',
		spawnerData: {
			unitData: { x: -3007.0, y: 1870.0 },
		},
		cities: [
			{ barrack: { x: -3598.0, y: 1814.0 } },
			{ barrack: { x: -2362.0, y: 2192.0 } },
		],
	});

	CountrySettings.push({
		name: 'Ethiopia',
		spawnerData: {
			unitData: { x: 6726.0, y: 842.0 },
		},
		cities: [
			{ barrack: { x: 6381.0, y: 1393.0 } },
			{ barrack: { x: 7183.0, y: 458.0 } },
		],
	});
	CountrySettings.push({
		name: 'Somalia',
		spawnerData: {
			unitData: { x: 8266.0, y: 1101.0 },
		},
		cities: [
			{ barrack: { x: 8740.0, y: 1635.0 } },
			{ barrack: { x: 8453.0, y: 269.0 } },
		],
	});
	CountrySettings.push({
		name: 'Republic of the Congo',
		spawnerData: {
			unitData: { x: 1991.0, y: -1850.0 },
		},
		cities: [
			{ barrack: { x: 1265.0, y: -733.0 } },
			{ barrack: { x: 2635.0, y: -865.0 } },
			{ barrack: { x: 1002.0, y: -2160.0 } },
			{ barrack: { x: 2564.0, y: -2360.0 } },
		],
	});
	CountrySettings.push({
		name: 'Sudan',
		spawnerData: {
			unitData: { x: 3901.1, y: 2491.1 },
		},
		cities: [
			{ barrack: { x: 2837.1, y: 3472.1 } },
			{ barrack: { x: 3167.1, y: 2302.1 } },
			{ barrack: { x: 4599.1, y: 3223.1 } },
		],
	});
	CountrySettings.push({
		name: 'North Sudan',
		spawnerData: {
			unitData: { x: 4290.1, y: 4800.1 },
		},
		cities: [
			{ barrack: { x: 4411.1, y: 5647.1 } },
			{ barrack: { x: 3325.1, y: 4543.1 } },
			{ barrack: { x: 5066.1, y: 4346.1 } },
		],
	});
	CountrySettings.push({
		name: 'South Sudan',
		spawnerData: {
			unitData: { x: 4806.0, y: 86.0 },
		},
		cities: [
			{ barrack: { x: 4664.0, y: 911.0 } },
			{ barrack: { x: 5701.0, y: 193.0 } },
		],
	});
	CountrySettings.push({
		name: 'Nigeria',
		spawnerData: {
			unitData: { x: 705.0, y: 2389.0 },
		},
		cities: [
			{ barrack: { x: -271.0, y: 2751.0 } },
			{ barrack: { x: 1488.0, y: 2944.0 } },
		],
	});
	CountrySettings.push({
		name: 'Eritrea',
		spawnerData: {
			unitData: { x: 6078.0, y: 2624.5 },
		},
		cities: [
			{ barrack: { x: 5622.7, y: 2854.3 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 6661.6, y: 2607.2 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Algeria',
		spawnerData: {
			unitData: { x: -62.4, y: 6706.7 },
		},
		cities: [
			{ barrack: { x: -601.4, y: 7443.0 } },
			{ barrack: { x: -835.1, y: 6348.4 } },
			{ barrack: { x: 569.6, y: 7199.6 } },
		],
	});
	CountrySettings.push({
		name: 'Mali',
		spawnerData: {
			unitData: { x: -1716.0, y: 3911.0 },
		},
		cities: [
			{ barrack: { x: -3890.0, y: 3002.0 } },
			{ barrack: { x: -2320.0, y: 3458.0 } },
			{ barrack: { x: -1342.0, y: 4832.0 } },
		],
	});
	CountrySettings.push({
		name: 'Niger',
		spawnerData: {
			unitData: { x: 322.0, y: 4427.0 },
		},
		cities: [
			{ barrack: { x: 256.0, y: 5357.0 } },
			{ barrack: { x: -1174.0, y: 3532.0 } },
			{ barrack: { x: 850.0, y: 4315.0 } },
		],
	});
	CountrySettings.push({
		name: 'Chad',
		spawnerData: {
			unitData: { x: 2381.0, y: 5581.0 },
		},
		cities: [
			{ barrack: { x: 1853.0, y: 6170.0 } },
			{ barrack: { x: 2179.0, y: 4987.0 } },
		],
	});

	CountrySettings.push({
		name: 'Zambia',
		spawnerData: {
			unitData: { x: 4298.0, y: -4793.0 },
		},
		cities: [
			{ barrack: { x: 4988.0, y: -4267.0 } },
			{ barrack: { x: 4012.0, y: -5308.0 } },
		],
	});
	CountrySettings.push({
		name: 'Tanzania',
		spawnerData: {
			unitData: { x: 6852.0, y: -3634.0 },
		},
		cities: [
			{ barrack: { x: 6272.0, y: -3312.0 } },
			{ barrack: { x: 7313.0, y: -4095.0 } },
		],
	});
	CountrySettings.push({
		name: 'Mauritania',
		spawnerData: {
			unitData: { x: -3139.8, y: 4796.7 },
		},
		cities: [
			{ barrack: { x: -2630.2, y: 5650.7 } },
			{ barrack: { x: -3922.1, y: 4112.0 } },
		],
	});
	CountrySettings.push({
		name: 'Western Sahara',
		spawnerData: {
			unitData: { x: -3658.2, y: 6091.1 },
		},
		cities: [
			{ barrack: { x: -4101.3, y: 5588.0 } },
			{ barrack: { x: -2985.9, y: 6589.3 } },
		],
	});
	CountrySettings.push({
		name: 'Morocco',
		spawnerData: {
			unitData: { x: -1866.6, y: 8017.4 },
		},
		cities: [
			{ barrack: { x: -2057.8, y: 7373.6 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -2716.2, y: 8426.8 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Tunisia',
		spawnerData: {
			unitData: { x: 320.6, y: 8513.6 },
		},
		cities: [
			{ barrack: { x: 842.8, y: 8846.9 } },
		],
	});
	CountrySettings.push({
		name: 'Libya',
		spawnerData: {
			unitData: { x: 2640.0, y: 8012.0 },
		},
		cities: [
			{ barrack: { x: 2045.0, y: 8543.0 } },
			{ barrack: { x: 2303.0, y: 7310.0 } },
		],
	});
	CountrySettings.push({
		name: 'Edinburgh of the Seven Seas',
		spawnerData: {
			unitData: { x: -2239.9, y: -6329.8 },
		},
		cities: [
			{ barrack: { x: -2576.4, y: -7018.6 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -2964.0, y: -5855.9 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Easter Island',
		spawnerData: {
			unitData: { x: -18234.0, y: -7367.0 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -18793.0, y: -8158.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: -17237.0, y: -7445.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Cameroon',
		spawnerData: {
			unitData: { x: -961.0, y: 957.0 },
		},
		cities: [
			{ barrack: { x: -1421.0, y: 1434.0 } },
			{ barrack: { x: -635.0, y: 595.0 } },
		],
	});
	CountrySettings.push({
		name: 'Central African Republic',
		spawnerData: {
			unitData: { x: 1085.0, y: 837.5 },
		},
		cities: [
			{ barrack: { x: 560.0, y: 1434.0 } },
			{ barrack: { x: 1796.0, y: 1044.0 } },
			{ barrack: { x: 3026.0, y: 326.0 } },
		],
	});
	CountrySettings.push({
		name: 'Dominican Republic',
		spawnerData: {
			unitData: { x: -6845.0, y: 573.0 },
		},
		cities: [
			{ barrack: { x: -6596.0, y: 1495.0 } },
			{ barrack: { x: -5877.0, y: 642.0 } },
		],
	});
	CountrySettings.push({
		name: 'Haiti',
		spawnerData: {
			unitData: { x: -7621.0, y: 1345.0 },
		},
		cities: [
			{ barrack: { x: -7774.0, y: 710.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -8502.0, y: 1518.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Jamaica',
		spawnerData: {
			unitData: { x: -13123.0, y: 1604.0 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -12001.0, y: 2409.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: -13950.0, y: 1454.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Bermuda',
		spawnerData: {
			unitData: { x: -6468.3, y: 10180.0 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -7040.2, y: 9746.9 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: -5710.3, y: 10355.6 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Cuba',
		spawnerData: {
			unitData: { x: -11452.0, y: 3894.0 },
		},
		cities: [
			{ barrack: { x: -10904.0, y: 3587.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -12672.0, y: 4003.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: -9503.0, y: 3754.0 }, cityType: 'port' },
		],
	});
}
